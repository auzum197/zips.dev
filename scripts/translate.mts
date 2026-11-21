/* Translate rendered ZIP HTML to Spanish with GLM.
 *
 *   pnpm translate zip-0200 zip-0317        translate the given documents
 *   pnpm translate pr-1437-zip-0223         a document of a pull request
 *   pnpm translate --all                    every document that is missing or out of date
 *   pnpm translate --force zip-0200         ignore the cache
 *   pnpm translate --check                  list the documents with no current translation; no model call
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
/** The reviewer: a different model from the translator, with its reasoning
 *  pass on. */
const REVIEW_MODEL = process.env.GLM_REVIEW_MODEL || "glm-5.3-flash";
const REVIEW_THINKING = process.env.GLM_REVIEW_THINKING || "enabled";
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

const BCP14 = /\b(MUST NOT|SHALL NOT|SHOULD NOT|NOT RECOMMENDED|MUST|REQUIRED|SHALL|SHOULD|RECOMMENDED|MAY|OPTIONAL)\b(?!-\p{L})/gu;

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

const NUMBER_WORDS = ["", "primer[oa]?", "dos|segund[oa]", "tres|tercer[oa]?", "cuatro|cuart[oa]", "cinco|quint[oa]", "seis|sext[oa]", "siete|séptim[oa]", "ocho|octav[oa]", "nueve|noven[oa]"];
const bareNumbers = (t: string): string => t.replace(/<\/?[gx]\d+\/?>/g, " ").replace(/(\d)k\b/gi, (_, d: string) => `${d}000`);
const digitsOf = (t: string): string => (bareNumbers(t).match(/\d/g) ?? []).sort().join("");

/** True when the translation has the numbers of the source. A number of one
 *  digit can be a Spanish word ("3rd" as "tercer"), and "500k" can be "500 000". */
