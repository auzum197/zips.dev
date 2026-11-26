import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import SearchBox from "@/components/search-box";
import PageHeader from "@/components/page-header";
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Search");
    return ogMetadata({ title: t("title"), description: t("description"), path: "/search/", card: "search" });
}
export default function SearchPage() {
    const t = useTranslations("Search");
    return (<>
      <PageHeader title={t("title")}/>
      <Suspense>
        <SearchBox />
      </Suspense>
    </>);
}
