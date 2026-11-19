import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import ImplementationMatrix from "@/components/implementation-matrix";
import PageHeader from "@/components/page-header";
import { getImplementations, getNumberedZips } from "@/lib/data";
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Matrix");
    return ogMetadata({ title: t("title"), description: t("description"), path: "/matrix/", card: "matrix" });
}
export default function MatrixPage() {
    const t = useTranslations("Matrix");
    const impls = getImplementations();
    const zips = getNumberedZips().sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    return (<>
      <PageHeader title={t("title")}/>
      <ImplementationMatrix impls={impls} zips={zips}/>
    </>);
}
