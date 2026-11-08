import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { dateSlice } from "@/lib/date";
import type { Upgrade } from "@/lib/types";
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
export default function UpgradeTimeline({ upgrades, }: {
    upgrades: Upgrade[];
}) {
    return (<ol className="mt-8 space-y-8 border-l border-border-subtle pl-6">
      {upgrades.map((u) => (<UpgItem key={u.id} u={u}/>))}
    </ol>);
}
