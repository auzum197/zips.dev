/* Translate rendered ZIP HTML to Spanish with GLM.
 *
 *   pnpm translate zip-0200 zip-0317        translate the given slugs
 *   pnpm translate --force zip-0200         ignore the cache
 *
 * Reads  content/rendered/<slug>.html
 *        data/glossary-es.yaml                 terminology
 *        data/prompts/translator-es.md         system prompt of the translator
 *        data/prompts/reviewer-es.md           system prompt of the reviewer
 * Writes content/rendered-es/<slug>.html       translated fragment
 *        content/rendered-es/<slug>.json       title, headings, source sha, stats
 *        content/rendered-es/<slug>.tm.json    segment memory (source → Spanish) and reviews
 *
 * The model never sees markup. The document is cut into text segments; inline
 * elements become numbered placeholders (<g1>…</g1> wraps translatable text,
 * <x2/> stands for an opaque element such as code, math or a footnote mark).
 * Code blocks, math and the reference list are not sent at all. Each returned
 * segment must use every placeholder exactly once and keep every BCP 14
 * keyword, in parentheses after its Spanish form ("DEBE (MUST)"); a segment that fails is retried, then left in English.
 *
 * Every translated segment is then reviewed against its English source by a
 * second pass of the model, with reasoning on. A reported error is corrected
 * in place and the corrected text is reviewed again (at most three reviews).
 * A segment that passed is never reviewed again; one that never passes stays
 * in English.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unified } from "unified";
import rehypeStringify from "rehype-stringify";
import { fromHtml } from "hast-util-from-html";
import yaml from "js-yaml";
import type { Element, ElementContent, Root, RootContent, Text } from "hast";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const CONTENT = path.join(ROOT, "content");
const RENDERED = path.join(CONTENT, "rendered");
const OUT = path.join(CONTENT, "rendered-es");

const BASE_URL = process.env.GLM_BASE_URL || "https://api.z.ai/api/coding/paas/v4";
const MODEL = process.env.GLM_MODEL || "glm-5.3";
const CONCURRENCY = Number(process.env.GLM_CONCURRENCY || 8);
/** Translation needs no reasoning pass; GLM_THINKING=enabled turns it back on. */
const THINKING = process.env.GLM_THINKING || "disabled";
const usage = { calls: 0, completion: 0, reasoning: 0 };
const BATCH_SEGMENTS = 20;
const BATCH_CHARS = 5000;
const MAX_ROUNDS = 3;
/** The reviewer. The same model by default, but with its reasoning pass on:
 *  a second look must not be the same fast pass that wrote the text. */
const REVIEW_MODEL = process.env.GLM_REVIEW_MODEL || MODEL;
const REVIEW_THINKING = process.env.GLM_REVIEW_THINKING || "enabled";
/** How deep the reviewer reasons: "low", "high" or "max". GLM uses "max" when
 *  no level is sent, which is the slowest; "high" is the chosen level. */
const REVIEW_EFFORT = process.env.GLM_REVIEW_EFFORT || "high";
const REVIEW_BATCH_SEGMENTS = 10;
const REVIEW_BATCH_CHARS = 3500;
/** Review, correct, review again: at most this many reviews of one segment. */
const MAX_REVIEW_ROUNDS = 3;

/* .env.local sits in the main checkout; a git worktree does not have its own. */
function loadEnv(): void {
    const candidates = [path.join(ROOT, ".env.local")];
    const common = spawnSync("git", ["-C", ROOT, "rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" });
    if (common.status === 0)
        candidates.push(path.join(path.dirname(common.stdout.trim()), ".env.local"));
    for (const file of candidates) {
        if (fs.existsSync(file)) {
            process.loadEnvFile(file);
            return;
        }
    }
}

/* ---------- segmentation ---------- */

const BCP14 = /\b(MUST NOT|SHALL NOT|SHOULD NOT|NOT RECOMMENDED|MUST|REQUIRED|SHALL|SHOULD|RECOMMENDED|MAY|OPTIONAL)\b/g;

const INLINE = new Set([
    "a", "abbr", "b", "br", "cite", "code", "del", "em", "i", "img", "ins", "kbd", "mark", "math", "q", "s", "samp",
    "small", "span", "strong", "sub", "sup", "tt", "u", "var", "wbr",
]);
/** Subtrees that are never translated and never descended into. */
const SKIP_BLOCK = new Set(["pre", "script", "style", "svg", "math", "template"]);
/** Inline elements carried through as a single opaque placeholder. */
const OPAQUE_TAGS = new Set(["code", "tt", "kbd", "samp", "var", "math", "img", "br", "wbr", "cite", "svg"]);
const OPAQUE_CLASSES = new Set(["literal", "pre", "math", "hanchor", "brackets", "fn-bracket", "label", "backrefs", "katex"]);

