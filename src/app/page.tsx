import type { Metadata } from "next";
import IndexFilters, { type IndexRow } from "@/components/index-filters";
import { getDrafts, getMeta, getNumberedZips, getUpgrades } from "@/lib/data";
import { statusGroup } from "@/lib/types";
export const metadata: Metadata = {
    title: { absolute: "zips.dev" },
};
export default function HomePage() {
    const zips = [...getNumberedZips()].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    const drafts = getDrafts();
    const meta = getMeta();
    const upgradeNames = new Map<number, string[]>();
    for (const u of getUpgrades()) {
        for (const n of u.zips) {
            const names = upgradeNames.get(n) ?? [];
            names.push(u.name);
            upgradeNames.set(n, names);
        }
    }
    const rows: IndexRow[] = zips.map((z) => ({
        number: z.number as number,
        title: z.title,
        status: z.status,
        group: statusGroup(z.status),
        category: z.category,
        year: z.created === null ? null : Number(z.created.slice(0, 4)),
        upgrades: upgradeNames.get(z.number as number) ?? [],
    }));
    return (<>
      <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">ZIPs</h1>
      <p className="text-[0.9375rem] text-muted-foreground">
        {zips.length} numbered · {drafts.length} drafts ·{" "}
        <a href={meta.commitUrl}>
          zcash/zips@{meta.commitShort}
        </a>
      </p>
      <IndexFilters rows={rows}/>
    </>);
}
