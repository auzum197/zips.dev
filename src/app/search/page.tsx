import type { Metadata } from "next";
import SearchBox from "@/components/search-box";
export const metadata: Metadata = {
    title: "Search",
    description: "Full-text search across every ZIP on zipreader.",
};
export default function SearchPage() {
    return (<>
      <h1 className="mt-8 font-display text-2xl font-semibold">Search</h1>
      <p className="mt-1 text-muted-foreground">
        Full-text search across every ZIP, indexed at build time by Pagefind.
      </p>
      <SearchBox />
    </>);
}
