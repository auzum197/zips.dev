import type { Metadata } from "next";
import Link from "next/link";
import { getNewProposals, prPreviews } from "@/lib/data";
import type { NewProposal } from "@/lib/types";
export const metadata: Metadata = {
    title: "New Proposals",
    description: "Brand-new ZIPs and drafts introduced by open pull requests to zcash/zips — additions, not modifications.",
};
function dateSlice(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
}
function ProposalRow({ p }: {
    p: NewProposal;
}) {
    const pr = p.pr;
    const preview = prPreviews(pr).find((pv) => pv.slug === p.slug) ?? null;
    const title = preview?.title ?? pr.title;
    const href = preview ? `/prs/${pr.number}/${preview.slug}/` : pr.url;
    return (<li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border-subtle py-2.5">
      <a href={href} title={preview ? "Rendered preview of the proposed text" : undefined} className="min-w-0 flex-1 basis-64 leading-snug transition-colors hover:text-accent">
        {title}
      </a>
      {p.kind === "zip" ? (<span className="shrink-0 font-mono text-xs text-accent">
          ZIP {p.number}
        </span>) : (<span className="shrink-0 font-mono text-xs text-faint">{p.slug}</span>)}
      <span className="shrink-0 whitespace-nowrap text-xs text-faint max-sm:hidden">
        {pr.author ?? "unknown"} · {dateSlice(pr.updatedAt)}
      </span>
    </li>);
}
function ProposalList({ items }: {
    items: NewProposal[];
}) {
    return (<ul className="border-t border-border-subtle text-sm">
      {items.map((p) => (<ProposalRow key={`${p.pr.number}-${p.slug}`} p={p}/>))}
    </ul>);
}
export default function NewPage() {
    const proposals = getNewProposals();
    const zips = proposals.filter((p) => p.kind === "zip");
    const drafts = proposals.filter((p) => p.kind === "draft");
    return (<>
      <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">
        New Proposals
      </h1>
      <p className="mt-1 mb-6 text-[0.9375rem] text-muted-foreground">
        Brand-new documents introduced by open PRs — additions to
        zcash/zips, not modifications · {proposals.length} proposal
        {proposals.length === 1 ? "" : "s"}
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">New ZIPs</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
          {zips.length} numbered ZIP{zips.length === 1 ? "" : "s"} added in
          open PRs.
        </p>
        {zips.length > 0 ? (<ProposalList items={zips}/>) : (<p className="text-sm text-muted-foreground">
            No new numbered ZIPs in open PRs right now — new proposals usually
            start as drafts.
          </p>)}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">New drafts</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
          {drafts.length} draft{drafts.length === 1 ? "" : "s"} added in open
          PRs.
        </p>
        {drafts.length > 0 ? (<ProposalList items={drafts}/>) : (<p className="text-sm text-muted-foreground">
            No new drafts in open PRs right now.
          </p>)}
      </section>
    </>);
}
