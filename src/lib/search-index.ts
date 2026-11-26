/* The documents that the search finds by number or title: every ZIP, draft,
 * PR and external PR, and the documents of each PR. Shared by the command
 * palette and the search page. */
export type EntryIcon = "file" | "pr" | "diff";
/** One document that the search finds by its number or title. */
export type Entry = {
    group: "zips" | "drafts" | "prs" | "external";
    href: string;
    /** For the best-match order: "32" for ZIP 32, "1466" for PR #1466. */
    number: string | null;
    icon: EntryIcon;
    lead?: string;
    title: string;
    hint?: string;
    haystack: string;
    /** Of a pull request: the documents that it adds or changes. */
    docs?: Entry[];
    nested?: boolean;
};
export type Caps = Record<Entry["group"], number>;
/** Rows for each group in the palette: a query with many matches stays a short list. */
export const PALETTE_CAPS: Caps = { zips: 5, drafts: 3, prs: 3, external: 3 };
/** Rows for each group on the search page. */
export const PAGE_CAPS: Caps = { zips: 30, drafts: 15, prs: 15, external: 15 };
/** Documents under one pull request. */
const MAX_DOCS = 3;

type ApiZip = { slug: string; number: number | null; kind: string; title: string; status: string };
type ApiPr = { source: string | null; number: number; title: string; author: string | null; previews?: { slug: string; filename: string; title: string }[] };
const getJson = <T,>(url: string): Promise<T | null> => fetch(url).then((r) => r.ok ? r.json() as Promise<T> : null).catch(() => null);

let index: Promise<Entry[]> | null = null;
/** The documents, from the public API. One load per visit. A file that does
 *  not load leaves its group empty. */
export function loadIndex(): Promise<Entry[]> {
    index ??= Promise.all([
        getJson<{ zips: ApiZip[] }>("/api/zips.json"),
        getJson<{ prs: ApiPr[] }>("/api/prs.json"),
        getJson<{ sources: { id: string; label: string }[]; prs: ApiPr[] }>("/api/external.json"),
    ]).then(([zips, prs, external]) => {
        if (!zips)
            index = null;
        const pr = (p: ApiPr, group: "prs" | "external", href: string, hint?: string): Entry => ({
            group,
            href,
            number: String(p.number),
            icon: "pr",
            title: p.title,
            hint: [hint, `#${p.number}`].filter(Boolean).join(" "),
            haystack: `#${p.number} pr ${p.number} ${p.title} ${p.author ?? ""} ${hint ?? ""}`.toLowerCase(),
            docs: (p.previews ?? []).map((d): Entry => ({
                group,
                href: `${href}${d.slug}/`,
                number: null,
                icon: "diff",
                title: d.title || d.slug,
                haystack: `${d.title} ${d.slug} ${d.filename}`.toLowerCase(),
                nested: true,
            })),
        });
        return [
            ...(zips?.zips ?? []).map((z): Entry => {
                const number = z.kind === "zip" && z.number !== null ? String(z.number) : null;
                return number !== null ? {
                    group: "zips",
                    href: `/zip/${number}/`,
                    number,
                    icon: "file",
                    lead: number,
                    title: z.title,
                    hint: z.status.replace(/\[[^\]]*\]\s*/g, "").split(",")[0].trim(),
                    haystack: `zip ${number} zip-${number} ${z.title}`.toLowerCase(),
                } : {
                    group: "drafts",
                    href: `/drafts/${z.slug}/`,
                    number: null,
                    icon: "file",
                    title: z.title,
                    haystack: `draft ${z.title} ${z.slug}`.toLowerCase(),
                };
            }),
            ...(prs?.prs ?? []).map((p) => pr(p, "prs", `/prs/${p.number}/`, p.author ?? undefined)),
            ...(external?.prs ?? []).map((p) => pr(p, "external", `/external/${p.source}/${p.number}/`, external?.sources.find((s) => s.id === p.source)?.label)),
        ];
    });
    return index;
}

/** The icon of a page that the full-text search finds, from its URL: a
 *  document of a pull request, a pull request, or a document. */
export const textIcon = (url: string): EntryIcon => /\/(prs|external\/[^/]+)\/\d+\/[^/]+\/$/.test(url) ? "diff" : /\/(prs|external\/[^/]+)\/\d+\/$/.test(url) ? "pr" : "file";

/** Best matches first in each group: the exact number, then a number prefix,
 *  then a title that starts with the query, then the rest in upstream order.
 *  A pull request is a match when it or one of its documents is a match; its
 *  documents that match come under it. The exact PR number shows them all. */
export function matchEntries(entries: Entry[], q: string, caps: Caps): Entry[] {
    const words = q.split(/\s+/).filter(Boolean);
    const num = q.replace(/^(zip|pr)?[\s#-]*/, "");
    const ok = (e: Entry) => words.every((w) => e.haystack.includes(w));
    const rank = (e: Entry) => e.number === num ? 0
        : e.number?.startsWith(num) && /^\d+$/.test(num) ? 1
            : e.title.toLowerCase().startsWith(q) ? 2 : 3;
    const hits = entries
        .map((e, i) => {
            const docs = e.number === num ? e.docs ?? [] : (e.docs ?? []).filter(ok);
            return ok(e) || docs.length ? { e, docs, r: Math.min(ok(e) ? rank(e) : 3, ...docs.map(rank)), i } : null;
        })
        .filter((x) => x !== null)
        .sort((a, b) => a.r - b.r || a.i - b.i);
    return (Object.keys(caps) as Entry["group"][]).flatMap((g) => hits
        .filter((x) => x.e.group === g)
        .slice(0, caps[g])
        .flatMap((x) => [x.e, ...x.docs.slice(0, MAX_DOCS)]));
}
