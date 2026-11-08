import type { Metadata } from "next";
import ProposalList from "@/components/proposal-list";
import PageHeader from "@/components/page-header";
import { getNewProposals } from "@/lib/data";
export const metadata: Metadata = {
    title: "New Proposals",
    description: "Brand-new ZIPs and drafts introduced by open pull requests to zcash/zips — additions, not modifications.",
};
export default function NewPage() {
    const proposals = getNewProposals();
    const zips = proposals.filter((p) => p.kind === "zip");
    const drafts = proposals.filter((p) => p.kind === "draft");
    return (<>
      <PageHeader title="New Proposals" intro={<>
          Brand-new documents introduced by open PRs — additions to
          zcash/zips, not modifications · {proposals.length} proposal
          {proposals.length === 1 ? "" : "s"}
        </>}/>

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
