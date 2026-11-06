import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StatusBadge from "@/components/status-badge";
import DateRow from "@/components/date-row";
import UpgradeZipTable from "@/components/upgrade-zip-table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getUpgrades, getZipByNumber } from "@/lib/data";
import type { Upgrade, ZipMeta } from "@/lib/types";
import { dateSlice } from "@/lib/date";
function getUpgrade(id: string): Upgrade | undefined {
    return getUpgrades().find((u) => u.id === id);
}
export function generateStaticParams(): {
    id: string;
}[] {
    return getUpgrades().map((u) => ({ id: u.id }));
}
export async function generateMetadata({ params, }: {
    params: Promise<{
        id: string;
    }>;
}): Promise<Metadata> {
    const { id } = await params;
    const u = getUpgrade(id);
    if (!u)
        return { title: "Not Found" };
    return {
        title: `${u.name} (${u.code})`,
        description: u.summary,
    };
}
function zipOrUndefined(n: number): ZipMeta | undefined {
    return getZipByNumber(n);
}
export default async function UpgradePage({ params, }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const u = getUpgrade(id);
    if (!u)
        notFound();
    const zips = u.zips
        .map((n) => zipOrUndefined(n))
        .filter((z): z is ZipMeta => z !== undefined);
    const deployed = zips.filter((z) => z.title.startsWith("Deployment of"));
    const mainnet = dateSlice(u.mainnet);
    const testnet = dateSlice(u.testnet);
    return (<>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {u.name}{" "}
          <Badge variant="secondary" className="align-middle font-mono">
            {u.code}
          </Badge>
        </h1>
        {u.status === "proposed" && <StatusBadge status={u.status}/>}
      </div>
      <p className="mb-4 mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <DateRow label="Mainnet:" value={mainnet}/>
        <DateRow label="Testnet:" value={testnet}/>
      </p>
      <p className="mb-8 max-w-[52rem] text-muted-foreground">{u.summary}</p>

      {deployed.length > 0 && (<section className="mb-8">
          <h2 className="mb-3 text-base font-semibold tracking-tight">
            Deployment
          </h2>
          <Card className="flex w-fit flex-wrap gap-2 p-3">
            {deployed.map((z) => (<Link key={z.slug} href={`/zip/${z.number}/`}>
                <Badge variant="accent">ZIP {z.number}</Badge>
              </Link>))}
          </Card>
        </section>)}

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold tracking-tight">
          Included ZIPs <span className="font-normal text-faint">({zips.length})</span>
        </h2>
        <UpgradeZipTable zips={zips}/>
      </section>

      <p className="text-sm">
        <Link href="/upgrades/" className="hover:text-accent">
          ← All network upgrades
        </Link>
      </p>
    </>);
}
