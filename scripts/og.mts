// Renders the link-preview cards: one 1200x630 PNG per section plus one per
// page of the stable corpus (every zip, draft, upgrade, external source,
// currently-open PR — with its real title), plus the apple-touch-icon.
//
// Pure node: satori draws the card, resvg rasterizes it. Runs at deploy time
// as part of `pnpm build`; nothing lands in git.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ogDir = join(root, "public", "og");
mkdirSync(ogDir, { recursive: true });

const W = 1200;
const H = 630;

const fontFile = (pkg: string, weight: number): Buffer =>
    readFileSync(join(root, "node_modules", "@fontsource", pkg, "files", `${pkg}-latin-${weight}-normal.woff`));
const fonts: Array<{
    name: string;
    data: Buffer;
    weight: 400 | 500 | 600;
    style: "normal";
}> = [
    { name: "Plex Sans", data: fontFile("ibm-plex-sans", 400), weight: 400, style: "normal" },
    { name: "Plex Sans", data: fontFile("ibm-plex-sans", 600), weight: 600, style: "normal" },
    { name: "Plex Mono", data: fontFile("ibm-plex-mono", 500), weight: 500, style: "normal" },
    { name: "Plex Serif", data: fontFile("ibm-plex-serif", 600), weight: 600, style: "normal" },
];

// satori takes an element tree, not HTML
const el = (type: string, style: CSSProperties, children?: ReactNode): ReactElement => ({
    type,
    props: { style, children },
    key: null,
});

