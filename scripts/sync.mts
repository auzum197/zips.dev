#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypeShiki from "@shikijs/rehype";
import rehypeStringify from "rehype-stringify";
import temml from "temml";
import { fromHtml } from "hast-util-from-html";
import { visit } from "unist-util-visit";
import yaml from "js-yaml";
import type { ElementContent, Root as HastRoot } from "hast";
import type {
    Paragraph,
    PhrasingContent,
    Root as MdastRoot,
    RootContent as MdastContent,
} from "mdast";
import type { Transformer } from "unified";

/** Metadata header values: a scalar or a repeated key collected into a list. */
type MetaValue = string | string[];
type Meta = Record<string, MetaValue>;

const errMessage = (e: unknown): string => String((e as { message?: unknown }).message ?? e);

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const VENDOR = path.join(ROOT, "vendor", "zips");
const ZIPS_DIR = path.join(VENDOR, "zips");
const CONTENT = path.join(ROOT, "content");
const RENDERED = path.join(CONTENT, "rendered");
const PUBLIC_API = path.join(ROOT, "public", "api");
const UPSTREAM_ASSETS = path.join(ROOT, "public", "upstream");
const REPO = "zcash/zips";
const COMMIT_BASE = `https://github.com/${REPO}`;
for (const d of [CONTENT, RENDERED, PUBLIC_API, path.join(PUBLIC_API, "zips"), UPSTREAM_ASSETS]) {
    fs.mkdirSync(d, { recursive: true });
}
const git = (args: string[]): string => spawnSync("git", ["-C", VENDOR, ...args], { encoding: "utf8" }).stdout.trim();
function decodeEntities(s: string): string {
    return s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
}
function stripTags(s: string): string {
    return decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}
const readJsonSafe = <T,>(p: string): T | null => {
    try {
        return JSON.parse(fs.readFileSync(p, "utf8")) as T;
    }
    catch {
        return null;
    }
};
/* A ZIP header "Status:" is either a plain status ("Final"), one revision
   ("[Revision 1] Final"), or a list of per-revision statuses
   ("[Revision 0: Canopy, Revision 1: NU6] Final, [Revision 2: NU7] Proposed").
   Unwrap only the one-revision form. Keep a list verbatim, so the site can
   show one badge per entry (src/lib/zip-status.ts). `revision` is the highest
   revision the header names, or null if it names none. */
function normalizeStatus(raw: MetaValue | undefined, fallback: string): { status: string; revision: number | null } {
    const text = String(raw ?? "").trim();
    if (!text)
        return { status: fallback, revision: null };
    const revs = [...text.matchAll(/Revision\s+(\d+)/gi)].map((m) => Number(m[1]));
    const revision = revs.length > 0 ? Math.max(...revs) : null;
    const single = text.match(/^\[Revision\s+\d+\]\s*([^[\],]+)$/i);
    return { status: single ? single[1].trim() : text, revision };
}
function parseHeader(source: string): { meta: Meta | null; body: string } {
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    let i = 0;
    while (i < lines.length && lines[i].trim() === "")
        i++;
    /* zcash/zips indents the metadata header (2-space in .rst, 4-space in
     * .md, wrapped in a leading `::` literal block). Some third-party repos
     * (e.g. tachyon-zcash/zips) wrap it in a fenced code block at zero
     * indent instead. Parse that variant the same way; the body then starts
     * after the closing fence. A document that does not open with a fence,
     * or whose fence does not begin with a key, parses exactly as before. */
    const fence = lines[i]?.match(/^(```+|~~~+)\s*$/);
    let inFence = false;
    if (fence) {
        i++;
        inFence = true;
    }
    else {
        if (lines[i] !== undefined && lines[i].trim() === "::")
            i++;
        while (i < lines.length && lines[i].trim() === "")
            i++;
    }
    const keyRe = inFence
        ? /^(\s*)([A-Za-z][A-Za-z0-9-]*):(?:\s(.*))?$/
        : /^(\s+)([A-Za-z][A-Za-z0-9-]*):(?:\s(.*))?$/;
    const first = lines[i]?.match(keyRe);
    if (!first)
        return { meta: null, body: source };
    const baseIndent = first[1].length;
    const scalars: Record<string, string> = {};
    const lists: Record<string, string[]> = {};
    const multi: Record<string, string[]> = {};
    while (i < lines.length) {
        const line = lines[i];
        if (line.trim() === "") {
            const next = lines[i + 1] ?? "";
            const m = next.match(/^(\s+)\S/);
            if (!m || m[1].length <= baseIndent)
                break;
            i++;
            continue;
        }
        if (line.trim() !== "" && line.length - line.trimStart().length < baseIndent)
            break;
        const m = line.match(keyRe);
        if (m && m[1].length === baseIndent) {
            const key = m[2].toLowerCase().replace(/-/g, "_");
            const val = (m[3] ?? "").trim();
            if (val === "")
                multi[key] = [];
            else if (key in multi)
                multi[key].push(val);
            else {
                scalars[key] = val;
                if (!Object.prototype.hasOwnProperty.call(scalars, key))
                    lists[key] = [val];
            }
        }
        else if (/^\s+\S/.test(line)) {
            const keys = Object.keys(multi);
            const last = keys[keys.length - 1];
            if (last)
                multi[last].push(line.trim());
        }
        else
            break;
        i++;
    }
    let body = lines.slice(i).join("\n").replace(/^\s*\n+/, "");
    if (inFence && /^(```+|~~~+)\s*$/.test(lines[i] ?? ""))
        body = lines.slice(i + 1).join("\n").replace(/^\s*\n+/, "");
    const meta: Meta = { ...scalars };
    for (const [k, v] of Object.entries(multi)) {
        meta[k] = v.length === 1 ? v[0] : v;
    }
    return { meta, body };
}
function parseAuthors(v: MetaValue | undefined): string[] {
    if (!v)
        return [];
    return (Array.isArray(v) ? v : String(v).split(/\n/)).map((s) => s.trim()).filter(Boolean);
}
/** The scalar value of a metadata field (the first of a repeated key). */
const one = (v: MetaValue | undefined): string => (Array.isArray(v) ? v[0] ?? "" : v ?? "");