export function sameNumbers(source: string, text: string): boolean {
    const src = bareNumbers(source);
    const count = (t: string, re: RegExp): number => (t.match(re) ?? []).length;
    for (let d = 0; d <= 9; d++) {
        const missing = count(digitsOf(source), new RegExp(String(d), "g")) - count(digitsOf(text), new RegExp(String(d), "g"));
        if (missing === 0)
            continue;
        if (missing < 0 || d === 0)
            return false;
        const alone = count(src, new RegExp(`(?<![\\d.,])${d}(?![.,]?\\d)`, "g"));
        const words = count(text, new RegExp(`(?<!\\p{L})(?:${NUMBER_WORDS[d]})(?!\\p{L})`, "giu"));
        if (alone < missing || words < missing)
            return false;
    }
    return true;
}

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
        const words = [...KEEP].sort((a, b) => b.length - a.length).reduce((t, term) => t.split(term).join(" "), seg.source).match(/\p{L}*\p{Ll}\p{L}{3,}/gu) ?? [];
        if (words.length >= 2)
            throw new Error("this is the title of the document and it is still in English; translate it");
    }
    // every number of the source is in the translation: "Revision 2" must not become "Revisión 3"
    if (!sameNumbers(seg.source, text))
        throw new Error(`the numbers differ from the source: the source has [${digitsOf(seg.source)}], the translation has [${digitsOf(text)}]. Write each number of the source with the same digits, and add no number`);
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
        if (!/\p{Lu}{2,}["”»’']?\s*\($/u.test(before) || text[m.index + m[0].length] !== ")")
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
        throw new Error(`placeholders missing: ${[...seg.slots].filter(([k]) => !seen.has(k)).map(([k, slot]) => slot.kind === "g" ? `<g${k}>…</g${k}>` : `<x${k}/>`).join(", ")}. Each placeholder of the source goes around the same words in the translation`);
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
        terms: Object.fromEntries(Object.entries(g.terms ?? {}).filter(([en]) => has(en))),
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
export async function translateAll(system: string, doc: Doc, wanted: Map<string, Segment>, memory: Record<string, string>, checkpoint?: () => void): Promise<{ failed: Map<string, string> }> {
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
            checkpoint?.();
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
    /** The model that reviewed it. Absent in reviews made before this was recorded (glm-5.3). */
    model?: string;
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
export async function reviewAll(system: string, doc: Doc, wanted: Map<string, Segment>, memory: Record<string, string>, reviews: Record<string, Review>, checkpoint?: () => void): Promise<void> {
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
                review.model = REVIEW_MODEL;
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
            checkpoint?.();
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

export interface Entry {
    /** File name in content/rendered/, with no extension. */
    key: string;
    /** The document it is a version of: "zip-0317", "draft-…". */
    slug: string;
    title: string;
    headings: { level: number; id: string; text: string }[];
}
/** Every document of the site: ZIPs and drafts of zcash/zips, and the
 *  documents inside pull requests, of zcash/zips and of the watched
 *  repositories. A pull request document is "pr-<number>-<slug>", or
 *  "pr-<source>-<number>-<slug>" for a watched repository. */
export function catalog(): Map<string, Entry> {
    function read<T>(file: string): T {
        return JSON.parse(fs.readFileSync(path.join(CONTENT, file), "utf8")) as T;
    }
    const out = new Map<string, Entry>();
    for (const z of read<{ zips: Omit<Entry, "key">[] }>("zips.json").zips)
        out.set(z.slug, { key: z.slug, slug: z.slug, title: z.title, headings: z.headings });
    interface Preview {
        filename: string;
        slug?: string;
        title: string;
        headings?: Entry["headings"];
    }
    interface Pr {
        source: string | null;
        number: number;
        previews?: Preview[];
        preview?: Preview | null;
    }
    for (const pr of [...read<{ prs: Pr[] }>("prs.json").prs, ...read<{ prs: Pr[] }>("external.json").prs]) {
        const previews = pr.previews?.length ? pr.previews : pr.preview ? [pr.preview] : [];
        for (const pv of previews) {
            const slug = pv.slug ?? pv.filename.replace(/^.*\//, "").replace(/\.(md|rst)$/i, "");
            const key = `pr-${pr.source ? `${pr.source}-${pr.number}` : pr.number}-${slug}`;
            if (fs.existsSync(path.join(RENDERED, `${key}.html`)))
                out.set(key, { key, slug, title: pv.title, headings: pv.headings ?? [] });
        }
    }
    return out;
}

/** Reviewed translations of the same paragraphs in other versions of the
 *  document. A pull request changes a few paragraphs of a ZIP; the others
 *  are already translated and reviewed in the ZIP itself, or in another pull
 *  request that touches it. Returns the number of paragraphs taken. */
export function seedMemory(entry: Entry, wanted: Map<string, Segment>, memory: Record<string, string>, reviews: Record<string, Review>, dir: string = OUT): number {
    if (!fs.existsSync(dir))
        return 0;
    const own = `${entry.key}.tm.json`;
    const related = fs.readdirSync(dir).filter((f) => f !== own && (f === `${entry.slug}.tm.json` || (f.startsWith("pr-") && f.endsWith(`-${entry.slug}.tm.json`)))).sort();
    let taken = 0;
    for (const file of related) {
        const other = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8")) as { segments?: Record<string, string>; reviews?: Record<string, Review> };
        for (const [source, text] of Object.entries(other.segments ?? {})) {
            if (source in memory || !wanted.has(source) || !other.reviews?.[source]?.passed)
                continue;
            memory[source] = text;
            reviews[source] = other.reviews[source];
            taken++;
        }
    }
    return taken;
}

export type Freshness = "current" | "changed" | "missing";

export function freshness(entry: Pick<Entry, "key" | "title">, rendered: string = RENDERED, dir: string = OUT): Freshness {
    const metaPath = path.join(dir, `${entry.key}.json`);
    if (!fs.existsSync(metaPath) || !fs.existsSync(path.join(dir, `${entry.key}.html`)))
        return "missing";
    const html = fs.readFileSync(path.join(rendered, `${entry.key}.html`), "utf8");
    const record = JSON.parse(fs.readFileSync(metaPath, "utf8")) as { sourceSha?: string };
    return record.sourceSha === sha(`${html}\n${entry.title}`) ? "current" : "changed";
}

export function staleReport(entries: Iterable<Pick<Entry, "key" | "title">>, rendered: string = RENDERED, dir: string = OUT): { stale: number; text: string } {
    const reasons = { changed: "English text changed", missing: "not translated" };
    const lines: string[] = [];
    let total = 0;
    for (const entry of entries) {
        total++;
        const state = freshness(entry, rendered, dir);
        if (state !== "current")
            lines.push(`- \`${entry.key}\`: ${reasons[state]}`);
    }
    const head = lines.length === 0
        ? `All ${total} documents have a current Spanish translation.`
        : `${lines.length} of ${total} documents have no current Spanish translation.`;
    return { stale: lines.length, text: ["### Spanish translation", "", head, "", ...lines].join("\n").trimEnd() + "\n" };
}

async function translateDoc(entry: Entry, glossary: Glossary, system: string, reviewSystem: string, promptSha: string, force: boolean): Promise<void> {
    const slug = entry.key;
    const srcPath = path.join(RENDERED, `${slug}.html`);
    const meta = entry;
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
    const seeded = force ? 0 : seedMemory(entry, wanted, memory, reviews);
    const reused = [...wanted.keys()].filter((s) => s in memory).length;
    console.log(`  ${segments.length} segments, ${wanted.size} unique, ${reused} from memory${seeded ? ` (${seeded} from other versions of the document)` : ""}`);
    fs.mkdirSync(OUT, { recursive: true });
    const checkpoint = () => fs.writeFileSync(tmPath, JSON.stringify({ segments: memory, reviews }, null, 1));
    const { failed } = await translateAll(system, doc, wanted, memory, checkpoint);
    await reviewAll(reviewSystem, doc, wanted, memory, reviews, checkpoint);
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
        reviewModels: [...new Set(kept.map((k) => reviews[k]?.model ?? "glm-5.3"))].sort(),
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
    const all = catalog();
    if (args.includes("--check")) {
        process.stdout.write(staleReport(all.values()).text);
        return;
    }
    const slugs = args.includes("--all") ? [...all.keys()] : args.filter((a) => !a.startsWith("--"));
    if (slugs.length === 0) {
        console.error("usage: pnpm translate --check | [--force] --all | <document> [<document> …]   e.g. pnpm translate zip-0200 pr-1437-zip-0223");
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
    const unknown = slugs.filter((slug) => !all.has(slug));
    if (unknown.length > 0)
        throw new Error(`${unknown.join(", ")}: not a document of the site`);
    let errors = 0;
    for (const slug of slugs) {
        try {
            await translateDoc(all.get(slug)!, glossary, system, reviewSystem, promptSha, force);
        }
        catch (err) {
            errors++;
            console.error(`${slug}: failed`, err);
        }
    }
    if (errors > 0)
        process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
    main().catch((err) => {
    console.error(err);
    process.exit(1);
});
