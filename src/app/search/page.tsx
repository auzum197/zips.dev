import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import SearchBox from "@/components/search-box";
import PageHeader from "@/components/page-header";
export const metadata: Metadata = ogMetadata({
    title: "Search",
    description: "Explore every Zcash ZIP: full-text search across proposals, headers, and history.",
    path: "/search/",
    card: "search",
});
export default function SearchPage() {
    return (<>
      <PageHeader title="Search" intro="Full-text search across every ZIP, indexed at build time by Pagefind."/>
      <SearchBox />
    </>);
}
