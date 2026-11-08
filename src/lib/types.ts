export interface ZipHeading {
    level: number;
    id: string;
    text: string;
}
export interface ZipMeta {
    slug: string;
    number: number | null;
    displayNumber: string;
    kind: "zip" | "draft";
    filename: string;
    format: "md" | "rst";
    title: string;
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
    headings: ZipHeading[];
    wordCount: number;
    rendered: boolean;
}
export interface UpstreamMeta {
    repo: string;
    commit: string;
    commitShort: string;
    commitUrl: string;
    syncedAt: string;
}
export interface PrFile {
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    patch: string | null;
}
export interface PrPreview {
    filename: string;
    /** Basename of `filename` without extension, e.g. "zip-0316" or "draft-arya-wallet-to-wallet-messaging". */
    slug: string;
    title: string;
    status: string;
    headings: ZipHeading[];
    format: "md" | "rst";
}
export interface NewProposal {
    pr: PrMeta;
    slug: string;
    number: number | null;
    kind: "zip" | "draft";
}
export interface PrMeta {
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
    files: PrFile[];
    filesTruncated: boolean;
    /** Every changed ZIP/draft document rendered from the PR head, in file-list order. */
    previews: PrPreview[];
    /** First element of `previews`; kept for backward compatibility of the public API. */
    preview: PrPreview | null;
}
export interface Upgrade {
    id: string;
    name: string;
    code: string;
    mainnet?: string;
    testnet?: string;
    status?: string;
    summary: string;
    zips: number[];
}
export interface Implementation {
    name: string;
    label: string;
    url: string;
    level: "consensus" | "sdk" | "wallet" | "infrastructure" | string;
    notes: string;
    zips: number[];
}
export interface Crossrefs {
    related?: string[];
    analogous_bips?: string[];
    spec_sections?: string[];
}
export type ZipStatusGroup = "final" | "proposed" | "draft" | "reserved" | "obsolete" | "withdrawn" | "active" | "other";
export function statusGroup(status: string): ZipStatusGroup {
    const s = status.toLowerCase();
    if (s.includes("final"))
        return "final";
    if (s.includes("proposed"))
        return "proposed";
    if (s.includes("draft"))
        return "draft";
    if (s.includes("reserved"))
        return "reserved";
    if (s.includes("obsolete"))
        return "obsolete";
    if (s.includes("withdrawn"))
        return "withdrawn";
    if (s.includes("active"))
        return "active";
    return "other";
}
