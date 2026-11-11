import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import UpgradeTimeline from "@/components/upgrade-timeline";
import PageHeader from "@/components/page-header";
import { getUpgrades } from "@/lib/data";
export const metadata: Metadata = ogMetadata({
    title: "Network Upgrades",
    description: "Timeline of Zcash network upgrades — Overwinter, Sapling, Blossom, Heartwood, Canopy, NU5, NU6 and beyond — and the ZIPs they activated.",
    path: "/upgrades/",
    card: "upgrades",
});
export default function UpgradesPage() {
    const upgrades = getUpgrades();
    return (<>
      <PageHeader title="Network Upgrades" intro="Consensus changes deployed to the Zcash chain, and the ZIPs that specify them."/>
      <UpgradeTimeline upgrades={upgrades}/>
    </>);
}
