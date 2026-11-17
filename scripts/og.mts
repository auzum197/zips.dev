// Renders the link-preview cards: one 1200x630 PNG per section plus one per
// page of the stable corpus (every zip, draft, upgrade, external source,
// currently-open PR — with its real title), plus the apple-touch-icon.
//
// The card is the zipreader project card of auzum197.com, full bleed: the
// index of ZIP numbers in their status colours fading out from the top right,
// a vignette from the bottom left, the page's title and line over it. A page
// that is about specific ZIPs lights those numbers and dims the rest.
//
// Pure node: satori draws the card, resvg rasterizes it. Runs at deploy time
// as part of `pnpm build`; nothing lands in git.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
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
    weight: 400 | 500 | 700;
    style: "normal";
}> = [
    { name: "Geist", data: fontFile("geist-sans", 400), weight: 400, style: "normal" },
    { name: "Geist Mono", data: fontFile("geist-mono", 400), weight: 400, style: "normal" },
    { name: "Geist Mono", data: fontFile("geist-mono", 700), weight: 700, style: "normal" },
    // the touch icon only
    { name: "Plex Mono", data: fontFile("ibm-plex-mono", 500), weight: 500, style: "normal" },
];

// satori takes an element tree, not HTML
const el = (type: string, style: CSSProperties, children?: ReactNode): ReactElement => ({
    type,
    props: { style, children },
    key: null,
});

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

// the palette of auzum197.com, in hex because satori does not read oklch
const INK = "#ebe7da";
const SURFACE = "#0c0c0b";
// zipreader's dark-theme status colours
const STATUS_COLOR: Record<string, string> = {
    Final: "#6de77e",
    Active: "#86d5ff",
    Proposed: "#e8baff",
    Draft: "#fbc24b",
    Reserved: "#6e6e6e",
    Obsolete: "#ffbab2",
    Withdrawn: "#ffbab2",
};
// a multi-revision status ("[Revision 0] Active, [Revision 1] ...") takes its first word
const statusColor = (status: string): string =>
    STATUS_COLOR[(status ?? "").match(/Final|Active|Proposed|Draft|Reserved|Obsolete|Withdrawn/)?.[0] ?? ""] ?? "#6e6e6e";

// the index: every numbered ZIP, 12 to a row, right-aligned in its cell.
// Each number's opacity follows an elliptical falloff from the top-right
// corner (full to 38% of the way, gone by 76%), which is the card's CSS mask
// worked out per number.
const COLS = 12;
const GRID = { top: 44, left: 48, width: W - 96, size: 31, pitch: 41 };
const CELL = GRID.width / COLS;
const index = zips
    .filter((z): z is ZipEntry & { number: number } => z.number !== null && z.kind === "zip")
    .sort((a, b) => a.number - b.number)
    .map((z, i, all) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const height = Math.ceil(all.length / COLS) * GRID.pitch - (GRID.pitch - GRID.size);
        const r = Math.hypot((GRID.width - ((col + 1) * CELL - 27)) / GRID.width, (row * GRID.pitch + GRID.size / 2) / height);
        return {
            number: z.number,
            color: statusColor(z.status),
            left: GRID.left + col * CELL,
            top: GRID.top + row * GRID.pitch,
            fade: Math.min(1, Math.max(0, (0.76 - r) / 0.38)),
        };
    })
    .filter((n) => n.fade > 0.01);

interface CardCopy {
    title: string;
    line: string;
    // the ZIPs this page is about; empty leaves the whole index in colour
    lit: number[];
}

// The card is drawn as two layers, and the vignette goes between them in
// compose() below: the index under it, the copy over it.
const indexLayer = ({ lit }: CardCopy): ReactElement => {
    // a spotlight only counts if the number is in the visible part of the index
    const spot = index.some((n) => lit.includes(n.number));
    return el("div", { width: W, height: H, display: "flex", backgroundColor: SURFACE, overflow: "hidden" },
        index.map((n) => {
            const on = spot && lit.includes(n.number);
            return el("div", {
                position: "absolute", top: n.top, left: n.left, width: CELL, display: "flex", justifyContent: "flex-end",
                fontFamily: "Geist Mono", fontWeight: on ? 700 : 400, fontSize: GRID.size, lineHeight: 1,
                color: n.color, opacity: n.fade * (on ? 1 : spot ? 0.32 : 0.95),
                ...(on ? { textShadow: `0 0 10px ${n.color}47` } : {}),
            }, String(n.number));
        }));
};
const copyLayer = ({ title, line }: CardCopy): ReactElement =>
    el("div", { width: W, height: H, display: "flex" }, [
        el("section", { position: "absolute", left: 72, bottom: 68, width: 940, display: "flex", flexDirection: "column" }, [
            el("h1", { margin: 0, fontFamily: "Geist", fontWeight: 400, fontSize: 66, lineHeight: 1.06, letterSpacing: "-0.015em", color: INK, lineClamp: 2 }, title),
            ...(line ? [el("p", { margin: "22px 0 0", maxWidth: 900, fontFamily: "Geist Mono", fontWeight: 400, fontSize: 27, lineHeight: 1.35, color: "rgba(235, 231, 218, 0.72)", lineClamp: 2 }, line)] : []),
        ]),
    ]);

