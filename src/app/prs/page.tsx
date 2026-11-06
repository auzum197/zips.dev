import type { Metadata } from "next";
import Link from "next/link";
import { getPrError, getPrs, getZipByNumber, getZipBySlug, prPreviewHref } from "@/lib/data";
import type { PrMeta } from "@/lib/types";
export const metadata: Metadata = {
    title: "Pull Requests",
    description: "Open pull requests to zcash/zips, mapped to the ZIPs and drafts they touch.",
};
function dateSlice(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}
function byUpdatedDesc(a: PrMeta, b: PrMeta): number {
    return b.updatedAt.localeCompare(a.updatedAt);
}
function PrRefs({ pr }: {
    pr: PrMeta;
}) {
    if (pr.zipRefs.length === 0 && pr.draftRefs.length === 0)
        return null;
    return (<span className="flex min-w-0 flex-wrap items-baseline gap-x-2 font-mono text-xs">
      {pr.zipRefs.map((n) => {
            // Numbered ZIPs link to /zip/<n>/; upstream drafts filed under
            // zip-NNNN filenames have no number yet but still have pages at
            // /drafts/<slug>/ — link them too, faint only when nothing exists.
            const zip = getZipByNumber(n);
            const draft = zip ? undefined : getZipBySlug(`zip-${String(n).padStart(4, "0")}`);
            const href = zip ? `/zip/${n}/` : draft ? `/drafts/${draft.slug}/` : null;
            return href ? (<Link key={`z${n}`} href={href} className="text-accent hover:underline">
                ZIP {n}
              </Link>) : (<span key={`z${n}`} className="text-faint">
                ZIP {n}
              </span>);
        })}
      {pr.draftRefs.map((slug) => getZipBySlug(slug) ? (<Link key={`d${slug}`} href={`/drafts/${slug}/`} className="text-accent hover:underline">
          {slug}
        </Link>) : (<span key={`d${slug}`} className="text-faint">
          {slug}
        </span>))}
    </span>);
}
function PrRow({ pr }: {
    pr: PrMeta;
}) {
    const href = prPreviewHref(pr);
    return (<li id={`pr-${pr.number}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border-subtle py-2.5 scroll-mt-18 [&:target]:bg-muted">
      <span className="shrink-0 font-mono text-xs text-faint tabular-nums">
        #{pr.number}
      </span>
      <a href={href ?? pr.url} title={href ? "Rendered preview of the proposed text" : undefined} className="min-w-0 flex-1 basis-64 leading-snug transition-colors hover:text-accent">
        {pr.title}
      </a>
      {pr.claimed && (<span className="shrink-0 font-mono text-xs text-purple">claimed</span>)}
      <PrRefs pr={pr}/>
      <span className="shrink-0 whitespace-nowrap text-xs text-faint max-sm:hidden">
        {pr.author ?? "unknown"} · {dateSlice(pr.updatedAt)}
      </span>
    </li>);
}
export default function PrsPage() {
    const error = getPrError();
    const prs = getPrs();
    const mapped = prs.filter((p) => p.mapped).sort(byUpdatedDesc);
    const unmapped = prs.filter((p) => !p.mapped).sort(byUpdatedDesc);
    return (<>
      <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">Pull Requests</h1>
      <p className="mt-1 mb-6 text-[0.9375rem] text-muted-foreground">
        Open PRs to zcash/zips, cached at sync time · {prs.length} PR
        {prs.length === 1 ? "" : "s"}
      </p>

      {error && (<p className="mb-6 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          PR data unavailable this build — showing the last cached snapshot.
        </p>)}

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Mapped to ZIPs</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
          {mapped.length} PR{mapped.length === 1 ? "" : "s"} reference a ZIP or
          draft in their title or body.
        </p>
        <ul className="border-t border-border-subtle text-sm">
          {mapped.map((pr) => (<PrRow key={pr.number} pr={pr}/>))}
        </ul>
      </section>

      {unmapped.length > 0 && (<section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Unmapped</h2>
          <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
            {unmapped.length} PR{unmapped.length === 1 ? "" : "s"} with no
            detectable ZIP reference.
          </p>
          <ul className="border-t border-border-subtle text-sm">
            {unmapped.map((pr) => (<PrRow key={pr.number} pr={pr}/>))}
          </ul>
        </section>)}
    </>);
}