interface Heading {
    level: number;
    id: string;
    text: string;
}
function extractHeadings(html: string): Heading[] {
    const out: Heading[] = [];
    const clean = html.replace(/<a class="hanchor"[\s\S]*?<\/a>/g, "");
    const re = /<h([1-4])((?:[^>"]|"[^"]*")*)\bid="([^"]+)"([^>]*)>([\s\S]*?)<\/h\1>/g;
    let m;
    while ((m = re.exec(clean))) {
        out.push({ level: Number(m[1]), id: m[3], text: stripTags(m[5]) });
    }
    return out;
}
function wrapMath(html: string): string {
    const parts = html.split(/(<pre[\s\S]*?<\/pre>|<code[\s\S]*?<\/code>)/gi);
    return parts
        .map((part, i) => {
        if (i % 2 === 1)
            return part;
        return part.replace(/\$([^$\n]{1,120}?)\$/g, (full, inner) => {
            if (!/[\^_\\{}]/.test(inner) && !MATHISH.test(inner))
                return full;
            return `<code class="math-src">$${inner}$</code>`;
        });
    })
        .join("");
}
function injectHeadingAnchors(html: string): string {
    return html.replace(/<h([1-4])((?:[^>"]|"[^"]*")*\bid="([^"]+)"(?:[^>"]|"[^"]*")*)>/g, (full, level, attrs, id) => `<h${level}${attrs}><a class="hanchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>`);
}
function rewriteLinks(html: string, assets: Set<string>): string {
    return (html
        .replace(/(src|href)="(?!https?:|#|\/|mailto:)([^"]+)"/g, '$1="/upstream/$2"')
        .replace(/"(?:\/upstream\/)?[^"]*?\/?([^\/"']+)\.png"/gi, (full, base) => {
        const svg = `${base}.svg`;
        return assets.has(svg) ? `"/upstream/${svg}"` : full;
    })
        .replace(/href="(?!https?:|#|\/|mailto:|\/upstream\/)([^"#?]*?)(?:\.rst|\.md)"/gi, (full, p) => {
        const clean = p.replace(/^.*\//, "");
        const zip = clean.match(/^zip-0*(\d{1,4})$/i);
        if (zip)
            return `href="/zip/${zip[1]}/"`;
        const draft = clean.match(/^draft-([a-z0-9-]+)$/i);
        if (draft)
            return `href="/drafts/"`;
        return `href="/${clean}/"`;
    }));
}
function wordCount(html: string): number {
    const text = stripTags(html);
    return text ? text.split(/\s+/).length : 0;
}
const commit = git(["rev-parse", "HEAD"]);
const commitShort = commit.slice(0, 10);
const syncedAt = new Date().toISOString();
console.log(`sync: upstream ${REPO} @ ${commitShort}`);
interface UpgradesFile {
    upgrades?: Array<{ id: string; zips?: number[] }>;
}
interface ImplementationsFile {
    implementations?: Array<{ name: string; zips?: number[] }>;
}
interface CrossrefsFile {
    zips?: Record<string, unknown>;
}
interface SourcesFile {
    pulls?: unknown[];
}
interface WatchedPull {
    id: string;
    repo: string;
    number: number;
    label: string;
    note?: string;
}
const loadYaml = <T,>(p: string): T => (yaml.load(fs.readFileSync(path.join(ROOT, "data", p), "utf8")) as T | null) ?? ({} as T);
const upgradesYaml = loadYaml<UpgradesFile>("upgrades.yaml");
const implsYaml = loadYaml<ImplementationsFile>("implementations.yaml");
const crossrefsYaml = loadYaml<CrossrefsFile>("crossrefs.yaml");
/* Watched third-party PRs (data/sources.yaml), curated per-PR. Fail fast on
   a malformed entry: a bad id would produce broken /external/<id>/ routes,
   and a bad repo would fail later with a less obvious API error. */
const watchedPulls: WatchedPull[] = (loadYaml<SourcesFile>("sources.yaml").pulls ?? []).map((raw) => {
    const p = raw as Partial<WatchedPull> | null;
    if (!p || typeof p.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(p.id))
        throw new Error(`sync: sources.yaml entry needs an id matching [a-z0-9-]: ${JSON.stringify(raw)}`);
    if (typeof p.repo !== "string" || !/^[\w.-]+\/[\w.-]+$/.test(p.repo))
        throw new Error(`sync: sources.yaml id ${p.id} needs repo "owner/name"`);
    if (!Number.isInteger(p.number) || typeof p.number !== "number" || p.number < 1)
        throw new Error(`sync: sources.yaml id ${p.id} needs a positive integer "number"`);
    if (typeof p.label !== "string" || p.label === "")
        throw new Error(`sync: sources.yaml ${p.repo}#${p.number} needs a label`);
    return p as WatchedPull;
});
{
    const seen = new Set<string>();
    const groupRepo = new Map<string, string>();
    for (const p of watchedPulls) {
        const key = `${p.repo}#${p.number}`;
        if (seen.has(key))
            throw new Error(`sync: duplicate sources.yaml entry ${key}`);
        seen.add(key);
        const grouped = groupRepo.get(p.id);
        if (grouped && grouped !== p.repo)
            throw new Error(`sync: sources.yaml id ${p.id} groups different repos (${grouped}, ${p.repo})`);
        groupRepo.set(p.id, p.repo);
    }
}
if (watchedPulls.length > 0)
    console.log(`sync: watching ${watchedPulls.length} external PR(s): ${watchedPulls.map((p) => `${p.repo}#${p.number}`).join(", ")}`);
const crossrefFor = (slug: string): unknown => crossrefsYaml.zips?.[slug] ?? crossrefsYaml.zips?.[String(Number((slug.match(/(\d+)/) ?? [])[1] ?? ""))] ?? null;
function mathToHast(node: { type: string; value?: unknown }): ElementContent {
    const tex = String(node.value ?? "");
    try {
        return fromHtml(temml.renderToString(tex, { displayMode: node.type === "math" }), {
            fragment: true,
        }).children[0] as ElementContent;
    }
    catch {
        return {
            type: "element",
            tagName: "code",
            properties: { className: ["math-src"] },
            children: [{ type: "text", value: `$${tex}$` }],
        };
    }
}
function rehypeHeadingAnchorLabels(): Transformer<HastRoot> {
    return (tree) => {
        visit(tree, "element", (node) => {
            if (!/^h[1-6]$/.test(node.tagName))
                return;
            const last = node.children[node.children.length - 1];
            if (!last || last.type !== "text")
                return;
            const m = last.value.match(/\s*\[([a-z0-9][a-z0-9-]*)\]\s*$/);
            if (!m)
                return;
            last.value = last.value.slice(0, m.index).trimEnd();
            node.properties.id = m[1];
        });
    };
}
function splitTightDeflist(node: Paragraph): [MdastContent, MdastContent] | null {
    for (let ci = 0; ci < node.children.length; ci++) {
        const child = node.children[ci];
        if (child.type !== "text")
            continue;
        const m = child.value.match(/\n(?=:\s+\S)/);
        if (!m)
            continue;
        const before = child.value.slice(0, m.index);
        const after = child.value.slice((m.index ?? 0) + 1).replace(/^:\s+/, "");
        if (ci === 0 && !before.trim())
            continue;
        const termChildren: PhrasingContent[] = [
            ...node.children.slice(0, ci),
            { type: "text", value: before.replace(/\n$/, "") },
        ];
        const descChildren: PhrasingContent[] = [
            { type: "text", value: after },
            ...node.children.slice(ci + 1),
        ];
        const term: MdastContent = {
            type: "definitionTerm",
            children: termChildren.filter((c) => c.type !== "text" || c.value !== ""),
        };
        const desc: MdastContent = {
            type: "definitionDescription",
            children: descChildren,
        };
        return [term, desc];
    }
    return null;
}
function remarkZipDeflists(): Transformer<MdastRoot> {
    return (tree) => {
        const out: MdastContent[] = [];
        for (const node of tree.children) {
            const first = node.type === "paragraph" ? node.children[0] : null;
            if (first?.type === "text" &&
                /^:\s+\S/.test(first.value) &&
                out.length > 0 &&
                out[out.length - 1].type === "paragraph") {
                first.value = first.value.replace(/^:\s+/, "");
                // Reaching here implies `node` is the paragraph that owns `first`.
                out.push({ type: "definitionTerm", children: (out.pop() as Paragraph).children }, { type: "definitionDescription", children: (node as Paragraph).children });
                continue;
            }
            if (node.type === "paragraph") {
                const pair = splitTightDeflist(node);
                if (pair) {
                    out.push(...pair);
                    continue;
                }
            }
            out.push(node);
        }
        const wrapped: MdastContent[] = [];
        for (const node of out) {
            const isDef = node.type === "definitionTerm" || node.type === "definitionDescription";
            const last = wrapped[wrapped.length - 1];
            if (isDef && last?.type === "definitionList")
                last.children.push(node);
            else if (isDef)
                wrapped.push({ type: "definitionList", children: [node] });
            else
                wrapped.push(node);
        }
        tree.children = wrapped;
    };
}
const mdProcessor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkZipDeflists)
    .use(remarkMath)
    .use(remarkRehype, {
    allowDangerousHtml: true,
    handlers: {
        math: (_state, node) => mathToHast(node),
        inlineMath: (_state, node) => mathToHast(node),
        definitionList: (state, node) => ({
            type: "element",
            tagName: "dl",
            properties: {},
            children: state.all(node),
        }),
        definitionTerm: (state, node) => ({
            type: "element",
            tagName: "dt",
            properties: {},
            children: state.all(node),
        }),
        definitionDescription: (state, node) => ({
            type: "element",
            tagName: "dd",
            properties: {},
            children: state.all(node),
        }),
    },
})
    .use(rehypeRaw)
    .use(rehypeHeadingAnchorLabels)
    .use(rehypeSlug)
    .use(rehypeShiki, {
    themes: { light: "github-light-high-contrast", dark: "github-dark-high-contrast" },
    defaultColor: false,
})
    .use(rehypeStringify);
