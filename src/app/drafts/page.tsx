import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import DraftsTable from "@/components/drafts-table";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import { dateSlice } from "@/lib/date";
import { getDrafts, getExternalPrs, getExternalSource, getExternalSources, prPreviews, } from "@/lib/data";
import type { PrMeta, PrPreview } from "@/lib/types";
export const metadata: Metadata = ogMetadata({
    title: "Drafts",
    description: "Draft ZIPs introduced by open pull requests, rendered before they merge.",
    path: "/drafts/",
    card: "drafts",
});
export default function DraftsPage() {
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
      <PageHeader title="Drafts" intro={`Unnumbered proposals not yet assigned a ZIP number · ${drafts.length} in zcash/zips${externalDrafts.length > 0 ? ` · ${externalDrafts.length} watched elsewhere` : ""}.`}/>

      {externalDrafts.length > 0 && (<section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">
            Watched third-party drafts
          </h2>
          <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
            Rendered from pinned pull requests to other repositories — not
            part of the canonical zcash/zips draft set.
          </p>
          <ul className="border-t border-border-subtle text-sm">
            {externalDrafts.map(({ pr, pv }: {
            pr: PrMeta;
            pv: PrPreview;
        }) => (<li key={`${pr.repo}-${pr.number}-${pv.slug}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border-subtle py-2.5">
                <a href={`/external/${pr.source}/${pr.number}/${pv.slug}/`} className="min-w-0 flex-1 basis-64 font-medium text-foreground transition-colors hover:text-accent">
                  {pv.title}
                </a>
                <span className="flex shrink-0 items-baseline gap-x-1.5">
                  <StatusBadge status={pv.status}/>
                  <Badge variant="secondary" title={`Watched third-party proposal from ${pr.repo}`}>
                    {sourceLabel(pr.source)}
                  </Badge>
                </span>
                <span className="shrink-0 whitespace-nowrap font-mono text-[0.8125rem] text-muted-foreground">
                  {pv.slug.replace(/^draft-/, "")}
                </span>
                <span className="shrink-0 whitespace-nowrap text-xs text-faint max-sm:hidden">
                  {pr.author ?? "unknown"} · {dateSlice(pr.updatedAt) ?? "—"}
                </span>
              </li>))}
          </ul>
        </section>)}

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">In zcash/zips</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
          {drafts.length} unnumbered proposal{drafts.length === 1 ? "" : "s"}{" "}
          from the canonical repository.
        </p>
        <DraftsTable drafts={drafts}/>
      </section>
    </>);
}
