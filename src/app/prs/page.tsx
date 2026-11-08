import type { Metadata } from "next";
import PrList from "@/components/pr-list";
import PageHeader from "@/components/page-header";
import { getPrError, getPrs, getZipByNumber } from "@/lib/data";
import type { PrMeta } from "@/lib/types";
export const metadata: Metadata = {
    title: "Pull Requests",
    description: "Open pull requests to zcash/zips, mapped to the ZIPs and drafts they touch.",
};
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
      <PageHeader title="Pull Requests" intro={<>
          Open PRs to zcash/zips, cached at sync time · {prs.length} PR
          {prs.length === 1 ? "" : "s"}
        </>}/>

      {error && (<p className="mb-6 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          PR data unavailable this build — showing the last cached snapshot.
        </p>)}

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Mapped to ZIPs</h2>
        <p className="mb-4 mt-0.5 text-sm text-muted-foreground">
          {mapped.length} PR{mapped.length === 1 ? "" : "s"} reference a ZIP or
          draft in their title or body.
        </p>
        <PrList prs={mapped} existingZipNumbers={existingZipNumbers}/>
      </section>

      {unmapped.length > 0 && (<section className="mt-10">
          <h2 className="text-lg font-semibold tracking-tight">Unmapped</h2>
          <p className="mb-3 mt-0.5 text-sm text-muted-foreground">
            {unmapped.length} PR{unmapped.length === 1 ? "" : "s"} with no
            detectable ZIP reference.
          </p>
          <PrList prs={unmapped} existingZipNumbers={existingZipNumbers}/>
        </section>)}
    </>);
}
