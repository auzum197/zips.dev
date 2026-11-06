import type { Metadata } from "next";
import SearchBox from "@/components/search-box";
import PageHeader from "@/components/page-header";
export const metadata: Metadata = {
    title: "Search",
    description: "Full-text search across every ZIP on zips.dev.",
};
export default function SearchPage() {
    return (<>
      <PageHeader title="Search" intro="Full-text search across every ZIP, indexed at build time by Pagefind."/>
      <SearchBox />
    </>);
}