const classes = (el: Element): string[] => {
    const c = el.properties?.className;
    return Array.isArray(c) ? c.map(String) : c ? String(c).split(/\s+/) : [];
};
const isOpaque = (el: Element): boolean => OPAQUE_TAGS.has(el.tagName) || classes(el).some((c) => OPAQUE_CLASSES.has(c));
const isSkipped = (el: Element): boolean =>
    SKIP_BLOCK.has(el.tagName) ||
    // docutils reference list: titles of external documents stay as published
    (el.tagName === "aside" && classes(el).includes("footnote")) ||
    classes(el).includes("math");

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const unesc = (s: string): string =>
    s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&");

export interface Segment {
    /** Placeholder text sent to the model. */
    source: string;
    /** Placeholder id → original element (children are replaced for <g>). */
    slots: Map<number, { kind: "g" | "x"; el: Element }>;
    lead: string;
    trail: string;
    /** Writes the translated nodes back into the tree. */
    apply: (nodes: ElementContent[]) => void;
    /** The document title: it must come back translated. */
    title?: boolean;
    /** What the text is, for the model: "heading", "paragraph", "list item"… */
    kind: string;
    /** The heading this text is under (English). */
    section: string;
    /** The sentence is cut by a formula or a code block: it goes on after this
     *  segment ("after"), it started before it ("before"), or both. */
    cut?: "after" | "before" | "both";
}
const KINDS: Record<string, string> = {
    h1: "heading", h2: "heading", h3: "heading", h4: "heading", h5: "heading", h6: "heading",
    p: "paragraph", li: "list item", dt: "defined term", dd: "definition", td: "table cell", th: "table header",
    caption: "caption", figcaption: "caption", summary: "caption", blockquote: "quotation",
};
/** A formula on its own line. Inline math is part of its sentence. */
const isBlockMath = (el: Element): boolean => el.tagName === "math" && el.properties?.display === "block";

function serialize(nodes: ElementContent[], slots: Segment["slots"]): string {
    let out = "";
    for (const n of nodes) {
        if (n.type === "text")
            out += esc(n.value);
        else if (n.type === "element") {
            const id = slots.size + 1;
            if (isOpaque(n)) {
                slots.set(id, { kind: "x", el: n });
                out += `<x${id}/>`;
            }
            else {
                slots.set(id, { kind: "g", el: n });
                out += `<g${id}>${serialize(n.children, slots)}</g${id}>`;
            }
        }
    }
    return out;
}

const hasWords = (source: string): boolean => /\p{L}{2,}/u.test(source.replace(/<\/?[gx]\d+\/?>/g, " "));

export function collect(parent: Root | Element, segments: Segment[], ctx: { section: string } = { section: "" }): void {
    const kids = parent.children as ElementContent[];
    const kind = parent.type === "element" ? (KINDS[parent.tagName] ?? "paragraph") : "paragraph";
    let run: ElementContent[] = [];
    // a formula or code block inside this parent cuts its sentence in two
    let cutBefore = false;
    const flush = (cutAfter: boolean) => {
        const nodes = run;
        const startsCut = cutBefore;
        run = [];
        cutBefore = cutAfter;
        if (nodes.length === 0)
            return;
        const slots: Segment["slots"] = new Map();
        const raw = serialize(nodes, slots);
        if (!hasWords(raw))
            return;
        const lead = raw.match(/^\s*/)![0];
        const trail = raw.match(/\s*$/)![0];
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const source = raw.trim().replace(/\s+/g, " ");
        // a sentence that ends is not cut, also when a formula follows it
        const open = cutAfter && !/[.:;!?]$/.test(source);
        const resumed = startsCut && /^\p{Ll}/u.test(source.replace(/^(<[^>]+>|[\s,])+/, ""));
        segments.push({
            source,
            slots,
            lead,
            trail,
            kind,
            section: ctx.section,
            cut: open && resumed ? "both" : open ? "after" : resumed ? "before" : undefined,
            apply: (translated) => {
                const start = kids.indexOf(first);
                const end = kids.indexOf(last);
                kids.splice(start, end - start + 1, ...translated);
            },
        });
        if (kind === "heading")
            ctx.section = unesc(source.replace(/<\/?[gx]\d+\/?>/g, "")).trim();
    };
    for (const child of [...kids]) {
        // inline math and inline code stay in their sentence, as one opaque placeholder
        if (child.type === "text" || (child.type === "element" && INLINE.has(child.tagName) && !isBlockMath(child))) {
            run.push(child);
            continue;
        }
        const block = child.type === "element" && isSkipped(child);
        flush(block);
        if (child.type === "element" && !block)
            collect(child, segments, ctx);
        else if (!block)
            cutBefore = false;
    }
    flush(false);
}

