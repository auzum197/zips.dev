import { Badge } from "@/components/ui/badge";
import { statusGroup, type ZipStatusGroup } from "@/lib/types";
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
export default function StatusBadge({ status, group, }: {
    status: string;
    group?: ZipStatusGroup;
}) {
    return <Badge variant={VARIANTS[group ?? statusGroup(status)]}>{status}</Badge>;
}
