import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { Crossrefs, ExternalSnapshot, ExternalSource, Implementation, NewProposal, PrMeta, PrPreview, Upgrade, UpstreamMeta, ZipMeta, } from "./types";
const CONTENT = path.join(process.cwd(), "content");
const DATA = path.join(process.cwd(), "data");
function readJson<T>(file: string): T {
    return JSON.parse(fs.readFileSync(path.join(CONTENT, file), "utf8")) as T;
}
export function getMeta(): UpstreamMeta {
    return readJson<UpstreamMeta>("meta.json");
}
export function getZips(): ZipMeta[] {
    return readJson<{
        zips: ZipMeta[];
    }>("zips.json").zips;
}
export function getNumberedZips(): ZipMeta[] {
    return getZips().filter((z) => z.kind === "zip");
}
export function getDrafts(): ZipMeta[] {
    return getZips().filter((z) => z.kind === "draft");
}
export function getZipBySlug(slug: string): ZipMeta | undefined {
    return getZips().find((z) => z.slug === slug);
}
export function getZipByNumber(n: number): ZipMeta | undefined {
    return getNumberedZips().find((z) => z.number === n);
}
export function getZipHtml(slug: string): string {
    return fs.readFileSync(path.join(CONTENT, "rendered", `${slug}.html`), "utf8");
}
export function getPrs(): PrMeta[] {
    // Only the primary repo: external-source PRs live in external.json and
    // are exposed through the getExternal* helpers below.
    return readJson<{
        prs: PrMeta[];
        error: string | null;
    }>("prs.json").prs.filter((p) => (p.source ?? null) === null);
}
export function getPrByNumber(n: number): PrMeta | undefined {
    return getPrs().find((p) => p.number === n);
}
/** Base URL path for a PR overview page, namespaced per repository. */
export function prBaseHref(pr: PrMeta): string {
    return pr.source ? `/external/${pr.source}/${pr.number}/` : `/prs/${pr.number}/`;
}
/** "zips/zip-0316.rst" → "zip-0316" */
function previewSlug(filename: string): string {
    return filename.replace(/^.*\//, "").replace(/\.(md|rst)$/i, "");
}
/**
 * Every rendered preview of a PR's changed documents, in file-list order.
 * Falls back to the single legacy `preview` field when reading a snapshot
 * written before `previews` existed.
 */
export function prPreviews(pr: PrMeta): PrPreview[] {
    const list = pr.previews && pr.previews.length > 0
        ? pr.previews
        : pr.preview
            ? [pr.preview]
            : [];
    return list.map((p) => (p.slug ? p : { ...p, slug: previewSlug(p.filename) }));
}
export function getPrPreviewHtml(pr: PrMeta, slug: string): string | null {
    // External PR previews are file-keyed by source id so PR numbers from
    // different repos cannot collide.
    const key = pr.source ? `${pr.source}-${pr.number}` : String(pr.number);
    const p = path.join(CONTENT, "rendered", `pr-${key}-${slug}.html`);
    if (fs.existsSync(p))
        return fs.readFileSync(p, "utf8");
    const legacy = path.join(CONTENT, "rendered", `pr-${pr.number}.html`);
    return fs.existsSync(legacy) ? fs.readFileSync(legacy, "utf8") : null;
}
/**
 * Best link for a PR's rendered preview: the specific document when one is
 * requested (or only one exists), the overview when several exist.
 */
export function prPreviewHref(pr: PrMeta, targetSlug?: string): string | null {
    const previews = prPreviews(pr);
    if (previews.length === 0)
        return null;
    const match = targetSlug ? previews.find((p) => p.slug === targetSlug) : undefined;
    if (match)
        return `${prBaseHref(pr)}/${match.slug}/`;
    return previews.length === 1 ? `${prBaseHref(pr)}/${previews[0].slug}/` : `${prBaseHref(pr)}/`;
}
export function getPrError(): string | null {
    return readJson<{
        error: string | null;
    }>("prs.json").error;
}
/* Watched third-party PR groups: curated per-PR in data/sources.yaml, fetched
 * by sync into content/external.json, rendered under /external/<id>/<number>/. */
const externalDoc = () => readJson<ExternalSnapshot>("external.json");
export function getExternalSources(): ExternalSource[] {
    return externalDoc().sources;
}
export function getExternalSource(id: string): ExternalSource | undefined {
    return getExternalSources().find((s) => s.id === id);
}
export function getExternalPrs(): PrMeta[] {
    return externalDoc().prs;
}
export function getExternalPrsForSource(id: string): PrMeta[] {
    return getExternalPrs().filter((p) => p.source === id);
}
export function getExternalPr(id: string, n: number): PrMeta | undefined {
    return getExternalPrs().find((p) => p.source === id && p.number === n);
}
export function getUpgrades(): Upgrade[] {
    const doc = yaml.load(fs.readFileSync(path.join(DATA, "upgrades.yaml"), "utf8")) as {
        upgrades: Upgrade[];
    };
    return doc.upgrades ?? [];
}
export function getImplementations(): Implementation[] {
    const doc = yaml.load(fs.readFileSync(path.join(DATA, "implementations.yaml"), "utf8")) as {
        implementations: Implementation[];
    };
    return doc.implementations ?? [];
}
const crossrefsDoc = () => yaml.load(fs.readFileSync(path.join(DATA, "crossrefs.yaml"), "utf8")) as {
    zips: Record<string, Crossrefs>;
};
export function getCrossrefs(slug: string): Crossrefs | null {
    return crossrefsDoc().zips[slug] ?? null;
}
export function getAllCrossrefs(): Record<string, Crossrefs> {
    return crossrefsDoc().zips;
}
export function prsForZip(number: number): PrMeta[] {
    return getPrs().filter((p) => p.zipRefs.includes(number));
}
export function prsForDraft(slug: string): PrMeta[] {
    return getPrs().filter((p) => p.draftRefs.includes(slug));
}
const ADDED_DOC_RE = /^(?:zips\/)?(zip-0*(\d{1,4})|draft-([a-z0-9-]+))\.(?:md|rst)$/i;
export function getNewProposals(): NewProposal[] {
    const out: NewProposal[] = [];
    const seen = new Set<string>();
    // Canonical PRs and watched third-party PRs both introduce documents;
    // the UI badges the third-party ones.
    for (const pr of [...getPrs(), ...getExternalPrs()]) {
        for (const f of pr.files) {
            if (f.status !== "added")
                continue;
            const m = f.filename.match(ADDED_DOC_RE);
            if (!m)
                continue;
            const isZip = m[2] !== undefined;
            const slug = isZip
                ? `zip-${String(Number(m[2])).padStart(4, "0")}`
                : `draft-${m[3]}`;
            if (seen.has(slug))
                continue;
            seen.add(slug);
            out.push({
                pr,
                slug,
                number: isZip ? Number(m[2]) : null,
                kind: isZip ? "zip" : "draft",
            });
        }
    }
    return out.sort((a, b) => b.pr.updatedAt.localeCompare(a.pr.updatedAt));
}
export function upgradeNameForZip(number: number): Upgrade[] {
    return getUpgrades().filter((u) => u.zips.includes(number));
}
export function allZipNumbers(): number[] {
    return getNumberedZips()
        .map((z) => z.number)
        .filter((n): n is number => n !== null);
}