/* ---------- validation + rebuild ---------- */

/** Terms of the glossary that stay in English; set in main(). */
let KEEP: string[] = [];
/** The tests set the kept terms without a glossary file. */
export function setKeep(terms: string[]): void {
    KEEP = terms;
}
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** Occurrences of a kept term. A term with a capital letter must match the
 *  capitals; an all-lowercase term also matches at the start of a sentence.
 *  A suffix is permitted, so "forks" counts for "fork". */
export const countTerm = (text: string, term: string): number => (text.match(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(term)}`, term === term.toLowerCase() ? "giu" : "gu")) ?? []).length;

const keywords = (s: string): string => [...s.matchAll(BCP14)].map((m) => m[1]).sort().join("|");

/** Parse the model's placeholder text back into nodes. Throws when the
 *  structure does not match the source segment. */
export function rebuild(seg: Segment, translated: string): ElementContent[] {
    const text = translated.trim();
    if (!text)
        throw new Error("empty translation");
    if (keywords(text) && !keywords(seg.source))
        throw new Error(`the source has no key word in capitals, but the translation has [${keywords(text)}]. Words such as "should" or "must" in lowercase are normal prose: use lowercase Spanish ("debería", "debe"), no capitals and no English word in parentheses`);
    if (keywords(text) !== keywords(seg.source))
        throw new Error(`BCP 14 keywords changed: expected [${keywords(seg.source)}], got [${keywords(text)}]`);
    // a title that comes back as it went in is not translated (a title made only
    // of names or identifiers, such as "CHECKSEQUENCEVERIFY", has no words to translate)
    if (seg.title && text === seg.source) {
        const words = KEEP.reduce((t, term) => t.split(term).join(" "), seg.source).match(/\p{L}*\p{Ll}\p{L}{3,}/gu) ?? [];
        if (words.length >= 2)
            throw new Error("this is the title of the document and it is still in English; translate it");
    }
    // every number of the source is in the translation: "Revision 2" must not become "Revisión 3"
    const digits = (t: string): string => (t.replace(/<\/?[gx]\d+\/?>/g, " ").match(/\d+/g) ?? []).sort().join(",");
    if (digits(text) !== digits(seg.source))
        throw new Error(`the numbers differ from the source: the source has [${digits(seg.source)}], the translation has [${digits(text)}]`);
    // a term that stays in English must still be there
    for (const term of KEEP) {
        const want = countTerm(seg.source, term);
        if (want > 0 && countTerm(text, term) < want)
            throw new Error(`the term "${term}" stays in English; it is in the source ${want} time(s) and must be in the translation as many times`);
    }
    // a letter from another script in a Spanish word (Cyrillic "о" for "o") is a model error
    const foreign = /[\u0370-\u03FF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;
    if (foreign.test(text) && !foreign.test(seg.source))
        throw new Error("the translation has a letter that is not in the Latin alphabet; use Spanish letters only");
    // each key word is the parenthesised original after its Spanish form: "DEBE (MUST)"
    for (const m of text.matchAll(BCP14)) {
        const before = text.slice(0, m.index);
        if (!/\p{Lu}{2,}\s*\($/u.test(before) || text[m.index + m[0].length] !== ")")
            throw new Error(`key word ${m[0]} must follow its Spanish translation in capitals, in parentheses, e.g. "DEBE (MUST)"`);
    }
    const root: ElementContent[] = [];
    const stack: { id: number; nodes: ElementContent[] }[] = [];
    const seen = new Set<number>();
    const top = () => (stack.length ? stack[stack.length - 1].nodes : root);
    const pushText = (value: string) => {
        if (value)
            top().push({ type: "text", value: unesc(value) } as Text);
    };
    const token = /<(\/?)([gx])(\d+)(\/?)>/g;
    let at = 0;
    for (let m = token.exec(text); m; m = token.exec(text)) {
        pushText(text.slice(at, m.index));
        at = m.index + m[0].length;
        const [, closing, kind, num, selfClosing] = m;
        const id = Number(num);
        const slot = seg.slots.get(id);
        if (!slot || slot.kind !== kind)
            throw new Error(`unknown placeholder ${m[0]}`);
        if (kind === "x") {
            if (closing || !selfClosing || seen.has(id))
                throw new Error(`bad placeholder ${m[0]}`);
            seen.add(id);
            top().push(slot.el);
        }
        else if (!closing) {
            if (selfClosing || seen.has(id))
                throw new Error(`bad placeholder ${m[0]}`);
            seen.add(id);
            stack.push({ id, nodes: [] });
        }
        else {
            const open = stack.pop();
            if (!open || open.id !== id)
                throw new Error(`unbalanced placeholder ${m[0]}`);
            top().push({ ...slot.el, children: open.nodes });
        }
    }
    pushText(text.slice(at));
    if (stack.length)
        throw new Error("unclosed placeholder");
    if (seen.size !== seg.slots.size)
        throw new Error(`placeholders missing: ${[...seg.slots.keys()].filter((k) => !seen.has(k)).join(", ")}`);
    const out: ElementContent[] = [];
    if (seg.lead)
        out.push({ type: "text", value: unesc(seg.lead) });
    out.push(...root);
    if (seg.trail)
        out.push({ type: "text", value: unesc(seg.trail) });
    return out;
}

/* ---------- model ---------- */

export interface Glossary {
    style?: string;
    keep?: string[];
    terms?: Record<string, string>;
    /** Organisations, funds, upgrades, software…: see data/glossary-es.yaml. */
    entities?: { name: string; short?: string; type?: string; es?: string; gloss?: string }[];
}
/** Fold the entities into the two lists the rest of the script uses: a name
 *  with no Spanish form is kept, one with a Spanish form is a fixed term. A
 *  short form ("ZCG") is always kept. */
export function withEntities(g: Glossary): Glossary {
    const keep = [...(g.keep ?? [])];
    const terms = { ...(g.terms ?? {}) };
    for (const e of g.entities ?? []) {
        if (e.es)
            terms[e.name] = e.es;
        else
            keep.push(e.name);
        if (e.short)
            keep.push(e.short);
    }
    return { ...g, keep: [...new Set(keep)], terms };
}

/** The glossary entries that occur in a text, so a request carries only the
 *  terms it needs. */
export function glossaryFor(g: Glossary, text: string): { keep: string[]; terms: Record<string, string> } {
    // whole words, with the capitals rule of the check: "Tor" is not in "editors"
    const has = (term: string): boolean => countTerm(text, term) > 0;
    return {
        keep: (g.keep ?? []).filter(has),
        terms: Object.fromEntries(Object.entries(g.terms ?? {}).filter(([en]) => has(en) || has(en.toLowerCase()))),
    };
}

/** A system prompt is a file in data/prompts/, not text in this script.
 *  {{style}} is the style line of the glossary. */
function loadPrompt(file: string, g: Glossary): string {
    return fs.readFileSync(path.join(ROOT, "data", "prompts", file), "utf8").trim().replace("{{style}}", (g.style ?? "").trim());
}

function systemPrompt(g: Glossary): string {
    return loadPrompt("translator-es.md", g);
}

function reviewPrompt(g: Glossary): string {
    return loadPrompt("reviewer-es.md", g);
}

interface ModelOptions {
    model: string;
    thinking: string;
    effort?: string;
}
type ModelCall = (system: string, payload: unknown, notes: string, opts?: ModelOptions) => Promise<Record<string, any>>;
/** The model behind the translator and the reviewer. The tests replace it
 *  with a scripted one; nothing else does. */
let model: ModelCall = (system, payload, notes, opts) => callGlm(system, payload, notes, opts);
export function setModel(fn: ModelCall): void {
    model = fn;
}
function callModel<T = string>(system: string, payload: unknown, notes: string, opts?: ModelOptions): Promise<Record<string, T>> {
    return model(system, payload, notes, opts) as Promise<Record<string, T>>;
}

async function callGlm<T = string>(system: string, payload: unknown, notes: string, opts: ModelOptions = { model: MODEL, thinking: THINKING }): Promise<Record<string, T>> {
    const body = {
        model: opts.model,
        temperature: 0,
        response_format: { type: "json_object" },
        thinking: { type: opts.thinking },
        // the level applies only when thinking is on
        ...(opts.thinking === "enabled" && opts.effort ? { reasoning_effort: opts.effort } : {}),
        messages: [
            { role: "system", content: system },
            { role: "user", content: (notes ? `${notes}\n\n` : "") + JSON.stringify(payload, null, 1) },
        ],
    };
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const res = await fetch(`${BASE_URL}/chat/completions`, {
                method: "POST",
                headers: { Authorization: `Bearer ${process.env.GLM_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: AbortSignal.timeout(300_000),
            });
            if (!res.ok)
                throw new Error(`GLM HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
            const json = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: { completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number } } };
            usage.calls++;
            usage.completion += json.usage?.completion_tokens ?? 0;
            usage.reasoning += json.usage?.completion_tokens_details?.reasoning_tokens ?? 0;
            const content = json.choices?.[0]?.message?.content ?? "";
            const start = content.indexOf("{");
            const end = content.lastIndexOf("}");
            if (start < 0 || end < 0)
                throw new Error("no JSON object in the reply");
            return JSON.parse(content.slice(start, end + 1)) as Record<string, T>;
        }
        catch (err) {
            lastError = err;
            await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        }
    }
    throw lastError;
}

async function pool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
        while (next < items.length)
            await worker(items[next++]);
    }));
}

export interface Doc {
    title: string;
    glossary: Glossary;
}
const plain = (s: string): string => s.replace(/<\/?[gx]\d+\/?>/g, " ");
const describe = (seg: Segment, extra: Record<string, string>) => ({
    kind: seg.title ? "title" : seg.kind,
    ...(seg.section ? { section: seg.section } : {}),
    ...(seg.cut ? { cut: seg.cut } : {}),
    ...extra,
});
/** How many paragraphs before a batch go with it as context. */
const PREVIOUS = 6;

/** Translate the segments that are not in the memory, in document order.
 *  One batch at a time: each batch sees the paragraphs before it and their
 *  Spanish, so pronouns have their antecedent and terms stay the same in a
 *  document. A segment that never passes the checks is absent from the
 *  memory (the caller keeps English). */
export async function translateAll(system: string, doc: Doc, wanted: Map<string, Segment>, memory: Record<string, string>): Promise<{ failed: Map<string, string> }> {
    const order = [...wanted.keys()];
    let pending = order.filter((s) => !(s in memory));
    const failed = new Map<string, string>();
    for (let round = 1; round <= MAX_ROUNDS && pending.length; round++) {
        // retry rounds use smaller batches: a hard segment gets more attention
        const batches = batchesOf(pending, round === 1 ? BATCH_SEGMENTS : 5, BATCH_CHARS, (s) => s.length);
        const retry: string[] = [];
        let done = 0;
        for (const batch of batches) {
            const at = order.indexOf(batch[0]);
            const previous = order.slice(Math.max(0, at - PREVIOUS), at).filter((s) => s in memory).map((s) => ({ en: s, es: memory[s] }));
            const text = [doc.title, ...batch, ...previous.map((p) => p.en)].join("\n");
            const payload = {
                document: doc.title,
                glossary: glossaryFor(doc.glossary, plain(text)),
                previous,
                segments: Object.fromEntries(batch.map((s, i) => [String(i + 1), describe(wanted.get(s)!, { text: s })])),
            };
            const notes = batch.filter((s) => failed.has(s)).map((s) => `Segment ${batch.indexOf(s) + 1} was rejected before: ${failed.get(s)}. Correct it.`).join("\n");
            let reply: Record<string, string> = {};
            try {
                reply = await callModel(system, payload, notes);
            }
            catch (err) {
                console.warn(`  batch failed: ${(err as Error).message}`);
            }
            batch.forEach((s, i) => {
                const t = reply[String(i + 1)];
                try {
                    if (typeof t !== "string")
                        throw new Error("segment missing from the reply");
                    rebuild(wanted.get(s)!, t);
                    memory[s] = t.trim();
                    failed.delete(s);
                }
                catch (err) {
                    failed.set(s, (err as Error).message);
                    retry.push(s);
                }
            });
            done++;
            process.stdout.write(`\r  round ${round}: ${done}/${batches.length} batches`);
        }
        process.stdout.write("\n");
        pending = retry;
    }
    return { failed };
}

/* ---------- review ---------- */

/** What the reviewer said about one segment. Kept in the memory file: a
 *  segment that passed is never reviewed again. */
export interface Review {
    /** True when a review accepted the text that is in the memory now. */
    passed: boolean;
    /** Number of reviews this segment had. */
    rounds: number;
    /** The translator's text, when the reviewer replaced it. */
    first?: string;
    /** Each problem the reviewer reported, in order. */
    issues: string[];
}

function batchesOf(items: string[], maxSegments: number, maxChars: number, size: (s: string) => number): string[][] {
    const batches: string[][] = [];
    let cur: string[] = [];
    let chars = 0;
    for (const s of items) {
        if (cur.length && (cur.length >= maxSegments || chars + size(s) > maxChars)) {
            batches.push(cur);
            cur = [];
            chars = 0;
        }
        cur.push(s);
        chars += size(s);
    }
    if (cur.length)
        batches.push(cur);
    return batches;
}

/** Review every translated segment that has not passed a review. A reported
 *  error is corrected in place and the corrected text is reviewed again. A
 *  segment with no accepted text after MAX_REVIEW_ROUNDS is removed from the
 *  memory: the page keeps the English text for it. */
export async function reviewAll(system: string, doc: Doc, wanted: Map<string, Segment>, memory: Record<string, string>, reviews: Record<string, Review>): Promise<void> {
    let pending = [...wanted.keys()].filter((s) => s in memory && !reviews[s]?.passed);
    for (const s of pending)
        reviews[s] = { passed: false, rounds: 0, issues: [] };
    for (let round = 1; round <= MAX_REVIEW_ROUNDS && pending.length; round++) {
        const batches = batchesOf(pending, REVIEW_BATCH_SEGMENTS, REVIEW_BATCH_CHARS, (s) => s.length + memory[s].length);
        const again: string[] = [];
        let done = 0;
        await pool(batches, async (batch) => {
            const payload = {
                document: doc.title,
                glossary: glossaryFor(doc.glossary, plain([doc.title, ...batch].join("\n"))),
                segments: Object.fromEntries(batch.map((s, i) => [String(i + 1), describe(wanted.get(s)!, { en: s, es: memory[s] })])),
            };
            let reply: Record<string, { ok?: boolean; issue?: string; es?: string }> = {};
            try {
                reply = await callModel(system, payload, "", { model: REVIEW_MODEL, thinking: REVIEW_THINKING, effort: REVIEW_EFFORT });
            }
            catch (err) {
                console.warn(`  review batch failed: ${(err as Error).message}`);
            }
            batch.forEach((s, i) => {
                const verdict = reply[String(i + 1)];
                const review = reviews[s];
                if (!verdict || typeof verdict !== "object") {
                    again.push(s); // no answer for this segment: ask again
                    return;
                }
                review.rounds++;
                if (verdict.ok === true) {
                    review.passed = true;
                    return;
                }
                review.issues.push(verdict.issue?.trim() || "error reported with no description");
                again.push(s);
                try {
                    if (typeof verdict.es !== "string")
                        throw new Error("no corrected text");
                    rebuild(wanted.get(s)!, verdict.es);
                    if (verdict.es.trim() !== memory[s]) {
                        review.first ??= memory[s];
                        memory[s] = verdict.es.trim();
                    }
                }
                catch (err) {
                    // the correction broke a mechanical rule: keep the text, review it again
                    review.issues.push(`correction rejected: ${(err as Error).message}`);
                }
            });
            done++;
            process.stdout.write(`\r  review ${round}: ${done}/${batches.length} batches`);
        });
        process.stdout.write("\n");
        pending = again;
    }
    for (const s of pending)
        delete memory[s];
}

/* ---------- glosses ---------- */

/** Add the Spanish gloss of an entity after its first appearance in the body
 *  of the document: "Zcash Development Fund (Fondo de Desarrollo de Zcash)".
 *  A name that already has its short form in parentheses takes the gloss
 *  inside them: "Zcash Community Grants (ZCG, Subvenciones de …)".
 *
 *  This is code, not the model, so it is the same in every run. It works on
 *  the finished page and is not kept in the segment memory: when a paragraph
 *  changes, the first appearance is found again. Headings, code and the
 *  reference list are left alone. Returns the number of glosses added. */
export function addGlosses(tree: Root, g: Glossary): number {
    const glosses = new Map((g.entities ?? []).filter((e) => e.gloss).map((e) => [e.name, e]));
    if (glosses.size === 0)
        return 0;
    // every entity name, longest first: "Dev Fund" inside "Deferred Dev Fund
    // Lockbox" is part of the longer name and is not an appearance of its own
    const names = [...new Set((g.entities ?? []).map((e) => e.name))].sort((a, b) => b.length - a.length);
    const any = new RegExp(`(?<![\\p{L}\\p{N}])(${names.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "gu");
    const done = new Set<string>();
    const walk = (node: Root | Element): void => {
        for (const child of node.children) {
            if (child.type === "element") {
                if (/^h[1-6]$/.test(child.tagName) || isSkipped(child) || isOpaque(child))
                    continue;
                walk(child);
                continue;
            }
            if (child.type !== "text")
                continue;
            let out = "";
            let at = 0;
            for (const m of child.value.matchAll(any)) {
                const entity = glosses.get(m[1]);
                if (!entity?.gloss || done.has(m[1]))
                    continue;
                done.add(m[1]);
                const end = m.index + m[1].length;
                const rest = child.value.slice(end);
                const short = entity.short ? rest.match(new RegExp(`^\\s*\\(${escapeRe(entity.short)}\\)`)) : null;
                if (short) {
                    out += child.value.slice(at, end) + ` (${entity.short}, ${entity.gloss})`;
                    at = end + short[0].length;
                }
                else {
                    out += child.value.slice(at, end) + ` (${entity.gloss})`;
                    at = end;
                }
            }
            if (at > 0)
                child.value = out + child.value.slice(at);
        }
    };
    walk(tree);
    return done.size;
}

/* ---------- per document ---------- */

const sha = (s: string): string => crypto.createHash("sha256").update(s).digest("hex");
const toHtml = (tree: Root): string => unified().use(rehypeStringify, { allowDangerousHtml: true }).stringify(tree);

function headingText(el: Element): string {
    let out = "";
    const walk = (n: RootContent) => {
        if (n.type === "text")
            out += n.value;
        else if (n.type === "element" && !classes(n).includes("hanchor"))
            n.children.forEach(walk);
    };
    el.children.forEach(walk);
    return out.replace(/\s+/g, " ").trim();
}

async function translateDoc(slug: string, glossary: Glossary, system: string, reviewSystem: string, promptSha: string, force: boolean): Promise<void> {
    const srcPath = path.join(RENDERED, `${slug}.html`);
    if (!fs.existsSync(srcPath))
        throw new Error(`no rendered document: ${srcPath}`);
    const zips = (JSON.parse(fs.readFileSync(path.join(CONTENT, "zips.json"), "utf8")) as { zips: { slug: string; title: string; headings: { level: number; id: string; text: string }[] }[] }).zips;
    const meta = zips.find((z) => z.slug === slug);
    if (!meta)
        throw new Error(`${slug} is not in zips.json`);
    const html = fs.readFileSync(srcPath, "utf8");
    const sourceSha = sha(`${html}\n${meta.title}`);
    const metaPath = path.join(OUT, `${slug}.json`);
    const tmPath = path.join(OUT, `${slug}.tm.json`);
    if (!force && fs.existsSync(metaPath)) {
        const prev = JSON.parse(fs.readFileSync(metaPath, "utf8")) as { sourceSha?: string; promptSha?: string; stats?: { fallback?: number; reviewed?: boolean } };
        // a document with segments left in English, or not reviewed, is tried again
        if (prev.sourceSha === sourceSha && prev.promptSha === promptSha && prev.stats?.fallback === 0 && prev.stats?.reviewed) {
            console.log(`${slug}: up to date`);
            return;
        }
    }
    console.log(`${slug}: translating`);
    const started = Date.now();
    Object.assign(usage, { calls: 0, completion: 0, reasoning: 0 });
    const tree = fromHtml(html, { fragment: true });
    const segments: Segment[] = [];
    collect(tree, segments);
    // the title is one more segment; it has no markup
    const titleSeg: Segment = { source: esc(meta.title), slots: new Map(), lead: "", trail: "", apply: () => { }, title: true, kind: "title", section: "" };
    const wanted = new Map<string, Segment>();
    // the title goes first: it is the context of every other segment
    for (const seg of [titleSeg, ...segments])
        if (!wanted.has(seg.source))
            wanted.set(seg.source, seg);
    const doc: Doc = { title: `ZIP: ${meta.title}`, glossary };
    // Segment memory: an unchanged paragraph keeps its earlier translation.
    const stored = !force && fs.existsSync(tmPath) ? JSON.parse(fs.readFileSync(tmPath, "utf8")) as { segments?: Record<string, string>; reviews?: Record<string, Review> } : {};
    const memory: Record<string, string> = stored.segments ?? {};
    const reviews: Record<string, Review> = stored.reviews ?? {};
    const reused = [...wanted.keys()].filter((s) => s in memory).length;
    console.log(`  ${segments.length} segments, ${wanted.size} unique, ${reused} from memory`);
    const { failed } = await translateAll(system, doc, wanted, memory);
    await reviewAll(reviewSystem, doc, wanted, memory, reviews);
    for (const s of wanted.keys())
        if (!(s in memory) && reviews[s] && !reviews[s].passed)
            failed.set(s, `no text passed the review: ${reviews[s].issues.join(" | ")}`);
    let fallback = 0;
    for (const seg of segments) {
        const t = memory[seg.source];
        if (t === undefined) {
            fallback++;
            continue;
        }
        try {
            seg.apply(rebuild(seg, t));
        }
        catch {
            fallback++;
        }
    }
    const translatedHeadings = new Map<string, string>();
    const walk = (n: Root | Element) => {
        for (const c of n.children) {
            if (c.type !== "element")
                continue;
            if (/^h[1-6]$/.test(c.tagName) && typeof c.properties?.id === "string")
                translatedHeadings.set(c.properties.id, headingText(c));
            walk(c);
        }
    };
    walk(tree);
    const title = memory[titleSeg.source] !== undefined ? unesc(memory[titleSeg.source]) : meta.title;
    fs.mkdirSync(OUT, { recursive: true });
    const glossed = addGlosses(tree, glossary);
    fs.writeFileSync(path.join(OUT, `${slug}.html`), toHtml(tree));
    const kept = [...wanted.keys()].filter((s) => s in memory);
    fs.writeFileSync(tmPath, JSON.stringify({
        segments: Object.fromEntries(kept.map((s) => [s, memory[s]])),
        // rejected segments stay in the record too: the next run starts them again, the report shows why
        reviews: Object.fromEntries([...wanted.keys()].filter((s) => reviews[s]).map((s) => [s, reviews[s]])),
    }, null, 1));
    const changed = kept.filter((s) => reviews[s]?.first !== undefined).length;
    const rejected = [...wanted.keys()].filter((s) => reviews[s] && !reviews[s].passed).length;
    fs.writeFileSync(metaPath, JSON.stringify({
        slug,
        sourceSha,
        promptSha,
        model: MODEL,
        title,
        headings: meta.headings.map((h) => ({ ...h, text: translatedHeadings.get(h.id) ?? h.text })),
        reviewModel: REVIEW_MODEL,
        reviewEffort: REVIEW_EFFORT,
        stats: { segments: segments.length, fallback, reviewed: true, correctedByReview: changed, rejectedByReview: rejected },
        failures: [...failed.entries()].map(([source, reason]) => ({ source, reason })),
    }, null, 1));
    console.log(`  done: ${segments.length - fallback}/${segments.length} segments translated${fallback ? `, ${fallback} left in English` : ""}`);
    console.log(`  glosses: ${glossed} names explained at first appearance`);
    console.log(`  review: ${changed} corrected, ${rejected} rejected, of ${wanted.size} unique segments`);
    console.log(`  ${((Date.now() - started) / 1000).toFixed(0)} s, ${usage.calls} calls, ${usage.completion} output tokens (${usage.reasoning} reasoning), thinking ${THINKING}`);
    for (const [source, reason] of failed)
        console.log(`  ! ${reason}\n    ${source.slice(0, 140)}`);
}

async function main(): Promise<void> {
    loadEnv();
    const args = process.argv.slice(2);
    const force = args.includes("--force");
    const slugs = args.filter((a) => !a.startsWith("--"));
    if (slugs.length === 0) {
        console.error("usage: pnpm translate [--force] <slug> [<slug> …]   e.g. pnpm translate zip-0200");
        process.exit(1);
    }
    if (!process.env.GLM_KEY) {
        console.error("GLM_KEY is not set (expected in .env.local of the main checkout)");
        process.exit(1);
    }
    const glossary = withEntities(yaml.load(fs.readFileSync(path.join(ROOT, "data", "glossary-es.yaml"), "utf8")) as Glossary);
    KEEP = glossary.keep ?? [];
    const system = systemPrompt(glossary);
    const reviewSystem = reviewPrompt(glossary);
    // the glossary is sent with each request, so it is part of the identity too
    const promptSha = sha(`${MODEL}\n${system}\n${REVIEW_MODEL}\n${REVIEW_EFFORT}\n${reviewSystem}\n${JSON.stringify(glossary)}`).slice(0, 16);
    for (const slug of slugs)
        await translateDoc(slug, glossary, system, reviewSystem, promptSha, force);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
    main().catch((err) => {
    console.error(err);
    process.exit(1);
});
