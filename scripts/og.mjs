// Draws the link-preview images: one 1200x630 PNG per route card in
// scripts/og-cards.json into public/og/, plus public/apple-touch-icon.png.
// Run after a change to the cards or the template: pnpm og. The images are
// checked in; og:preview then checks them the way the platforms do.
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fontsDir = join(root, "public", "og-fonts");
const ogDir = join(root, "public", "og");
const port = 4173;

const cards = JSON.parse(readFileSync(join(root, "scripts", "og-cards.json"), "utf8"));

// og.html loads the woff2 files over http; the site itself bundles them with
// @fontsource, so the copies are only for the draw and stay untracked.
mkdirSync(fontsDir, { recursive: true });
mkdirSync(ogDir, { recursive: true });
const fonts = [
    ["ibm-plex-sans", "400", "plex-sans-400.woff2"],
    ["ibm-plex-sans", "600", "plex-sans-600.woff2"],
    ["ibm-plex-mono", "500", "plex-mono-500.woff2"],
    ["ibm-plex-serif", "600", "plex-serif-600.woff2"],
];
for (const [pkg, weight, name] of fonts) {
    copyFileSync(
        join(root, "node_modules", "@fontsource", pkg, "files", `${pkg}-latin-${weight}-normal.woff2`),
        join(fontsDir, name),
    );
}

const mime = { ".html": "text/html", ".json": "application/json", ".woff2": "font/woff2", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
    const file = join(root, path === "/" ? "scripts/og.html" : path);
    try {
        const body = readFileSync(file);
        res.writeHead(200, { "content-type": mime[extname(file)] ?? "application/octet-stream" });
        res.end(body);
    } catch {
        res.writeHead(404);
        res.end("nope");
    }
});
await new Promise((done) => server.listen(port, "127.0.0.1", done));

// shot.cjs drives the local Brave; fall back to the usual Chromium installs.
const exe =
    process.env.OG_BROWSER ??
    [
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
    ].find((p) => existsSync(p));

const browser = await chromium.launch(exe ? { executablePath: exe, headless: true } : { headless: true });
const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
});

for (const m of cards) {
    await page.goto(`http://127.0.0.1:${port}/scripts/og.html?page=${m.slug}`, { waitUntil: "networkidle" });
    await page.waitForFunction("window.ready === true");
    await page.locator(".card").screenshot({ path: join(ogDir, `${m.slug}.png`) });
    console.log("drew", `public/og/${m.slug}.png`);
}

// doc cards: one per real page, with its actual title. Only the stable
// corpus gets one — every zip, draft, upgrade and external source. PRs are
// too numerous and churn every sync, so they share the section card.
const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), "utf8"));
const { zips = [] } = readJson("public/api/zips.json");
const prs = readJson("public/api/prs.json");
const upgrades = readJson("public/api/upgrades.json").upgrades ?? [];
const external = readJson("public/api/external.json");
// until the next sync lands abstracts in zips.json, the rendered documents
// carry them: first paragraph after the Abstract heading
const renderedAbstract = (slug) => {
    try {
        const html = readFileSync(join(root, "content", "rendered", `${slug}.html`), "utf8");
        const heading = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g;
        let m;
        let from = -1;
        while ((m = heading.exec(html))) {
            const text = m[1].replace(/<[^>]+>/g, "").replace(/#/g, "").trim();
            if (text.toLowerCase() === "abstract") {
                from = m.index + m[0].length;
                break;
            }
        }
        if (from < 0) return "";
        const p = html.slice(from).match(/<p[^>]*>([\s\S]*?)<\/p>/i);
        if (!p) return "";
        return p[1]
            .replace(/<[^>]+>/g, " ")
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
            .replace(/\s+/g, " ")
            .trim();
    } catch {
        return "";
    }
};

const docs = [
    ...zips
        .filter((z) => z.number !== null && z.kind === "zip")
        .map((z) => ({ name: z.slug, tag: `ZIP ${z.displayNumber ?? z.number}`, title: z.title, line: z.abstract || renderedAbstract(z.slug) || z.category || z.status || "" })),
    ...zips
        .filter((z) => z.kind === "draft")
        .map((z) => ({ name: z.slug, tag: "Draft", title: z.title, line: z.abstract || renderedAbstract(z.slug) || z.category || "" })),
    ...(prs?.prs ?? []).map((p) => ({ name: `pr-${p.number}`, tag: "Pull request", title: p.title, line: p.bodyExcerpt || `by ${p.author}` })),
    ...upgrades.map((u) => ({ name: `upgrade-${u.id}`, tag: "Upgrade", title: u.name, line: u.summary ?? "" })),
    ...(external?.sources ?? []).map((s) => ({ name: `external-${s.id}`, tag: "", title: s.label, line: s.note ?? "" })),
];

// card copy hygiene: collapse whitespace, turn dash separators into commas,
// strip markdown artifacts (links, headings, emphasis, LaTeX escapes).
// Upstream prose arrives messy.
const clean = (s) => (s ?? "")
    .replace(/\s+/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(^|\s)#{1,6}\s+/g, "$1")
    .replace(/\\/g, "")
    .replace(/\s*[—–]\s*/g, ", ")
    .replace(/ - /g, ", ")
    .replace(/[*_`]/g, "")
    .trim();

// one fixed headline size means long titles cut off at the same point on
// every card; cutting at a word boundary reads better than a mid-word clamp
const fit = (text, max = 40) => {
    if (!text || text.length <= max + 4) return text;
    const cut = text.slice(0, max);
    return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 20)).trimEnd()}…`;
};
for (const d of docs) {
    d.tag = clean(d.tag);
    d.title = fit(clean(d.title));
    d.line = clean(d.line);
}

const manifestPath = join(ogDir, "manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};
// the template's own content is part of every key, so a design change
// redraws all cards, not just those whose copy changed
const template = readFileSync(join(root, "scripts", "og.html"), "utf8");
const hash = createHash("sha1");
for (const d of docs) {
    const key = hash.copy().update(template).update(`${d.tag}|${d.title}|${d.line}`).digest("hex").slice(0, 12);
    if (manifest[d.name] === key) continue;
    const query = new URLSearchParams({ tag: d.tag, title: d.title, line: d.line }).toString();
    await page.goto(`http://127.0.0.1:${port}/scripts/og.html?page=doc&${query}`, { waitUntil: "networkidle" });
    await page.waitForFunction("window.ready === true");
    await page.locator(".card").screenshot({ path: join(ogDir, `${d.name}.png`) });
    manifest[d.name] = key;
    console.log("drew", `public/og/${d.name}.png`);
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

// drop cards for pages that no longer exist (closed PRs, removed drafts)
const docPattern = /^(zip-\d+|draft-|pr-\d+|upgrade-|external-)/;
for (const file of readdirSync(ogDir)) {
    if (file.endsWith(".png") && docPattern.test(file) && !manifest[file.replace(".png", "")]) {
        rmSync(join(ogDir, file));
        console.log("removed stale", `public/og/${file}`);
    }
}

// the touch icon: the app icon rasterized at 180x180
const icon = readFileSync(join(root, "src", "app", "icon.svg"));
await page.setContent(
    `<body style="margin:0"><img style="display:block" width="180" height="180" src="data:image/svg+xml;base64,${icon.toString("base64")}"></body>`,
);
await page.locator("img").screenshot({ path: join(root, "public", "apple-touch-icon.png") });
console.log("drew", "public/apple-touch-icon.png");

await browser.close();
server.close();
