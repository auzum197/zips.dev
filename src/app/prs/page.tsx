import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import Link from "next/link";
import PrList from "@/components/pr-list";
import PageHeader from "@/components/page-header";
import { getPrError, getPrs, getZipByNumber } from "@/lib/data";
import type { PrMeta } from "@/lib/types";
export const metadata: Metadata = ogMetadata({
    title: "Pull Requests",
    description: "Open pull requests to zcash/zips, mapped to the ZIPs and drafts they touch.",
    path: "/prs/",
    card: "prs",
});
function byUpdatedDesc(a: PrMeta, b: PrMeta): number {
    return b.updatedAt.localeCompare(a.updatedAt);
}
export default function PrsPage() {
    const error = getPrError();
    const prs = getPrs();
    const mapped = prs.filter((p) => p.mapped).sort(byUpdatedDesc);
    const unmapped = prs.filter((p) => !p.mapped).sort(byUpdatedDesc);
    const existingZipNumbers = new Set(prs
        .flatMap((p) => p.zipRefs)
        .filter((n) => getZipByNumber(n) !== undefined));
    return (<>
      <PageHeader title="Pull Requests"/>

      {error && (<p className="mb-6 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          PR data unavailable this build — showing the last cached snapshot.
        </p>)}

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Mapped to ZIPs</h2>
        <PrList prs={mapped} existingZipNumbers={existingZipNumbers}/>
      </section>

      {unmapped.length > 0 && (<section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Unmapped</h2>
          <PrList prs={unmapped} existingZipNumbers={existingZipNumbers}/>
        </section>)}

      <p className="mt-10 text-sm text-muted-foreground">
        This page lists only zcash/zips. Third-party proposal repositories
        watched by the site live in{" "}
        <Link href="/external/" className="underline underline-offset-2">
          external drafts
        </Link>
        .
      </p>
    </>);
}