async function renderMd(body: string): Promise<string> {
    const file = await mdProcessor.process(normalizeMathFences(body));
    return String(file);
}
function normalizeMathFences(md: string): string {
    const lines = md.split("\n");
    const out: string[] = [];
    let inCode = false;
    let inMath = false;
    for (const line of lines) {
        if (/^\s*(```|~~~)/.test(line)) {
            inCode = !inCode;
            out.push(line);
            continue;
        }
        if (inCode) {
            out.push(line);
            continue;
        }
        if (inMath) {
            const m = line.match(/^(.*?)\$\$\s*$/);
            if (m) {
                if (m[1].length)
                    out.push(m[1]);
                out.push("$$");
                inMath = false;
            }
            else {
                out.push(line);
            }
            continue;
        }
        if (/^\$\$/.test(line)) {
            if (!/\$\$\s*$/.test(line.slice(2)))
                inMath = true;
            out.push(line);
            continue;
        }
        out.push(line);
    }
    return out.join("\n");
}
const MATHISH = /^[a-z0-9]$|^[a-z0-9]\s*[-+*/=<>]\s*[a-z0-9]$/i;
function preprocessRstMath(body: string): string {
    return body.replace(/\$([^$\n]{1,120}?)\$/g, (full, inner) => {
        if (!/[\^_\\{}]/.test(inner) && !MATHISH.test(inner))
            return full;
        return ":math:`" + inner + "`";
    });
}
function renderRst(body: string, slug: string): string | null {
    const res = spawnSync("python3", [path.join(ROOT, "scripts", "rst2fragment.py")], {
        input: preprocessRstMath(body),
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
    });
    if (res.status !== 0) {
        console.warn(`sync: rst render failed for ${slug}: ${res.stderr.slice(0, 400)}`);
        return null;
    }
    return res.stdout;
}
const files = fs
    .readdirSync(ZIPS_DIR)
    .filter((f) => /\.(md|rst)$/i.test(f))
    .filter((f) => !/^zip-(template|guide)/i.test(f))
    .sort();
const assetNames = new Set<string>();
for (const f of fs.readdirSync(ZIPS_DIR)) {
    if (!/\.(md|rst)$/i.test(f)) {
        fs.copyFileSync(path.join(ZIPS_DIR, f), path.join(UPSTREAM_ASSETS, f));
        assetNames.add(f);
    }
}
/** Fail fast when the RST renderer is unusable, before anything is written.
 *  Without this, a machine without docutils turns every RST ZIP into an error
 *  stub and overwrites the committed snapshots. */
function preflightRst(): void {
    const res = spawnSync("python3", ["-c", "import docutils, sys; print(docutils.__version__)"], { encoding: "utf8" });
    if (res.status !== 0) {
        throw new Error(`sync: the RST renderer is unavailable (python3 with docutils is required; run \`pip install docutils\`). ${(res.stderr || res.error?.message || "").trim().slice(0, 200)}`);
    }
    console.log(`sync: docutils ${res.stdout.trim()}`);
}
/** Set SYNC_ALLOW_RENDER_FAILURES=1 to keep going when individual documents
 *  fail to render; they are then published as error stubs linking upstream. */
const ALLOW_RENDER_FAILURES = process.env.SYNC_ALLOW_RENDER_FAILURES === "1";

interface ZipDoc {
    slug: string;
    number: number | null;
    displayNumber: string;
    kind: "zip" | "draft";
    filename: string;
    format: "md" | "rst";
    title: string;
    abstract: string;
    status: string;
    revision: number | null;
    owners: string[];
    credits: string[];
    originalAuthors: string[];
    category: string;
    created: string | null;
    license: string;
    discussionsTo: string | null;
    pullRequests: string[];
    upstreamPath: string;
    upstreamUrl: string;
    headings: Heading[];
    wordCount: number;
    rendered: boolean;
}
interface PreviewFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch: string | null;
}
interface PreviewEntry {
    filename: string;
    slug: string;
    title: string;
    status: string;
    headings: Heading[];
    format: "md" | "rst";
}
interface PrEntry {
    repo: string;
    source: string | null;
    number: number;
    title: string;
    author: string | null;
    createdAt: string;
    updatedAt: string;
    url: string;
    diffUrl: string;
    headRef: string;
    headRepo: string | null;
    headSha: string | null;
    additions: number;
    deletions: number;
    changedFiles: number;
    bodyExcerpt: string;
    zipRefs: number[];
    draftRefs: string[];
    mapped: boolean;
    claimed: boolean;
    files: PreviewFile[];
    filesTruncated: boolean;
    previews: PreviewEntry[];
    preview: PreviewEntry | null;
}
interface GithubPull {
    number: number;
    title: string;
    body?: string | null;
    user?: { login?: string } | null;
    created_at: string;
    updated_at: string;
    html_url: string;
    diff_url: string;
    head?: { ref?: string; sha?: string; repo?: { full_name?: string } | null };
    additions?: number;
    deletions?: number;
    changed_files?: number;
}
interface GithubFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch?: string | null;
}
interface PreviewState {
    headSha: string | null;
    getPullHead: () => Promise<string>;
}
interface PreviewJob {
    idx: number;
    pr: PrEntry;
    fileKey: string;
    docFile: PreviewFile;
    state: PreviewState;
}
interface ExternalSource {
    id: string;
    repo: string;
    label: string;
    note: string | null;
    error: string | null;
}

