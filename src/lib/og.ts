import type { Metadata } from "next";
import cards from "../../scripts/og-cards.json";

// what the site says about itself to a link preview. The og:preview page
// (public/og-preview.html, run with `pnpm og:preview`) reads each route's
// head the way a crawler does and checks these tags against this file.
export const SITE = "zipreader";
export const ORIGIN = "https://zipreader.org";

export type OgCard = (typeof cards)[number];
export const OG_CARDS = cards as OgCard[];

// 1200x630 PNGs in public/og/, drawn from scripts/og.html by `pnpm og`.
// Section slugs come from og-cards.json; doc cards carry the page's real
// title and are drawn from the synced /api data. Anything without a card of
// its own falls back to the home card set here and in the root layout.
export const ogImage = (slug: string = "home") => `${ORIGIN}/og/${slug}.png`;

// link platforms truncate around 70 characters; cutting at a word boundary
// with an ellipsis reads better than their hard cuts, and now matches what
// the doc cards show
const fitTitle = (text: string, max = 68) => {
    if (text.length <= max + 4) return text;
    const cut = text.slice(0, max);
    return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), 30)).trimEnd()}…`;
};

// page metadata with the preview tags filled in. Next.js replaces a page's
// openGraph wholesale instead of merging it with the layout's, so every page
// needs the whole object.
//
// Section pages pass a description and a card slug from og-cards.json.
// Dynamic pages pass the page's doc card (zip-32, pr-1435, draft-<slug>,
// upgrade-<id>, external-<id>) — a card `pnpm og` draws from the synced data
// with the page's real title. They also leave out the description: the
// layout description fills og:description.
export function ogMetadata(opts: {
    title: string;
    description?: string;
    path: string;
    card?: string;
}): Metadata {
    const slug = opts.card ?? "home";
    const known = OG_CARDS.find((c) => c.slug === slug);
    const image = {
        url: ogImage(slug),
        width: 1200,
        height: 630,
        alt: known?.alt ?? `${opts.title}, in serif type on a grained paper card.`,
    };
    const openGraph: NonNullable<Metadata["openGraph"]> = {
        url: `${ORIGIN}${opts.path}`,
        siteName: SITE,
        type: "website",
        images: [image],
    };
    const twitter: NonNullable<Metadata["twitter"]> = {
        card: "summary_large_image",
        images: [image.url],
    };
    const meta: Metadata = {
        title: opts.title,
        alternates: { canonical: opts.path },
        openGraph,
        twitter,
    };
    const fullTitle = opts.title === SITE ? SITE : `${opts.title} · ${SITE}`;
    openGraph.title = fitTitle(fullTitle);
    twitter.title = fitTitle(fullTitle);
    if (opts.description !== undefined) {
        meta.description = opts.description;
        openGraph.description = opts.description;
        twitter.description = opts.description;
    }
    return meta;
}
