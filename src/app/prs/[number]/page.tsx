import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "@/i18n/link";
import { notFound } from "next/navigation";
import { diffToHtml } from "@/lib/diff";
import { dateSlice } from "@/lib/date";
import { getMeta, getPrByNumber, getPrs, getZipByNumber, getZipBySlug, localPreviewTitle, prPreviews, } from "@/lib/data";
import { type PrMeta, type PrPreview } from "@/lib/types";
import { useLabels } from "@/i18n/labels";
import StatusBadge from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
export const dynamicParams = false;
export function generateStaticParams() {
    return getPrs()
        .filter((p) => prPreviews(p).length > 0)
        .map((p) => ({ number: String(p.number) }));
}
export async function generateMetadata({ params, }: {
    params: Promise<{
        number: string;
    }>;
}): Promise<Metadata> {
    const { number } = await params;
    const pr = getPrByNumber(Number(number));
    if (!pr)
        return {};
    return ogMetadata({ title: (await getTranslations("Pr"))("metaTitle", { number: pr.number, title: pr.title }), path: `/prs/${number}/`, card: `pr-${number}` });
}
function docBase(slug: string): {
    href: string;
    label: string;
    status: string;
} | null {
    const zip = slug.match(/^zip-0*(\d{1,4})$/);
    const z = zip ? getZipByNumber(Number(zip[1])) : undefined;
    if (z && z.number !== null)
        return { href: `/zip/${z.number}/`, label: `ZIP ${z.number}`, status: z.status };
    // Some upstream drafts live in zip-NNNN files; fall back to a slug lookup.
    const d = getZipBySlug(slug);
    return d
        ? {
                href: d.number !== null ? `/zip/${d.number}/` : `/drafts/${d.slug}/`,
                label: d.number !== null ? `ZIP ${d.number}` : d.slug,
                status: d.status,
            }
        : null;
}
function PreviewBadge({ pv, base }: {
    pv: PrPreview;
    base: ReturnType<typeof docBase>;
}) {
    const t = useTranslations("Common");
    const label = useLabels();
    if (base && pv.status === base.status)
        return <StatusBadge status={base.status}/>;
    return <Badge variant="warn">{t("statusChange", { status: label.status(pv.status) })}</Badge>;
}
function PreviewRow({ pr, pv }: {
    pr: PrMeta;
    pv: PrPreview;
}) {
    const tc = useTranslations("Common");
    const locale = useLocale();
    const file = pr.files.find((f) => f.filename === pv.filename);
    const base = docBase(pv.slug);
    const isZip = /^zip-/.test(pv.slug);
    return (<li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border-subtle py-2.5">
      <span className="shrink-0 font-mono text-xs text-accent">
        {isZip ? `ZIP ${Number(pv.slug.slice(4))}` : pv.slug}
      </span>
      <Link href={`/prs/${pr.number}/${pv.slug}/`} title={tc("preview")} className="min-w-0 flex-1 basis-64 leading-snug transition-colors hover:text-accent">
        {localPreviewTitle(pr, pv, locale)}
      </Link>
      <PreviewBadge pv={pv} base={base}/>
      <span className="shrink-0 font-mono text-xs text-faint uppercase">
        {pv.format}
      </span>
      {file && (<span className="shrink-0 font-mono text-xs">
          <span className="text-success">+{file.additions}</span>{" "}
          <span className="text-destructive">−{file.deletions}</span>
          <span className="text-faint"> {file.status}</span>
        </span>)}
    </li>);
}
export default async function PrOverviewPage({ params, }: {
    params: Promise<{
        number: string;
    }>;
}) {
    const { number } = await params;
    const n = Number(number);
    const pr = /^\d+$/.test(number) ? getPrByNumber(n) : undefined;
    const previews = pr ? prPreviews(pr) : [];
    if (!pr || previews.length === 0)
        notFound();
    const meta = getMeta();
    const diffableFiles = pr.files.filter((f) => f.patch);
    const t = await getTranslations("Pr");
    const tc = await getTranslations("Common");
    // Split refs into documents that already have a page (link them) and
    // documents this PR introduces (no page yet, so plain text).
    const refs = [
        ...pr.zipRefs.map((z) => {
            // Link to whichever page exists: the numbered ZIP, or the
            // numberless draft living in a zip-NNNN file.
            const base = docBase(`zip-${String(z).padStart(4, "0")}`);
            return { key: `z${z}`, label: `ZIP ${z}`, href: base?.href ?? null };
        }),
        ...pr.draftRefs.map((d) => ({
            key: `d${d}`,
            label: d,
            href: getZipBySlug(d) ? `/drafts/${d}/` : null,
        })),
    ];
    const existingRefs = refs.filter((r): r is typeof r & { href: string } => r.href !== null);
    const newRefs = refs.filter((r) => r.href === null);
    const sep = <span className="mr-2">·</span>;
    return (<div className="relative mx-auto max-w-[88rem] pt-6">
      <div className="mx-auto max-w-[84ch] [--prose-measure:84ch]">
        <header className="mb-8 border-b border-border-subtle pb-4">
          <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-foreground">
            <Badge variant="accent">PR #{pr.number}</Badge>
            {existingRefs.length > 0 && (<>
                <span>{t("changesTo")}</span>
                {existingRefs.map((r, i) => (<span key={r.key}>
                    {i > 0 && sep}
                    <Link href={r.href} className="underline underline-offset-2">
                      {r.label}
                    </Link>
                  </span>))}
              </>)}
            {newRefs.length > 0 && (<>
                <span>{t("proposesNew")}</span>
                {newRefs.map((r, i) => (<span key={r.key}>
                    {i > 0 && sep}
                    <span className="text-faint">{r.label}</span>
                  </span>))}
              </>)}
          </p>
          <h1 className="font-display mb-3 text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.2] font-semibold tracking-[-0.02em] [text-wrap:pretty]">
            {pr.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
            <span>
              {t("byline", { author: pr.author ?? tc("unknown"), created: dateSlice(pr.createdAt) ?? "—", updated: dateSlice(pr.updatedAt) ?? "—" })}
            </span>
            <span className="text-faint">
              {t("files", { count: pr.changedFiles })} ·{" "}
              <span className="text-success">+{pr.additions}</span>{" "}
              <span className="text-destructive">−{pr.deletions}</span>
              {pr.headSha && (<>
                  {" "}
                  · {t("head")} <code className="font-mono text-xs">{pr.headSha.slice(0, 10)}</code>
                </>)}{" "}
              · {t("upstream")}{" "}
              <a className="underline underline-offset-2" href={meta.commitUrl}>
                {meta.commitShort}
              </a>
            </span>
            <a href={pr.url} className="underline underline-offset-2 hover:text-accent">
              {tc("viewOnGithub")}
            </a>
          </div>
        </header>

        <section className="mt-2">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t("changedDocs")}
          </h2>
          <ul className="border-t border-border-subtle text-sm">
            {previews.map((pv) => (<PreviewRow key={pv.slug} pr={pr} pv={pv}/>))}
          </ul>
        </section>

        {(diffableFiles.length > 0 || pr.files.length > 0) && (<section className="mt-12 border-t border-border-subtle pt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {t("changes")}
            </h2>
            {pr.filesTruncated && (<p className="mb-3 text-[0.8125rem] text-warn">
                {t.rich("diffTruncated", { count: pr.changedFiles, link: (chunks) => <a href={`${pr.url}/files`} className="underline underline-offset-2">{chunks}</a> })}
              </p>)}
            {pr.files.map((f) => (<details key={f.filename} className="mb-3">
                <summary className="cursor-pointer text-[0.8125rem] text-accent">
                  <span className="font-mono text-xs text-muted-foreground">{f.filename}</span>{" "}
                  <span className="font-mono text-xs">
                    <span className="text-success">+{f.additions}</span>{" "}
                    <span className="text-destructive">−{f.deletions}</span>
                  </span>
                </summary>
                {f.patch ? (<div className="mt-2 overflow-x-auto rounded-md border border-border-subtle bg-code py-2 font-mono text-xs">
                    <div dangerouslySetInnerHTML={{ __html: diffToHtml(f.patch) }}/>
                  </div>) : (<p className="mt-2 text-[0.8125rem] text-muted-foreground">
                    {t.rich("diffMissing", { link: (chunks) => <a href={`${pr.url}/files`} className="underline underline-offset-2">{chunks}</a> })}
                  </p>)}
              </details>))}
          </section>)}
      </div>
    </div>);
}