// The vignette of the site's cards: dark from the bottom left, under the copy.
// In CSS: radial-gradient(1440px 945px at 0px 630px, #080808 0%,
// rgba(8,8,8,.88) 28%, rgba(8,8,8,.45) 48%, rgba(8,8,8,0) 68%).
//
// It is worked out here, per pixel, and not left to the rasterizer: it crosses
// the card on four grey levels (#080808 to #0c0c0b), and at 8 bits those show
// as rings. Here the blend stays fractional and is dithered down to 8 bits, so
// the steps break up into noise too fine to see.
const VIGNETTE = { rx: 1440, ry: 945, level: 8, stops: [[0, 1], [0.28, 0.88], [0.48, 0.45], [0.68, 0]] };
const vignetteAlpha = new Float32Array(W * H);
// one threshold per pixel, in [0, 1): interleaved gradient noise. It is fixed,
// so a card renders to the same bytes every time.
const threshold = new Float32Array(W * H);
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const t = Math.hypot((x + 0.5) / VIGNETTE.rx, (H - y - 0.5) / VIGNETTE.ry);
        const i = VIGNETTE.stops.findIndex(([stop]) => t < stop);
        if (i > 0) {
            const [t0, a0] = VIGNETTE.stops[i - 1], [t1, a1] = VIGNETTE.stops[i];
            vignetteAlpha[y * W + x] = a0 + ((a1 - a0) * (t - t0)) / (t1 - t0);
        }
        threshold[y * W + x] = (52.9829189 * ((0.06711056 * x + 0.00583715 * y) % 1)) % 1;
    }
}

const rasterize = async (layer: ReactElement): Promise<Buffer> =>
    new Resvg(await satori(layer, { width: W, height: H, fonts }), { fitTo: { mode: "width", value: W } }).render().pixels;

// index, then vignette, then copy; returns RGB rows
const compose = (under: Buffer, over: Buffer): Buffer => {
    const out = Buffer.alloc(W * H * 3);
    for (let p = 0; p < W * H; p++) {
        const a = vignetteAlpha[p];
        const cover = over[p * 4 + 3] / 255;
        for (let ch = 0; ch < 3; ch++) {
            const dimmed = under[p * 4 + ch] * (1 - a) + VIGNETTE.level * a;
            // resvg hands out premultiplied pixels
            const v = over[p * 4 + ch] + dimmed * (1 - cover);
            out[p * 3 + ch] = Math.min(255, Math.floor(v + threshold[p]));
        }
    }
    return out;
};

// a minimal PNG writer for 8-bit RGB
const CRC = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
});
const chunk = (type: string, data: Buffer): Buffer => {
    const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
    let c = 0xffffffff;
    for (const b of body) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
    const frame = Buffer.alloc(body.length + 8);
    frame.writeUInt32BE(data.length, 0);
    body.copy(frame, 4);
    frame.writeUInt32BE((c ^ 0xffffffff) >>> 0, body.length + 4);
    return frame;
};
const png = (rgb: Buffer): Buffer => {
    const header = Buffer.alloc(13);
    header.writeUInt32BE(W, 0);
    header.writeUInt32BE(H, 4);
    header.set([8, 2, 0, 0, 0], 8);
    // every row leads with its filter byte: 0, none
    const rows = Buffer.alloc((W * 3 + 1) * H);
    for (let y = 0; y < H; y++) rgb.copy(rows, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk("IHDR", header),
        chunk("IDAT", deflateSync(rows, { level: 9 })),
        chunk("IEND", Buffer.alloc(0)),
    ]);
};

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

const prs = readJson<{ prs?: Array<{ number: number; title: string; author: string | null; bodyExcerpt: string; zipRefs?: number[] }> | null }>("public/api/prs.json");
const upgrades = readJson<{ upgrades?: Array<{ id: string; name: string; summary?: string; zips?: number[] }> }>("public/api/upgrades.json").upgrades ?? [];
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
    title: c.headline,
    line: c.line,
    lit: [] as number[],
}));

interface NamedCard extends CardCopy {
    name: string;
}
const cards: NamedCard[] = [
    ...sectionCards,
    ...zips
        .filter((z) => z.number !== null && z.kind === "zip")
        .map((z) => ({ name: z.slug, title: z.title, line: z.abstract || renderedAbstract(z.slug) || z.category || z.status || "", lit: [z.number as number] })),
    ...zips
        .filter((z) => z.kind === "draft")
        .map((z) => ({ name: z.slug, title: z.title, line: z.abstract || renderedAbstract(z.slug) || z.category || "", lit: [] })),
    ...(prs?.prs ?? []).map((p) => ({ name: `pr-${p.number}`, title: p.title, line: p.bodyExcerpt || `by ${p.author}`, lit: p.zipRefs ?? [] })),
    ...upgrades.map((u) => ({ name: `upgrade-${u.id}`, title: u.name, line: u.summary ?? "", lit: u.zips ?? [] })),
    ...(external?.sources ?? []).map((s) => ({ name: `external-${s.id}`, title: s.label, line: s.note ?? "", lit: [] })),
];

for (const c of cards) {
    c.title = fit(clean(c.title), 52);
    c.line = fit(clean(c.line), 92);
}

for (const c of cards) {
    writeFileSync(join(ogDir, `${c.name}.png`), png(compose(await rasterize(indexLayer(c)), await rasterize(copyLayer(c)))));
}
console.log("drew", `${cards.length} cards -> public/og/`);

// the touch icon: the app icon, rasterized
const iconSvg = readFileSync(join(root, "src", "app", "icon.svg"), "utf8");
writeFileSync(join(root, "public", "apple-touch-icon.png"), new Resvg(iconSvg, { fitTo: { mode: "width", value: 180 } }).render().asPng());
console.log("drew public/apple-touch-icon.png");

// the preview page cache-busts card images with this
writeFileSync(join(ogDir, "version.txt"), String(Date.now()));
