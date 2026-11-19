import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import UpgradeTimeline from "@/components/upgrade-timeline";
import PageHeader from "@/components/page-header";
import { getUpgrades } from "@/lib/data";
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Upgrades");
    return ogMetadata({ title: t("title"), description: t("description"), path: "/upgrades/", card: "upgrades" });
}
export default function UpgradesPage() {
    const t = useTranslations("Upgrades");
    const upgrades = getUpgrades();
    return (<>
      <PageHeader title={t("title")}/>
      <UpgradeTimeline upgrades={upgrades}/>
    </>);
}
