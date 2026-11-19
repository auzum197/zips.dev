import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "@/i18n/link";
import { Badge } from "@/components/ui/badge";
import DraftsTable from "@/components/drafts-table";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import { dateSlice } from "@/lib/date";
import { getDrafts, getExternalPrs, getExternalSource, getExternalSources, prPreviews, } from "@/lib/data";
import type { PrMeta, PrPreview } from "@/lib/types";
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Drafts");
    return ogMetadata({ title: t("title"), description: t("description"), path: "/drafts/", card: "drafts" });
}
export default function DraftsPage() {
    const t = useTranslations("Drafts");
    const tc = useTranslations("Common");
    const drafts = [...getDrafts()].sort((a, b) => a.slug.localeCompare(b.slug));
    const sourceLabel = (id: string | null) => (id ? getExternalSource(id)?.label : undefined);
    // Watched third-party draft documents, pinned per-PR in data/sources.yaml.
    // Shown separately and badged — never mixed into the canonical draft set,
    // and canonical drafts always win a slug.
    const externalDrafts = getExternalPrs()
        .flatMap((pr) => prPreviews(pr).map((pv) => ({ pr, pv })))
        .filter(({ pv }) => pv.slug.startsWith("draft-"))
        .filter(({ pv }) => !drafts.some((d) => d.slug === pv.slug))
        .sort((a, b) => b.pr.updatedAt.localeCompare(a.pr.updatedAt));
    return (<>
      <PageHeader title={t("title")}/>

      {externalDrafts.length > 0 && (<section className="mt-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            {t("watchedTitle")}
          </h2>
          <ul className="border-t border-border-subtle text-sm">
            {externalDrafts.map(({ pr, pv }: {
            pr: PrMeta;
            pv: PrPreview;
        }) => (<li key={`${pr.repo}-${pr.number}-${pv.slug}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border-subtle py-2.5">
                <Link href={`/external/${pr.source}/${pr.number}/${pv.slug}/`} className="min-w-0 flex-1 basis-64 font-medium text-foreground transition-colors hover:text-accent">
                  {pv.title}
                </Link>
                <span className="flex shrink-0 items-baseline gap-x-1.5">
                  <StatusBadge status={pv.status}/>
                  <Badge variant="secondary" title={tc("watchedFrom", { repo: pr.repo })}>
                    {sourceLabel(pr.source)}
                  </Badge>
                </span>
                <span className="shrink-0 whitespace-nowrap font-mono text-[0.8125rem] text-muted-foreground">
                  {pv.slug.replace(/^draft-/, "")}
                </span>
                <span className="shrink-0 whitespace-nowrap text-xs text-faint max-sm:hidden">
                  {pr.author ?? tc("unknown")} · {dateSlice(pr.updatedAt) ?? "—"}
                </span>
              </li>))}
          </ul>
        </section>)}

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{t("canonicalTitle")}</h2>
        <DraftsTable drafts={drafts}/>
      </section>
    </>);
}
