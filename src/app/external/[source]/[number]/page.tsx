import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import { useLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "@/i18n/link";
import { notFound } from "next/navigation";
import { diffToHtml } from "@/lib/diff";
import { dateSlice } from "@/lib/date";
import { getExternalPr, getExternalPrsForSource, getExternalSource, getExternalSources, localPreviewTitle, prPreviews, } from "@/lib/data";
import { type PrMeta, type PrPreview } from "@/lib/types";
import StatusBadge from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
export const dynamicParams = false;
export function generateStaticParams() {
    const out: {
        source: string;
        number: string;
    }[] = [];
    for (const s of getExternalSources()) {
        for (const pr of getExternalPrsForSource(s.id)) {
            if (prPreviews(pr).length > 0)
                out.push({ source: s.id, number: String(pr.number) });
        }
    }
    return out;
}
export async function generateMetadata({ params, }: {
    params: Promise<{
        source: string;
        number: string;
    }>;
}): Promise<Metadata> {
    const { source, number } = await params;
    const pr = /^\d+$/.test(number) ? getExternalPr(source, Number(number)) : undefined;
    if (!pr)
        return {};
    const s = getExternalSource(source);
    return ogMetadata({
        title: (await getTranslations("External"))("prMetaTitle", { label: s?.label ?? source, number: pr.number, title: pr.title }),
        path: `/external/${source}/${number}/`,
        card: `external-${source}`,
    });
}
function PreviewRow({ pr, pv }: {
    pr: PrMeta;
    pv: PrPreview;
}) {
    const tc = useTranslations("Common");
    const locale = useLocale();
    const file = pr.files.find((f) => f.filename === pv.filename);
    const isZip = /^zip-/.test(pv.slug);
    return (<li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border-subtle py-2.5">
      <span className="shrink-0 font-mono text-xs text-accent">
        {isZip ? `ZIP ${Number(pv.slug.slice(4))}` : pv.slug}
      </span>
      <Link href={`/external/${pr.source}/${pr.number}/${pv.slug}/`} title={tc("preview")} className="min-w-0 flex-1 basis-64 leading-snug transition-colors hover:text-accent">
        {localPreviewTitle(pr, pv, locale)}
      </Link>
      <StatusBadge status={pv.status}/>
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
export default async function ExternalPrOverviewPage({ params, }: {
    params: Promise<{
        source: string;
        number: string;
    }>;
}) {
    const { source, number } = await params;
    const n = Number(number);
    const pr = /^\d+$/.test(number) ? getExternalPr(source, n) : undefined;
    const s = getExternalSource(source);
    const previews = pr && s ? prPreviews(pr) : [];
    if (!pr || !s || previews.length === 0)
        notFound();
    const diffableFiles = pr.files.filter((f) => f.patch);
    const t = await getTranslations("Pr");
    const tc = await getTranslations("Common");
    const te = await getTranslations("External");
    return (<div className="relative mx-auto max-w-[88rem] pt-6">
      <div className="mx-auto max-w-[84ch] [--prose-measure:84ch]">
        <header className="mb-8 border-b border-border-subtle pb-4">
          <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-foreground">
            <Badge variant="secondary">
              <Link href={`/external/${s.id}/`} className="hover:text-foreground">
                {s.label}
              </Link>
            </Badge>
            <Badge variant="accent">PR #{pr.number}</Badge>
            <span>
              {te("thirdPartyFrom")}{" "}
              <a className="underline underline-offset-2" href={`https://github.com/${pr.repo}`}>
                {pr.repo}
              </a>
            </span>
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
                  · {t("head")}{" "}
                  <a className="underline underline-offset-2" href={`https://github.com/${pr.repo}/commit/${pr.headSha}`}>
                    <code className="font-mono text-xs">{pr.headSha.slice(0, 10)}</code>
                  </a>
                </>)}
            </span>
            <a href={pr.url} className="underline underline-offset-2 hover:text-accent">
              {tc("viewOnGithub")}
            </a>
          </div>
          <p className="mt-2 text-[0.8125rem] text-faint">
            {te("renderedFrom", { repo: pr.repo })}
          </p>
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
