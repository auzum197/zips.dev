import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import type { Crossrefs, Implementation, NewProposal, PrMeta, Upgrade, UpstreamMeta, ZipMeta, } from "./types";
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
    return readJson<{
        prs: PrMeta[];
        error: string | null;
    }>("prs.json").prs;
}
export function getPrByNumber(n: number): PrMeta | undefined {
    return getPrs().find((p) => p.number === n);
}
export function getPrPreviewHtml(n: number): string | null {
    const p = path.join(CONTENT, "rendered", `pr-${n}.html`);
    return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null;
}
export function getPrError(): string | null {
    return readJson<{
        error: string | null;
    }>("prs.json").error;
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
    for (const pr of getPrs()) {
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