async function main(): Promise<void> {
    /* Render cache, keyed by input identity: canonical documents by git blob
     * sha, PR previews by (repo, head sha, file). Warm runs skip the renderer
     * for everything unchanged — typically all but a handful of files. Bump
     * RENDER_CACHE_VERSION whenever the render pipeline itself changes. */
    const RENDER_CACHE_VERSION = 1;
    const renderCachePath = path.join(CONTENT, "render-cache.json");
    interface RenderCache {
        version: number;
        docs: Record<string, { sha: string; rendered?: boolean }>;
        previews: Record<string, { title: string; status: string }>;
    }
    const prevRenderCache = readJsonSafe<RenderCache>(renderCachePath);
    const prevDocsCache: RenderCache["docs"] = prevRenderCache?.version === RENDER_CACHE_VERSION ? prevRenderCache.docs ?? {} : {};
    const prevPreviewCache: RenderCache["previews"] = prevRenderCache?.version === RENDER_CACHE_VERSION ? prevRenderCache.previews ?? {} : {};
    const docsCache: RenderCache["docs"] = {};
    const previewCache: RenderCache["previews"] = {};
    const tree: Record<string, string> = {};
    for (const line of git(["ls-tree", "-r", "HEAD", "--", "zips"]).split("\n")) {
        const entry = line.match(/^[^ ]+ blob ([0-9a-f]{40})\t(.+)$/);
        if (entry)
            tree[entry[2]] = entry[1];
    }
    const shaFor = (filename: string): string => tree[`zips/${filename}`] ?? git(["hash-object", path.join(ZIPS_DIR, filename)]);
    // The rst subprocess is only needed for documents that will actually render.
    if (files.some((f) => /\.rst$/i.test(f) && (prevDocsCache[f]?.sha !== shaFor(f) || !prevDocsCache[f]?.rendered)))
        preflightRst();
    const zips: ZipDoc[] = [];
    const failures: string[] = [];
    const renderedHtml = new Map<string, string>();
    let docsCacheHits = 0;
    for (const filename of files) {
        const slug = filename.replace(/\.(md|rst)$/i, "");
        const format: "md" | "rst" = /\.md$/i.test(filename) ? "md" : "rst";
        const raw = fs.readFileSync(path.join(ZIPS_DIR, filename), "utf8");
        const { meta: hdr, body } = parseHeader(raw);
        const numberMatch = String(hdr?.zip ?? "").match(/^\d+$/);
        const number = numberMatch ? parseInt(numberMatch[0], 10) : null;
        const { status, revision } = normalizeStatus(hdr?.status, "Unknown");
        const sha = shaFor(filename);
        docsCache[filename] = { sha };
        const htmlPath = path.join(RENDERED, `${slug}.html`);
        const cached = prevDocsCache[filename];
        let html: string;
        let renderedOk: boolean;
        if (cached && cached.sha === sha && cached.rendered && fs.existsSync(htmlPath)) {
            html = fs.readFileSync(htmlPath, "utf8");
            renderedOk = true;
            docsCacheHits++;
        }
        else {
            const html0 = await (format === "md" ? renderMd(body) : Promise.resolve(renderRst(body, slug)));
            html = html0 === null ? `<p class="render-error">This document could not be rendered (RST conversion failed). <a href="https://github.com/${REPO}/blob/${commit}/zips/${filename}">Read the source on GitHub.</a></p>` : injectHeadingAnchors(wrapMath(rewriteLinks(html0, assetNames)));
            renderedOk = html0 !== null;
            if (html0 === null)
                failures.push(filename);
            // Only re-rendered documents are written back; cache hits keep
            // the file already on disk.
            renderedHtml.set(slug, html);
        }
        docsCache[filename].rendered = renderedOk;
        const pullRequestRaw = hdr?.pull_request;
        const pullRequests = (Array.isArray(pullRequestRaw) ? pullRequestRaw : pullRequestRaw ? [pullRequestRaw] : [])
            .map((s) => {
            const m = String(s).match(/github\.com\/[\w.-]+\/[\w.-]+\/pull\/(\d+)/);
            return m ? `https://github.com/${REPO}/pull/${m[1]}` : null;
        })
            .filter((u): u is string => Boolean(u));
        zips.push({
            slug,
            number,
            displayNumber: number === null ? "???" : String(number),
            kind: number === null ? "draft" : "zip",
            filename,
            format,
            title: one(hdr?.title ?? slug).trim(),
            abstract: one(hdr?.abstract ?? "").replace(/\s+/g, " ").trim(),
            status,
            revision,
            owners: parseAuthors(hdr?.owners),
            credits: parseAuthors(hdr?.credits),
            originalAuthors: parseAuthors(hdr?.original_authors),
            category: one(hdr?.category ?? "Unknown").trim(),
            created: /^\d{4}-\d{2}-\d{2}$/.test(String(hdr?.created ?? "")) ? one(hdr?.created) : null,
            license: one(hdr?.license ?? "Unknown").trim(),
            discussionsTo: typeof hdr?.discussions_to === "string" ? hdr.discussions_to.replace(/[<>]/g, "").trim() : null,
            pullRequests,
            upstreamPath: `zips/${filename}`,
            upstreamUrl: `${COMMIT_BASE}/blob/${commit}/zips/${filename}`,
            headings: extractHeadings(html),
            wordCount: wordCount(html),
            rendered: renderedOk,
        });
        renderedHtml.set(slug, html);
    }
    zips.sort((a, b) => {
        if (a.kind !== b.kind)
            return a.kind === "zip" ? -1 : 1;
        if (a.number !== null && b.number !== null)
            return a.number - b.number;
        return a.slug.localeCompare(b.slug);
    });
    console.log(`sync: parsed ${zips.length} documents (${zips.filter((z) => z.kind === "zip").length} ZIPs, ${zips.filter((z) => z.kind === "draft").length} drafts), ${failures.length} render failures, ${docsCacheHits} reused from render cache`);
    if (failures.length) {
        console.warn(`sync: failed: ${failures.join(", ")}`);
        if (!ALLOW_RENDER_FAILURES)
            throw new Error(`sync: ${failures.length} document(s) failed to render; nothing was written. Fix the renderer, or set SYNC_ALLOW_RENDER_FAILURES=1 to publish error stubs for them.`);
    }
    for (const [slug, html] of renderedHtml)
        fs.writeFileSync(path.join(RENDERED, `${slug}.html`), html);
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
    const ghHeaders: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "zips.dev-sync",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    async function gh<T>(url: string): Promise<T> {
        const res = await fetch(url, { headers: ghHeaders });
        if (!res.ok)
            throw new Error(`${res.status} ${res.statusText} for ${url}`);
        return res.json() as Promise<T>;
    }
    const prClaimIndex = new Map<number, Array<number | string>>();
    for (const z of zips) {
        for (const url of z.pullRequests) {
            const n = Number(url.match(/pull\/(\d+)/)?.[1]);
            if (n) {
                const refs = prClaimIndex.get(n) ?? [];
                refs.push(z.number ?? z.slug);
                prClaimIndex.set(n, refs);
            }
        }
    }
    const ZIP_NUM_RE = /zip[\s_.-]?#?\s?(?:0*)(\d{1,4})\b/i;
    function mapPrToZips(pr: GithubPull, files: GithubFile[] | null): Array<number | string> {
        const hits = new Set<number | string>();
        for (const ref of prClaimIndex.get(pr.number) ?? [])
            hits.add(ref);
        const haystacks = [pr.title ?? "", pr.body ?? "", pr.head?.ref ?? ""];
        if (files) {
            for (const f of files) {
                const m = f.filename.match(/^(?:zips\/)?(zip-0*(\d{1,4})|draft-([a-z0-9-]+))\.(?:md|rst)$/i);
                if (m)
                    hits.add(m[2] !== undefined ? Number(m[2]) : `draft-${m[3]}`);
            }
        }
        for (const h of haystacks) {
            if (!h)
                continue;
            const zm = h.match(ZIP_NUM_RE);
            if (zm) {
                const n = Number(zm[1]);
                if (n > 0 && n < 10000 && zips.some((z) => z.number === n))
                    hits.add(n);
            }
            for (const d of zips.filter((z) => z.kind === "draft")) {
                if (h.toLowerCase().includes(d.slug.toLowerCase()))
                    hits.add(d.slug);
            }
        }
        return [...hits];
    }
    /* ZIP/draft document paths a PR must touch to be worth previewing. */
    const DOC_RE = /^(?:zips\/)?(zip-\d{4}|draft-[a-z0-9-]+)\.(md|rst)$/i;
    /* Fetch the primary repo's open PRs and shape them into snapshot entries,
     * mapped to ZIPs/drafts and matched against the Pull-Request header
     * claims. */
    async function fetchPrs(repo: string): Promise<PrEntry[]> {
        let page = 1;
        const all: GithubPull[] = [];
        for (; page <= 4; page++) {
            const chunk = await gh<GithubPull[]>(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=100&page=${page}`);
            all.push(...chunk);
            if (chunk.length < 100)
                break;
        }
        const canFetchFiles = Boolean(token);
        let filesFetched = 0;
        const out: PrEntry[] = [];
        for (const pr of all) {
            let files: GithubFile[] | null = null;
            const needsFiles = !canFetchFiles ? filesFetched < 12 : true;
            if (needsFiles) {
                try {
                    files = await gh<GithubFile[]>(`https://api.github.com/repos/${repo}/pulls/${pr.number}/files?per_page=100`);
                    filesFetched++;
                }
                catch {
                    files = null;
                }
            }
            const refs = mapPrToZips(pr, files);
            const small = !files || (files.length <= 20 && files.every((f) => (f.patch ?? "").length < 400000));
            out.push({
                repo,
                source: null,
                number: pr.number,
                title: pr.title,
                author: pr.user?.login ?? null,
                createdAt: pr.created_at,
                updatedAt: pr.updated_at,
                url: pr.html_url,
                diffUrl: pr.diff_url,
                headRef: pr.head?.ref ?? "",
                headRepo: pr.head?.repo?.full_name ?? null,
                headSha: pr.head?.sha ?? null,
                additions: pr.additions ?? 0,
                deletions: pr.deletions ?? 0,
                changedFiles: pr.changed_files ?? 0,
                bodyExcerpt: stripTags(String(pr.body ?? "")).slice(0, 300),
                zipRefs: refs.filter((r): r is number => typeof r === "number"),
                draftRefs: refs.filter((r): r is string => typeof r === "string"),
                mapped: refs.length > 0,
                claimed: prClaimIndex.has(pr.number),
                files: small && files ? files.map((f) => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions, patch: f.patch ?? null })) : [],
                filesTruncated: !small,
                previews: [],
                preview: null,
            });
        }
        out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
        return out;
    }
    /* Fetch one watched external PR (per-PR curation, no listing). Not mapped
     * to ZIPs — it documents another repository's documents and is rendered
     * in its own /external/<id>/<number>/ namespace. */
    async function fetchWatchedPr(repo: string, number: number, source: WatchedPull): Promise<PrEntry> {
        const pr = await gh<GithubPull>(`https://api.github.com/repos/${repo}/pulls/${number}`);
        let files: GithubFile[] | null = null;
        try {
            files = await gh<GithubFile[]>(`https://api.github.com/repos/${repo}/pulls/${number}/files?per_page=100`);
        }
        catch {
            files = null;
        }
        const small = !files || (files.length <= 20 && files.every((f) => (f.patch ?? "").length < 400000));
        return {
            repo,
            source: source.id,
            number: pr.number,
            title: pr.title,
            author: pr.user?.login ?? null,
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            url: pr.html_url,
            diffUrl: pr.diff_url,
            headRef: pr.head?.ref ?? "",
            headRepo: pr.head?.repo?.full_name ?? null,
            headSha: pr.head?.sha ?? null,
            additions: pr.additions ?? 0,
            deletions: pr.deletions ?? 0,
            changedFiles: pr.changed_files ?? 0,
            bodyExcerpt: stripTags(String(pr.body ?? "")).slice(0, 300),
            zipRefs: [],
            draftRefs: [],
            mapped: false,
            claimed: false,
            files: small && files ? files.map((f) => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions, patch: f.patch ?? null })) : [],
            filesTruncated: !small,
            previews: [],
            preview: null,
        };
    }
    let prs: PrEntry[] = [];
    let prError: string | null = null;
    try {
        prs = await fetchPrs(REPO);
        console.log(`sync: fetched ${prs.length} open PRs`);
        const mappedCount = prs.filter((p) => p.mapped).length;
        console.log(`sync: mapped ${mappedCount}/${prs.length} PRs to ZIPs`);
    }
    catch (e) {
        prError = errMessage(e);
        console.warn(`sync: PR fetch failed (${prError})`);
        const prevPath = path.join(CONTENT, "prs.json");
        try {
            const prev = JSON.parse(fs.readFileSync(prevPath, "utf8")) as { syncedAt: string; error?: string | null; prs?: PrEntry[] };
            const ageH = (Date.now() - new Date(prev.syncedAt).getTime()) / 36e5;
            if (!prev.error && Array.isArray(prev.prs) && ageH < 24) {
                prs = prev.prs;
                prError = null;
                console.warn(`sync: reusing cached PR snapshot from ${prev.syncedAt} (${prs.length} PRs)`);
            }
        }
        catch {
        }
    }
    /* Watched external PRs, one fetch per configured entry. A failure reuses
     * that PR's previous snapshot for 24h, mirroring the primary-repo cache
     * behavior; group-level errors surface on the source's pages. */
    interface ExternalSnapshot {
        syncedAt?: string;
        prs?: PrEntry[];
    }
    const externalPrev = readJsonSafe<ExternalSnapshot>(path.join(CONTENT, "external.json"));
    const externalPrevPrs = externalPrev?.prs;
    const prevByKey = new Map<string, PrEntry>((Array.isArray(externalPrevPrs) ? externalPrevPrs : []).map((p): [string, PrEntry] => [`${p.repo}#${p.number}`, p]));
    const externalSources: ExternalSource[] = [];
    const externalPrs: PrEntry[] = [];
    {
        const groups = new Map<string, ExternalSource>();
        const ageH = externalPrev?.syncedAt ? (Date.now() - new Date(externalPrev.syncedAt).getTime()) / 36e5 : Infinity;
        for (const entry of watchedPulls) {
            const key = `${entry.repo}#${entry.number}`;
            let pr: PrEntry | null = null;
            let error: string | null = null;
            try {
                pr = await fetchWatchedPr(entry.repo, entry.number, entry);
                console.log(`sync: fetched ${key}`);
            }
            catch (e) {
                error = errMessage(e);
                console.warn(`sync: ${key} fetch failed (${error})`);
                const prev = prevByKey.get(key);
                if (prev && ageH < 24) {
                    pr = prev;
                    console.warn(`sync: reusing cached snapshot for ${key}`);
                }
                else {
                    console.warn(`sync: no usable cached snapshot for ${key} — skipping`);
                }
            }
            if (pr)
                externalPrs.push(pr);
            if (!groups.has(entry.id))
                groups.set(entry.id, { id: entry.id, repo: entry.repo, label: entry.label, note: entry.note ?? null, error });
            else if (error) {
                const group = groups.get(entry.id);
                if (group)
                    group.error = error;
            }
        }
        externalSources.push(...groups.values());
    }
    const externalDoc = { syncedAt, sources: externalSources, prs: externalPrs };
    const docSlug = (filename: string): string => filename.replace(/^.*\//, "").replace(/\.(md|rst)$/i, "");
    let previews = 0;
    let previewPrs = 0;
    /* Phase 1 — resolve which documents each previewable PR changes, and from
     * where. Sequential and cheap: a handful of API/patch/git calls per PR. */
    const previewJobs: PreviewJob[] = [];
    for (const pr of [...prs, ...externalPrs]) {
        // Primary PRs need a ZIP/draft mapping to be worth previewing;
        // external-source PRs are always previewed (curated list, few).
        if (!pr.source && !pr.mapped && !pr.claimed)
            continue;
        const fileKey = pr.source ? `${pr.source}-${pr.number}` : String(pr.number);
        try {
            let docFiles: PreviewFile[] = pr.files.filter((f) => DOC_RE.test(f.filename) && f.status !== "removed");
            let headSha: string | null = pr.headSha;
            if ((docFiles.length === 0 || !headSha) && (pr.files.length === 0 || !headSha)) {
                const patchRes = await fetch(`https://github.com/${pr.repo}/pull/${pr.number}.patch`, {
                    headers: { "User-Agent": "zips.dev-sync" },
                    redirect: "follow",
                });
                if (!patchRes.ok)
                    throw new Error(`patch ${patchRes.status}`);
                const patchText = await patchRes.text();
                if (patchText.length < 4000000) {
                    const shas = [...patchText.matchAll(/^From ([0-9a-f]{40})/gm)].map((m) => m[1]);
                    if (shas.length)
                        headSha = headSha ?? shas[shas.length - 1];
                    const names = [...patchText.matchAll(/^diff --git a\/(\S+) b\/(\S+)$/gm)].map((m) => m[2]);
                    const patchDocs = names.filter((f) => DOC_RE.test(f));
                    if (patchDocs.length > 0 && docFiles.length === 0) {
                        const sections = patchText.split(/^(?=diff --git )/m);
                        const perFilePatch = (filename: string): string => sections.find((s) => s.match(/^diff --git a\/\S+ b\/(\S+)$/m)?.[1] === filename) ?? patchText.slice(0, 400000);
                        docFiles = patchDocs.map((filename) => ({ filename, status: "modified", additions: 0, deletions: 0, patch: null }));
                        if (pr.files.length === 0)
                            pr.files = docFiles.map((f) => ({ ...f, patch: perFilePatch(f.filename).slice(0, 400000) }));
                    }
                }
            }
            if (docFiles.length === 0)
                continue;
            let pullHeadSha: string | null = null;
            const state: PreviewState = {
                headSha,
                // The vendor clone only knows the primary repo; an external PR
                // must be fetchable from raw.githubusercontent.com instead.
                getPullHead: async () => {
                    if (pullHeadSha)
                        return pullHeadSha;
                    const fr = spawnSync("git", ["-C", VENDOR, "fetch", "--depth", "1", "origin", `pull/${pr.number}/head`], {
                        encoding: "utf8",
                    });
                    if (fr.status !== 0)
                        throw new Error(`git fetch failed: ${fr.stderr.slice(0, 80)}`);
                    pullHeadSha = spawnSync("git", ["-C", VENDOR, "rev-parse", "FETCH_HEAD"], { encoding: "utf8" }).stdout.trim();
                    return pullHeadSha;
                },
            };
            for (const docFile of docFiles)
                previewJobs.push({ idx: previewJobs.length, pr, fileKey, docFile, state });
        }
        catch (e) {
            console.warn(`sync: preview failed for PR ${pr.number}: ${errMessage(e).slice(0, 100)}`);
        }
    }
    /* Phase 2 — fetch and render preview documents in parallel, skipping any
     * whose (repo, head sha, file) identity already has rendered HTML. */
    let previewCacheHits = 0;
    const renderPreviewJob = async (job: PreviewJob): Promise<PreviewEntry> => {
        const { pr, fileKey, docFile, state } = job;
        const slug = docSlug(docFile.filename);
        const format: "md" | "rst" = /\.md$/i.test(docFile.filename) ? "md" : "rst";
        const cacheKey = `${pr.repo}:${state.headSha ?? "nocommit"}:${docFile.filename}`;
        const htmlPath = path.join(RENDERED, `pr-${fileKey}-${slug}.html`);
        const cached = prevPreviewCache[cacheKey];
        if (cached && fs.existsSync(htmlPath)) {
            const html = fs.readFileSync(htmlPath, "utf8");
            // Carry the entry forward so the cache keeps only live keys.
            previewCache[cacheKey] = cached;
            previewCacheHits++;
            return {
                filename: docFile.filename,
                slug,
                title: cached.title,
                status: cached.status,
                headings: extractHeadings(html),
                format,
            };
        }
        let raw: string | null = null;
        if (pr.headRepo && state.headSha) {
            const rawRes = await fetch(`https://raw.githubusercontent.com/${pr.headRepo}/${state.headSha}/${docFile.filename}`, { headers: { "User-Agent": "zips.dev-sync" } });
            if (rawRes.ok)
                raw = await rawRes.text();
        }
        if (raw === null) {
            if (pr.source)
                throw new Error("head content unavailable via raw.githubusercontent.com");
            const sha = await state.getPullHead();
            const show = spawnSync("git", ["-C", VENDOR, "show", `${sha}:${docFile.filename}`], {
                encoding: "utf8",
                maxBuffer: 8 * 1024 * 1024,
            });
            if (show.status !== 0)
                throw new Error(`git show failed: ${show.stderr.slice(0, 80)}`);
            raw = show.stdout;
            state.headSha = sha;
        }
        if (!raw)
            throw new Error("file content unavailable");
        if (raw.length > 1500000)
            throw new Error("too large");
        const { meta: hdr, body } = parseHeader(raw);
        const html0 = format === "md" ? await renderMd(body) : renderRst(body, `pr-${fileKey}-${slug}`);
        if (html0 === null)
            throw new Error("render failed");
        const html = injectHeadingAnchors(wrapMath(rewriteLinks(html0, assetNames)));
        const entry: PreviewEntry = {
            filename: docFile.filename,
            slug,
            title: one(hdr?.title ?? pr.title).trim(),
            status: normalizeStatus(hdr?.status, "Draft").status,
            headings: extractHeadings(html),
            format,
        };
        fs.writeFileSync(htmlPath, html);
        previewCache[cacheKey] = { title: entry.title, status: entry.status };
        return entry;
    };
    const results: Array<PreviewEntry | null> = new Array(previewJobs.length);
    let nextJob = 0;
    const CONCURRENCY = 8;
    const renderWorker = async (): Promise<void> => {
        while (nextJob < previewJobs.length) {
            const job = previewJobs[nextJob++];
            results[job.idx] = await renderPreviewJob(job).catch((e) => {
                console.warn(`sync: preview failed for PR ${job.pr.number} ${job.docFile.filename}: ${errMessage(e).slice(0, 100)}`);
                return null;
            });
        }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, previewJobs.length) }, renderWorker));
    const byPr = new Map<PrEntry, { rendered: PreviewEntry[]; state: PreviewState }>();
    for (const job of previewJobs) {
        const entry = results[job.idx];
        if (!entry)
            continue;
        const acc = byPr.get(job.pr) ?? { rendered: [], state: job.state };
        acc.rendered.push(entry);
        byPr.set(job.pr, acc);
    }
    for (const [pr, { rendered, state }] of byPr) {
        pr.previews = rendered;
        pr.preview = rendered[0] ?? null;
        pr.headSha = state.headSha;
        previews += rendered.length;
        previewPrs++;
    }
    console.log(`sync: rendered ${previews} previews for ${previewPrs} PRs (${previewCacheHits} reused, ${previewJobs.length - previewCacheHits} rendered, concurrency ${Math.min(CONCURRENCY, previewJobs.length)})`);
    // Retire the single-document pr-<number>.html outputs. Skipped when the PR
    // snapshot was reused from cache, so a stale snapshot keeps readable files.
    if (!prError) {
        let removedLegacy = 0;
        for (const f of fs.readdirSync(RENDERED)) {
            if (/^pr-\d+\.html$/.test(f)) {
                fs.unlinkSync(path.join(RENDERED, f));
                removedLegacy++;
            }
        }
        if (removedLegacy)
            console.log(`sync: removed ${removedLegacy} legacy pr-<number>.html previews`);
    }
    const publicZip = (z: ZipDoc): Omit<ZipDoc, "headings"> => {
        const { headings, ...rest } = z;
        return rest;
    };
    const meta = { repo: REPO, commit, commitShort, commitUrl: `${COMMIT_BASE}/commit/${commit}`, syncedAt };
    fs.writeFileSync(path.join(CONTENT, "zips.json"), JSON.stringify({ ...meta, zips }, null, 1));
    fs.writeFileSync(path.join(CONTENT, "meta.json"), JSON.stringify(meta, null, 2));
    fs.writeFileSync(path.join(CONTENT, "prs.json"), JSON.stringify({ ...meta, error: prError, prs }));
    fs.writeFileSync(path.join(CONTENT, "external.json"), JSON.stringify(externalDoc));
    fs.writeFileSync(renderCachePath, JSON.stringify({ version: RENDER_CACHE_VERSION, docs: docsCache, previews: previewCache }));
    fs.writeFileSync(path.join(PUBLIC_API, "zips.json"), JSON.stringify({ ...meta, zips: zips.map(publicZip) }));
    for (const z of zips) {
        const zipNumber = z.number;
        if (zipNumber === null)
            continue;
        fs.writeFileSync(path.join(PUBLIC_API, "zips", `${zipNumber}.json`), JSON.stringify({
            ...publicZip(z),
            crossReferences: crossrefFor(z.slug),
            implementations: implsYaml.implementations
                ?.filter((impl) => impl.zips?.includes(zipNumber))
                .map((impl) => impl.name),
            upgrades: (upgradesYaml.upgrades ?? [])
                .filter((u) => (u.zips ?? []).includes(zipNumber))
                .map((u) => u.id),
        }));
    }
    fs.writeFileSync(path.join(PUBLIC_API, "prs.json"), JSON.stringify({ ...meta, error: prError, prs }));
    fs.writeFileSync(path.join(PUBLIC_API, "external.json"), JSON.stringify(externalDoc));
    fs.writeFileSync(path.join(PUBLIC_API, "meta.json"), JSON.stringify(meta));
    fs.writeFileSync(path.join(PUBLIC_API, "upgrades.json"), JSON.stringify({ ...meta, upgrades: upgradesYaml.upgrades ?? [] }));
    console.log("sync: wrote content/ + public/api/ snapshots");
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
