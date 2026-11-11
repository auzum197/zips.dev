import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import ProposalList from "@/components/proposal-list";
import PageHeader from "@/components/page-header";
import { getNewProposals } from "@/lib/data";
export const metadata: Metadata = ogMetadata({
    title: "New Proposals",
    description: "Brand-new ZIPs and drafts introduced by open pull requests — additions, not modifications. Watched third-party proposals are badged.",
    path: "/new/",
    card: "new",
});
export default function NewPage() {
    const proposals = getNewProposals();
    const zips = proposals.filter((p) => p.kind === "zip");
    const drafts = proposals.filter((p) => p.kind === "draft");
    return (<>
      <PageHeader title="New Proposals" intro={<>
          Brand-new documents introduced by open PRs — additions, not
          modifications · {proposals.length} proposal
          {proposals.length === 1 ? "" : "s"}
          {proposals.some((p) => p.pr.source) && (<>
              {" "}· badged ones come from watched third-party repos
            </>)}
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
