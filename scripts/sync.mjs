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
const git = (args) => spawnSync("git", ["-C", VENDOR, ...args], { encoding: "utf8" }).stdout.trim();
function decodeEntities(s) {
    return s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, " ");
}
function stripTags(s) {
    return decodeEntities(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}
function parseHeader(source) {
    const lines = source.replace(/\r\n/g, "\n").split("\n");
    let i = 0;
    while (i < lines.length && lines[i].trim() === "")
        i++;
    if (lines[i] !== undefined && lines[i].trim() === "::")
        i++;
    while (i < lines.length && lines[i].trim() === "")
        i++;
    const keyRe = /^(\s+)([A-Za-z][A-Za-z0-9-]*):(?:\s(.*))?$/;
    const first = lines[i]?.match(keyRe);
    if (!first)
        return { meta: null, body: source };
    const baseIndent = first[1].length;
    const scalars = {};
    const lists = {};
    const multi = {};
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
    const meta = { ...scalars };
    for (const [k, v] of Object.entries(multi)) {
        meta[k] = v.length === 1 ? v[0] : v;
    }
    return { meta, body };
}
function parseAuthors(v) {
    if (!v)
        return [];
    return (Array.isArray(v) ? v : String(v).split(/\n/)).map((s) => s.trim()).filter(Boolean);
}
function extractHeadings(html) {
    const out = [];
    const clean = html.replace(/<a class="hanchor"[\s\S]*?<\/a>/g, "");
    const re = /<h([1-4])((?:[^>"]|"[^"]*")*)\bid="([^"]+)"([^>]*)>([\s\S]*?)<\/h\1>/g;
    let m;
    while ((m = re.exec(clean))) {
        out.push({ level: Number(m[1]), id: m[3], text: stripTags(m[5]) });
    }
    return out;
}
function wrapMath(html) {
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
function injectHeadingAnchors(html) {
    return html.replace(/<h([1-4])((?:[^>"]|"[^"]*")*\bid="([^"]+)"(?:[^>"]|"[^"]*")*)>/g, (full, level, attrs, id) => `<h${level}${attrs}><a class="hanchor" href="#${id}" aria-hidden="true" tabindex="-1">#</a>`);
}
function rewriteLinks(html, assets) {
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
function wordCount(html) {
    const text = stripTags(html);
    return text ? text.split(/\s+/).length : 0;
}
const commit = git(["rev-parse", "HEAD"]);
const commitShort = commit.slice(0, 10);
const syncedAt = new Date().toISOString();
console.log(`sync: upstream ${REPO} @ ${commitShort}`);
const loadYaml = (p) => yaml.load(fs.readFileSync(path.join(ROOT, "data", p), "utf8")) ?? {};
const upgradesYaml = loadYaml("upgrades.yaml");
const implsYaml = loadYaml("implementations.yaml");
const crossrefsYaml = loadYaml("crossrefs.yaml");
const crossrefFor = (slug) => crossrefsYaml.zips?.[slug] ?? crossrefsYaml.zips?.[String(Number((slug.match(/(\d+)/) || [])[1] || ""))] ?? null;
function mathToHast(node) {
    const tex = String(node.value ?? "");
    try {
        return fromHtml(temml.renderToString(tex, { displayMode: node.type === "math" }), {
            fragment: true,
        }).children[0];
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
function rehypeHeadingAnchorLabels() {
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
function splitTightDeflist(node) {
    for (let ci = 0; ci < node.children.length; ci++) {
        const child = node.children[ci];
        if (child.type !== "text")
            continue;
        const m = child.value.match(/\n(?=:\s+\S)/);
        if (!m)
            continue;
        const before = child.value.slice(0, m.index);
        const after = child.value.slice(m.index + 1).replace(/^:\s+/, "");
        if (ci === 0 && !before.trim())
            continue;
        const term = {
            type: "definitionTerm",
            children: [
                ...node.children.slice(0, ci),
                { type: "text", value: before.replace(/\n$/, "") },
            ].filter((c) => c.type !== "text" || c.value !== ""),
        };
        const desc = {
            type: "definitionDescription",
            children: [
                { type: "text", value: after },
                ...node.children.slice(ci + 1),
            ],
        };
        return [term, desc];
    }
    return null;
}
function remarkZipDeflists() {
    return (tree) => {
        const out = [];
        for (const node of tree.children) {
            const first = node.type === "paragraph" ? node.children[0] : null;
            if (first?.type === "text" &&
                /^:\s+\S/.test(first.value) &&
                out.length > 0 &&
                out[out.length - 1].type === "paragraph") {
                first.value = first.value.replace(/^:\s+/, "");
                out.push({ type: "definitionTerm", children: out.pop().children }, { type: "definitionDescription", children: node.children });
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
        const wrapped = [];
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
async function renderMd(body) {
    const file = await mdProcessor.process(normalizeMathFences(body));
    return String(file);
}
function normalizeMathFences(md) {
    const lines = md.split("\n");
    const out = [];
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
function preprocessRstMath(body) {
    return body.replace(/\$([^$\n]{1,120}?)\$/g, (full, inner) => {
        if (!/[\^_\\{}]/.test(inner) && !MATHISH.test(inner))
            return full;
        return ":math:`" + inner + "`";
    });
}
function renderRst(body, slug) {
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
const assetNames = new Set();
for (const f of fs.readdirSync(ZIPS_DIR)) {
    if (!/\.(md|rst)$/i.test(f)) {
        fs.copyFileSync(path.join(ZIPS_DIR, f), path.join(UPSTREAM_ASSETS, f));
        assetNames.add(f);
    }
}
/** Fail fast when the RST renderer is unusable, before anything is written.
 *  Without this, a machine without docutils turns every RST ZIP into an error
 *  stub and overwrites the committed snapshots. */
function preflightRst() {
    const res = spawnSync("python3", ["-c", "import docutils, sys; print(docutils.__version__)"], { encoding: "utf8" });
    if (res.status !== 0) {
        throw new Error(`sync: the RST renderer is unavailable (python3 with docutils is required; run \`pip install docutils\`). ${(res.stderr || res.error?.message || "").trim().slice(0, 200)}`);
    }
    console.log(`sync: docutils ${res.stdout.trim()}`);
}
/** Set SYNC_ALLOW_RENDER_FAILURES=1 to keep going when individual documents
 *  fail to render; they are then published as error stubs linking upstream. */
const ALLOW_RENDER_FAILURES = process.env.SYNC_ALLOW_RENDER_FAILURES === "1";
async function main() {
    preflightRst();
    const zips = [];
    const failures = [];
    const renderedHtml = new Map();
    for (const filename of files) {
        const slug = filename.replace(/\.(md|rst)$/i, "");
        const format = /\.md$/i.test(filename) ? "md" : "rst";
        const raw = fs.readFileSync(path.join(ZIPS_DIR, filename), "utf8");
        const { meta: hdr, body } = parseHeader(raw);
        const numberMatch = String(hdr?.zip ?? "").match(/^\d+$/);
        const number = numberMatch ? parseInt(String(hdr.zip), 10) : null;
        const revMatch = String(hdr?.status ?? "").match(/\[Revision\s+(\d+)\]\s*(.+)/i);
        const revision = revMatch ? Number(revMatch[1]) : null;
        const status = revMatch ? revMatch[2].trim() : (hdr?.status ?? "Unknown").trim();
        const html0 = await (format === "md" ? renderMd(body) : Promise.resolve(renderRst(body, slug)));
        const html = html0 === null ? `<p class="render-error">This document could not be rendered (RST conversion failed). <a href="https://github.com/${REPO}/blob/${commit}/zips/${filename}">Read the source on GitHub.</a></p>` : injectHeadingAnchors(wrapMath(rewriteLinks(html0, assetNames)));
        if (html0 === null)
            failures.push(filename);
        const pullRequests = []
            .concat(Array.isArray(hdr?.pull_request) ? hdr.pull_request : hdr?.pull_request ? [hdr.pull_request] : [])
            .map((s) => {
            const m = String(s).match(/github\.com\/[\w.-]+\/[\w.-]+\/pull\/(\d+)/);
            return m ? `https://github.com/${REPO}/pull/${m[1]}` : null;
        })
            .filter(Boolean);
        zips.push({
            slug,
            number,
            displayNumber: number === null ? "???" : String(number),
            kind: number === null ? "draft" : "zip",
            filename,
            format,
            title: (hdr?.title ?? slug).trim(),
            status,
            revision,
            owners: parseAuthors(hdr?.owners),
            credits: parseAuthors(hdr?.credits),
            originalAuthors: parseAuthors(hdr?.original_authors),
            category: (hdr?.category ?? "Unknown").trim(),
            created: /^\d{4}-\d{2}-\d{2}$/.test(String(hdr?.created ?? "")) ? hdr.created : null,
            license: (hdr?.license ?? "Unknown").trim(),
            discussionsTo: typeof hdr?.discussions_to === "string" ? hdr.discussions_to.replace(/[<>]/g, "").trim() : null,
            pullRequests,
            upstreamPath: `zips/${filename}`,
            upstreamUrl: `${COMMIT_BASE}/blob/${commit}/zips/${filename}`,
            headings: extractHeadings(html),
            wordCount: wordCount(html),
            rendered: html0 !== null,
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
    console.log(`sync: parsed ${zips.length} documents (${zips.filter((z) => z.kind === "zip").length} ZIPs, ${zips.filter((z) => z.kind === "draft").length} drafts), ${failures.length} render failures`);
    if (failures.length) {
        console.warn(`sync: failed: ${failures.join(", ")}`);
        if (!ALLOW_RENDER_FAILURES)
            throw new Error(`sync: ${failures.length} document(s) failed to render; nothing was written. Fix the renderer, or set SYNC_ALLOW_RENDER_FAILURES=1 to publish error stubs for them.`);
    }
    for (const [slug, html] of renderedHtml)
        fs.writeFileSync(path.join(RENDERED, `${slug}.html`), html);
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
    const ghHeaders = {
        Accept: "application/vnd.github+json",
        "User-Agent": "zips.dev-sync",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    async function gh(url) {
        const res = await fetch(url, { headers: ghHeaders });
        if (!res.ok)
            throw new Error(`${res.status} ${res.statusText} for ${url}`);
        return res.json();
    }
    const prClaimIndex = new Map();
    for (const z of zips) {
        for (const url of z.pullRequests) {
            const n = Number(url.match(/pull\/(\d+)/)?.[1]);
            if (n) {
                if (!prClaimIndex.has(n))
                    prClaimIndex.set(n, []);
                prClaimIndex.get(n).push(z.number ?? z.slug);
            }
        }
    }
    const ZIP_NUM_RE = /zip[\s_.-]?#?\s?(?:0*)(\d{1,4})\b/i;
    function mapPrToZips(pr, files) {
        const hits = new Set();
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
    let prs = [];
    let prError = null;
    try {
        let page = 1;
        const all = [];
        for (; page <= 4; page++) {
            const chunk = await gh(`https://api.github.com/repos/${REPO}/pulls?state=open&per_page=100&page=${page}`);
            all.push(...chunk);
            if (chunk.length < 100)
                break;
        }
        console.log(`sync: fetched ${all.length} open PRs`);
        const canFetchFiles = Boolean(token);
        let filesFetched = 0;
        for (const pr of all) {
            let files = null;
            const needsFiles = !canFetchFiles ? filesFetched < 12 : true;
            if (needsFiles) {
                try {
                    files = await gh(`https://api.github.com/repos/${REPO}/pulls/${pr.number}/files?per_page=100`);
                    filesFetched++;
                }
                catch {
                    files = null;
                }
            }
            const refs = mapPrToZips(pr, files);
            const small = !files || (files.length <= 20 && files.every((f) => (f.patch ?? "").length < 400000));
            prs.push({
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
                zipRefs: refs.filter((r) => typeof r === "number"),
                draftRefs: refs.filter((r) => typeof r === "string"),
                mapped: refs.length > 0,
                claimed: prClaimIndex.has(pr.number),
                files: small && files ? files.map((f) => ({ filename: f.filename, status: f.status, additions: f.additions, deletions: f.deletions, patch: f.patch ?? null })) : [],
                filesTruncated: !small,
                previews: [],
                preview: null,
            });
        }
        prs.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
        const mappedCount = prs.filter((p) => p.mapped).length;
        console.log(`sync: mapped ${mappedCount}/${prs.length} PRs to ZIPs (files fetched for ${filesFetched})`);
    }
    catch (e) {
        prError = String(e.message ?? e);
        console.warn(`sync: PR fetch failed (${prError})`);
        const prevPath = path.join(CONTENT, "prs.json");
        try {
            const prev = JSON.parse(fs.readFileSync(prevPath, "utf8"));
            const ageH = (Date.now() - new Date(prev.syncedAt)) / 36e5;
            if (!prev.error && Array.isArray(prev.prs) && ageH < 24) {
                prs = prev.prs;
                prError = null;
                console.warn(`sync: reusing cached PR snapshot from ${prev.syncedAt} (${prs.length} PRs)`);
            }
        }
        catch {
        }
    }
    const DOC_RE = /^(?:zips\/)?(zip-\d{4}|draft-[a-z0-9-]+)\.(md|rst)$/i;
    const docSlug = (filename) => filename.replace(/^.*\//, "").replace(/\.(md|rst)$/i, "");
    let previews = 0;
    let previewPrs = 0;
    for (const pr of prs) {
        if (!pr.mapped && !pr.claimed)
            continue;
        try {
            let docFiles = pr.files.filter((f) => DOC_RE.test(f.filename) && f.status !== "removed");
            let headSha = pr.headSha;
            if ((docFiles.length === 0 || !headSha) && (pr.files.length === 0 || !headSha)) {
                const patchRes = await fetch(`https://github.com/${REPO}/pull/${pr.number}.patch`, {
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
                        const perFilePatch = (filename) => sections.find((s) => s.match(/^diff --git a\/\S+ b\/(\S+)$/m)?.[1] === filename) ?? patchText.slice(0, 400000);
                        docFiles = patchDocs.map((filename) => ({ filename, status: "modified", additions: 0, deletions: 0, patch: null }));
                        if (pr.files.length === 0)
                            pr.files = docFiles.map((f) => ({ ...f, patch: perFilePatch(f.filename).slice(0, 400000) }));
                    }
                }
            }
            if (docFiles.length === 0)
                continue;
            let pullHeadSha = null;
            const fetchPullHead = async () => {
                if (pullHeadSha)
                    return pullHeadSha;
                const fr = spawnSync("git", ["-C", VENDOR, "fetch", "--depth", "1", "origin", `pull/${pr.number}/head`], {
                    encoding: "utf8",
                });
                if (fr.status !== 0)
                    throw new Error(`git fetch failed: ${fr.stderr.slice(0, 80)}`);
                pullHeadSha = spawnSync("git", ["-C", VENDOR, "rev-parse", "FETCH_HEAD"], { encoding: "utf8" }).stdout.trim();
                return pullHeadSha;
            };
            const rendered = [];
            for (const docFile of docFiles) {
                try {
                    let raw = null;
                    if (pr.headRepo && headSha) {
                        const rawRes = await fetch(`https://raw.githubusercontent.com/${pr.headRepo}/${headSha}/${docFile.filename}`, { headers: { "User-Agent": "zips.dev-sync" } });
                        if (rawRes.ok)
                            raw = await rawRes.text();
                    }
                    if (raw === null) {
                        const sha = await fetchPullHead();
                        const show = spawnSync("git", ["-C", VENDOR, "show", `${sha}:${docFile.filename}`], {
                            encoding: "utf8",
                            maxBuffer: 8 * 1024 * 1024,
                        });
                        if (show.status !== 0)
                            throw new Error(`git show failed: ${show.stderr.slice(0, 80)}`);
                        raw = show.stdout;
                        headSha = sha;
                    }
                    if (!raw)
                        throw new Error("file content unavailable");
                    if (raw.length > 1500000)
                        throw new Error("too large");
                    const { meta: hdr, body } = parseHeader(raw);
                    const format = /\.md$/i.test(docFile.filename) ? "md" : "rst";
                    const slug = docSlug(docFile.filename);
                    const html0 = format === "md" ? await renderMd(body) : renderRst(body, `pr-${pr.number}-${slug}`);
                    if (html0 === null)
                        throw new Error("render failed");
                    const html = injectHeadingAnchors(wrapMath(rewriteLinks(html0, assetNames)));
                    const revMatch = String(hdr?.status ?? "").match(/\[Revision\s+(\d+)\]\s*(.+)/i);
                    rendered.push({
                        filename: docFile.filename,
                        slug,
                        title: (hdr?.title ?? pr.title).trim(),
                        status: revMatch ? revMatch[2].trim() : (hdr?.status ?? "Draft").trim(),
                        headings: extractHeadings(html),
                        format,
                    });
                    fs.writeFileSync(path.join(RENDERED, `pr-${pr.number}-${slug}.html`), html);
                }
                catch (e) {
                    console.warn(`sync: preview failed for PR ${pr.number} ${docFile.filename}: ${String(e.message ?? e).slice(0, 100)}`);
                }
            }
            if (rendered.length === 0)
                continue;
            pr.previews = rendered;
            pr.preview = rendered[0] ?? null;
            pr.headSha = headSha;
            previews += rendered.length;
            previewPrs++;
        }
        catch (e) {
            console.warn(`sync: preview failed for PR ${pr.number}: ${String(e.message ?? e).slice(0, 100)}`);
        }
    }
    console.log(`sync: rendered ${previews} previews for ${previewPrs} PRs`);
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
    const publicZip = (z) => {
        const { headings, ...rest } = z;
        return rest;
    };
    const meta = { repo: REPO, commit, commitShort, commitUrl: `${COMMIT_BASE}/commit/${commit}`, syncedAt };
    fs.writeFileSync(path.join(CONTENT, "zips.json"), JSON.stringify({ ...meta, zips }, null, 1));
    fs.writeFileSync(path.join(CONTENT, "meta.json"), JSON.stringify(meta, null, 2));
    fs.writeFileSync(path.join(CONTENT, "prs.json"), JSON.stringify({ ...meta, error: prError, prs }));
    fs.writeFileSync(path.join(PUBLIC_API, "zips.json"), JSON.stringify({ ...meta, zips: zips.map(publicZip) }));
    for (const z of zips) {
        if (z.number === null)
            continue;
        fs.writeFileSync(path.join(PUBLIC_API, "zips", `${z.number}.json`), JSON.stringify({
            ...publicZip(z),
            crossReferences: crossrefFor(z.slug),
            implementations: implsYaml.implementations
                ?.filter((impl) => impl.zips?.includes(z.number))
                .map((impl) => impl.name),
            upgrades: (upgradesYaml.upgrades ?? [])
                .filter((u) => (u.zips ?? []).includes(z.number))
                .map((u) => u.id),
        }));
    }
    fs.writeFileSync(path.join(PUBLIC_API, "prs.json"), JSON.stringify({ ...meta, error: prError, prs }));
    fs.writeFileSync(path.join(PUBLIC_API, "meta.json"), JSON.stringify(meta));
    fs.writeFileSync(path.join(PUBLIC_API, "upgrades.json"), JSON.stringify({ ...meta, upgrades: upgradesYaml.upgrades ?? [] }));
    console.log("sync: wrote content/ + public/api/ snapshots");
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