// paper tooth: feTurbulence rasterized once, shared by every card
const grainSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.9" intercept="-0.45"/><feFuncG type="linear" slope="1.9" intercept="-0.45"/><feFuncB type="linear" slope="1.9" intercept="-0.45"/></feComponentTransfer></filter><rect width="${W}" height="${H}" filter="url(#n)"/></svg>`;
const grain = `url(data:image/png;base64,${Buffer.from(new Resvg(grainSvg).render().asPng()).toString("base64")})`;

const layer = (backgroundImage: string): ReactElement =>
    el("div", { position: "absolute", top: 0, left: 0, width: W, height: H, backgroundImage });

interface CardCopy {
    tag: string;
    title: string;
    line: string;
}

const card = ({ tag, title, line }: CardCopy): ReactElement =>
    el("div", { width: W, height: H, display: "flex", flexDirection: "column", padding: "64px 72px", backgroundColor: "#f6f8fa", overflow: "hidden" }, [
        // a glass sheet on a lit desk: specular band sweeping diagonally, key
        // light upper left, brand bounce lower right, shade at the bottom edge
        layer("linear-gradient(112deg, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, 0.6) 45%, rgba(255, 255, 255, 0.12) 57%, rgba(255, 255, 255, 0) 70%)"),
        layer("radial-gradient(1100px 700px at 144px -63px, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0) 60%)"),
        layer("radial-gradient(900px 620px at 1104px 680px, rgba(0, 80, 193, 0.1), rgba(0, 80, 193, 0) 60%)"),
        layer("linear-gradient(180deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0) 35%, rgba(13, 17, 23, 0.05) 100%)"),
        el("div", { position: "absolute", top: 0, left: 0, width: W, height: H, backgroundImage: grain }),
        el("header", { position: "relative", display: "flex", alignItems: "center", gap: 24 }, [
            el("div", { width: 64, height: 64, borderRadius: 14, backgroundColor: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "2px 2px 2px rgba(13, 17, 23, 0.14), 5px 10px 20px rgba(13, 17, 23, 0.1)" }, el("div", { color: "#4493f8", fontFamily: "Plex Mono", fontWeight: 500, fontSize: 34, lineHeight: 1 }, "z")),
            el("div", { fontFamily: "Plex Mono", fontWeight: 500, fontSize: 30, lineHeight: 1, color: "#1f2328" }, "zipreader"),
        ]),
        el("section", { position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 930 }, [
            el("div", { width: 56, height: 5, marginBottom: 28, borderRadius: 3, backgroundColor: "#0050c1" }),
            ...(tag ? [el("div", { marginBottom: 24, fontFamily: "Plex Mono", fontWeight: 500, fontSize: 27, lineHeight: 1, color: "#0050c1" }, tag)] : []),
            el("h1", { margin: 0, fontFamily: "Plex Serif", fontWeight: 600, fontSize: 92, lineHeight: 1.08, letterSpacing: "-0.025em", color: "#1f2328" }, title),
            ...(line ? [el("p", { margin: "32px 0 0", maxWidth: 780, fontFamily: "Plex Sans", fontWeight: 400, fontSize: 31, lineHeight: 1.4, color: "#586069" }, line)] : []),
        ]),
    ]);

// card copy hygiene: collapse whitespace, turn dash separators into commas,
// strip markdown artifacts (links, headings, emphasis, LaTeX escapes).
// Upstream prose arrives messy.
const clean = (s: string): string => (s ?? "")
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
const fit = (text: string, max = 40): string => {
    if (!text || text.length <= max + 4) return text;
    const cut = text.slice(0, max);
    return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 20)).trimEnd()}…`;
};

const readJson = <T,>(rel: string): T => JSON.parse(readFileSync(join(root, rel), "utf8")) as T;

interface ZipEntry {
    slug: string;
    number: number | null;
    displayNumber: string;
    kind: "zip" | "draft";
    title: string;
    abstract: string;
    category: string;
    status: string;
}
const { zips = [] } = readJson<{ zips?: ZipEntry[] }>("public/api/zips.json");
const prs = readJson<{ prs?: Array<{ number: number; title: string; author: string | null; bodyExcerpt: string }> | null }>("public/api/prs.json");
const upgrades = readJson<{ upgrades?: Array<{ id: string; name: string; summary?: string }> }>("public/api/upgrades.json").upgrades ?? [];
const external = readJson<{ sources?: Array<{ id: string; label: string; note?: string | null }> }>("public/api/external.json");

// until the next sync lands abstracts in zips.json, the rendered documents
// carry them: first paragraph after the Abstract heading
const renderedAbstract = (slug: string): string => {
    try {
        const html = readFileSync(join(root, "content", "rendered", `${slug}.html`), "utf8");
        const heading = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g;
        let m: RegExpExecArray | null;
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

const sectionCards = readJson<Array<{ slug: string; headline: string; line: string }>>(join("scripts", "og-cards.json")).map((c) => ({
    name: c.slug,
    tag: "",
    title: c.headline,
    line: c.line,
}));

interface NamedCard extends CardCopy {
    name: string;
}
const cards: NamedCard[] = [
    ...sectionCards,
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

for (const c of cards) {
    c.tag = clean(c.tag);
    c.title = fit(clean(c.title), 36);
    c.line = fit(clean(c.line), 92);
}

for (const c of cards) {
    const svg = await satori(card(c), { width: W, height: H, fonts });
    writeFileSync(join(ogDir, `${c.name}.png`), new Resvg(svg, { fitTo: { mode: "width", value: W } }).render().asPng());
}
console.log("drew", `${cards.length} cards -> public/og/`);

// the touch icon: the app icon, drawn like the cards and rasterized
const iconSvg = await satori(
    el("div", { width: 180, height: 180, borderRadius: 39, backgroundColor: "#0d1117", display: "flex", alignItems: "center", justifyContent: "center" }, el("div", { color: "#4493f8", fontFamily: "Plex Mono", fontWeight: 500, fontSize: 96, lineHeight: 1 }, "z")),
    { width: 180, height: 180, fonts },
);
writeFileSync(join(root, "public", "apple-touch-icon.png"), new Resvg(iconSvg, { fitTo: { mode: "width", value: 180 } }).render().asPng());
console.log("drew public/apple-touch-icon.png");

// the preview page cache-busts card images with this
writeFileSync(join(ogDir, "version.txt"), String(Date.now()));
