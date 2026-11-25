/* Where the relative links of an upstream document go.
 *
 * Upstream writes links relative to the root of the published site
 * (https://zips.z.cash/): `zip-0200.rst`, `protocol/protocol.pdf#networks`.
 * Images also come as `../rendered/assets/images/x.png`, which the upstream
 * build publishes as `assets/images/x.png`.
 *
 * Each link gets the first target that applies:
 *   1. a document this site has          -> its page here
 *   2. an image the pull request changes -> that file at the PR head
 *   3. an image in public/upstream       -> /upstream/<name>, SVG before PNG
 *   4. the rest (the protocol PDFs)      -> the same path on zips.z.cash
 */

export const UPSTREAM_SITE = "https://zips.z.cash/";

export interface LinkContext {
    /** Page of each document, by lower-case slug (`zip-0200`, `draft-x`). */
    routes: ReadonlyMap<string, string>;
    /** Names of the files in public/upstream. */
    assets: ReadonlySet<string>;
    /** Images a pull request adds or changes: file name -> absolute URL. */
    prAssets?: ReadonlyMap<string, string>;
}

const ABSOLUTE = /^(?:#|\/|[a-z][a-z0-9+.-]*:)/i;
const DOC = /^(zip-\d+|draft-[a-z0-9-]+)(?:\.rst|\.md|\.html)?$/i;
const IMAGE = /^(.+)\.(png|svg|jpe?g|gif|webp)$/i;

/** `zip-207` and `zip-0207.rst` are the same document. */
function docSlug(name: string): string | null {
    const doc = name.match(DOC);
    if (!doc)
        return null;
    const zip = doc[1].match(/^zip-(\d+)$/i);
    return zip ? `zip-${zip[1].replace(/^0+(?=\d)/, "").padStart(4, "0")}` : doc[1].toLowerCase();
}

export function resolveLink(value: string, ctx: LinkContext): string {
    if (value === "" || ABSOLUTE.test(value))
        return value;
    const cut = value.search(/[#?]/);
    const suffix = cut === -1 ? "" : value.slice(cut);
    const target = (cut === -1 ? value : value.slice(0, cut)).replace(/^(?:\.\/)+/, "").replace(/^(?:\.\.\/)?rendered\//, "");
    const name = target.replace(/^.*\//, "");
    if (name === target) {
        const slug = docSlug(name);
        const route = slug === null ? undefined : ctx.routes.get(slug);
        if (route !== undefined)
            return route + suffix;
    }
    const image = name.match(IMAGE);
    if (image) {
        const names = image[2].toLowerCase() === "png" ? [`${image[1]}.svg`, name] : [name];
        for (const n of names) {
            const url = ctx.prAssets?.get(n);
            if (url !== undefined)
                return url + suffix;
        }
        for (const n of names) {
            if (ctx.assets.has(n))
                return `/upstream/${n}${suffix}`;
        }
    }
    try {
        return new URL(target, UPSTREAM_SITE).href + suffix;
    }
    catch {
        return value;
    }
}

export function rewriteLinks(html: string, ctx: LinkContext): string {
    return html.replace(/(?<=\s)(src|href)="([^"]*)"/g, (_full, attr: string, value: string) => `${attr}="${resolveLink(value, ctx)}"`);
}

/** The public/upstream files a rendered page refers to. */
export function upstreamRefs(html: string): string[] {
    return [...html.matchAll(/(?<=\s)(?:src|href)="\/upstream\/([^"#?]+)/g)].map((m) => m[1]);
}
