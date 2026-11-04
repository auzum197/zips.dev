import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { getUpgrades } from "@/lib/data";
import type { Upgrade } from "@/lib/types";
export const metadata: Metadata = {
    title: "Network Upgrades",
    description: "Timeline of Zcash network upgrades — Overwinter, Sapling, Blossom, Heartwood, Canopy, NU5, NU6 and beyond — and the ZIPs they activated.",
};
function dateSlice(value: string | Date | undefined): string | null {
    if (value === undefined)
        return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}
function UpgItem({ u }: {
    u: Upgrade;
}) {
    const mainnet = dateSlice(u.mainnet);
    const proposed = u.status === "proposed";
    return (<li>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span aria-hidden className={`select-none font-mono text-sm leading-none ${proposed ? "text-faint" : "text-muted-foreground"}`}>
          —
        </span>
        <h2 className="text-lg font-semibold tracking-tight">
          <Link href={`/upgrades/${u.id}/`} className="hover:text-accent">
            {u.name}
          </Link>
        </h2>
        <Badge variant="secondary">{u.code}</Badge>
        {mainnet && (<span className="whitespace-nowrap font-mono text-sm text-muted-foreground">
            {mainnet}
          </span>)}
      </div>
      <p className="mt-1 max-w-[46rem] text-sm text-muted-foreground">
        {u.summary}
      </p>
      <p className="mt-1 text-sm">
        <Link href={`/upgrades/${u.id}/`} className="text-muted-foreground underline underline-offset-2 hover:text-accent">
          {u.zips.length} ZIP{u.zips.length === 1 ? "" : "s"} →
        </Link>
      </p>
    </li>);
}
export default function UpgradesPage() {
    const upgrades = getUpgrades();
    return (<>
      <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">Network Upgrades</h1>
      <p className="mt-1 mb-6 text-[0.9375rem] text-muted-foreground">
        Consensus changes deployed to the Zcash chain, and the ZIPs that specify
        them.
      </p>
      <ol className="mt-8 space-y-8 border-l border-border-subtle pl-6">
        {upgrades.map((u) => (<UpgItem key={u.id} u={u}/>))}
      </ol>
    </>);
}
