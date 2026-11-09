import { Badge } from "@/components/ui/badge";
import { statusGroup, type ZipStatusGroup } from "@/lib/types";
import { groupByStatus, parseStatus } from "@/lib/zip-status";
const VARIANTS: Record<ZipStatusGroup, React.ComponentProps<typeof Badge>["variant"]> = {
    final: "success",
    proposed: "purple",
    draft: "warn",
    reserved: "secondary",
    obsolete: "destructive",
    withdrawn: "destructive",
    active: "accent",
    other: "secondary",
};
/**
 * A ZIP status. A per-revision status list from the ZIP header
 * ("[Revision 0: Canopy, Revision 1: NU6] Final, [Revision 2: NU7] Proposed")
 * shows as one badge group per status: the status, then one chip per
 * revision ("Final [r0 Canopy] [r1 NU6]", "Proposed [r2 NU7]").
 *
 * The chips are inset 4px from the top, bottom and right of the badge, and
 * their radius is the badge radius minus that inset, so the corners are
 * concentric.
 */
export default function StatusBadge({ status, group, }: {
    status: string;
    group?: ZipStatusGroup;
}) {
    const entries = parseStatus(status);
    if (entries.length === 1 && entries[0].revisions.length === 0)
        return <Badge variant={VARIANTS[group ?? statusGroup(status)]}>{status}</Badge>;
    return (<span className="inline-flex max-w-full flex-wrap items-center gap-1" title={status}>
      {groupByStatus(entries).map((g) => (<Badge key={g.status} variant={VARIANTS[statusGroup(g.status)]} className="flex-wrap gap-y-1 pr-1">
          <span className="pr-0.5">{g.status}</span>
          {g.revisions.map((r) => (<span key={r.number} className="whitespace-nowrap rounded-full bg-current/10 px-1.5">
              r{r.number}
              {r.upgrade && ` ${r.upgrade}`}
            </span>))}
        </Badge>))}
    </span>);
}
