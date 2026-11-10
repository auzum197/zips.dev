import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/page-header";
import PrList from "@/components/pr-list";
import { getExternalPrs, getExternalSources } from "@/lib/data";
import type { PrMeta } from "@/lib/types";
export const metadata: Metadata = {
    title: "External Drafts",
    description: "Watched third-party proposal repositories, rendered in their own namespace with explicit provenance.",
};
function byUpdatedDesc(a: PrMeta, b: PrMeta): number {
    return b.updatedAt.localeCompare(a.updatedAt);
}
export default function ExternalIndexPage() {
    const sources = getExternalSources();
    const prs = getExternalPrs();
    return (<>
      <PageHeader title="External drafts" intro={<>Open PRs to watched third-party proposal repositories, cached at sync
          time · rendered in their own namespace — not part of the canonical
          zcash/zips ZIP set.</>}/>

      {sources.length === 0 && (<p className="mt-6 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          No sources configured. Watched repos are curated in{" "}
          <code className="font-mono text-xs">data/sources.yaml</code>.
        </p>)}

      {sources.map((s) => {
        const list = prs.filter((p) => p.source === s.id).sort(byUpdatedDesc);
        return (<section key={s.id} className="mt-10">
            <h2 className="flex flex-wrap items-baseline gap-x-2 text-lg font-semibold tracking-tight">
              <Link href={`/external/${s.id}/`} className="hover:text-accent">
                {s.label}
              </Link>
              <a href={`https://github.com/${s.repo}`} className="font-mono text-xs font-normal text-faint underline underline-offset-2">
                {s.repo}
              </a>
            </h2>
            {s.note && (<p className="mt-0.5 max-w-[72ch] text-sm text-muted-foreground">{s.note}</p>)}
            {s.error && (<p className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
                Data unavailable this build — showing the last cached snapshot.
              </p>)}
            <div className="mt-3">
              {list.length === 0
                ? (<p className="text-sm text-muted-foreground">No open pull requests.</p>)
                : <PrList prs={list}/>}
            </div>
          </section>);
      })}
    </>);
}
