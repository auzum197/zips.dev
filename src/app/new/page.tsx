import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import ProposalList from "@/components/proposal-list";
import PageHeader from "@/components/page-header";
import { getNewProposals } from "@/lib/data";
export const metadata: Metadata = ogMetadata({
    title: "New Proposals",
    description: "New ZIPs and drafts added by open pull requests. Watched third-party proposals have a badge.",
    path: "/new/",
    card: "new",
});
export default function NewPage() {
    const proposals = getNewProposals();
    const zips = proposals.filter((p) => p.kind === "zip");
    const drafts = proposals.filter((p) => p.kind === "draft");
    return (<>
      <PageHeader title="New Proposals" intro="New documents added by open PRs."/>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">New ZIPs</h2>
        {zips.length > 0 ? (<ProposalList items={zips}/>) : (<p className="text-sm text-muted-foreground">
            No new numbered ZIPs in open PRs right now — new proposals usually
            start as drafts.
          </p>)}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">New drafts</h2>
        {drafts.length > 0 ? (<ProposalList items={drafts}/>) : (<p className="text-sm text-muted-foreground">
            No new drafts in open PRs right now.
          </p>)}
      </section>
    </>);
}
