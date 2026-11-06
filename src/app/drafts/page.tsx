import type { Metadata } from "next";
import DraftsTable from "@/components/drafts-table";
import PageHeader from "@/components/page-header";
import { getDrafts } from "@/lib/data";
export const metadata: Metadata = {
    title: "Drafts",
};
export default function DraftsPage() {
    const drafts = [...getDrafts()].sort((a, b) => a.slug.localeCompare(b.slug));
    return (<>
      <PageHeader title="Drafts" intro={`${drafts.length} unnumbered proposals not yet assigned a ZIP number.`} introClassName=""/>
      <DraftsTable drafts={drafts}/>
    </>);
}
