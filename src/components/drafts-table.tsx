import Link from "@/i18n/link";
import { useLocale, useTranslations } from "next-intl";
import { localTitle } from "@/lib/data";
import { useLabels } from "@/i18n/labels";
import StatusBadge from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { statusGroup, type ZipMeta } from "@/lib/types";
export default function DraftsTable({ drafts, }: {
    drafts: ZipMeta[];
}) {
    const t = useTranslations("Table");
    const locale = useLocale();
    const label = useLabels();
    return (<Table className="mb-8 mt-4">
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{t("title")}</TableHead>
          <TableHead scope="col">{t("draft")}</TableHead>
          <TableHead scope="col">{t("status")}</TableHead>
          <TableHead scope="col">{t("category")}</TableHead>
          <TableHead scope="col">{t("created")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {drafts.map((d) => (<TableRow key={d.slug}>
            <TableCell>
              <Link href={`/drafts/${d.slug}/`} className="font-medium text-foreground hover:text-accent">
                {localTitle(d, locale)}
              </Link>
            </TableCell>
            <TableCell className="whitespace-nowrap font-mono text-[0.8125rem] text-muted-foreground">
              <Link href={`/drafts/${d.slug}/`} className="font-normal text-muted-foreground hover:text-accent">
                {d.slug.replace(/^draft-/, "")}
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge status={d.status} group={statusGroup(d.status)}/>
            </TableCell>
            <TableCell>{label.category(d.category)}</TableCell>
            <TableCell className="whitespace-nowrap font-mono text-muted-foreground">
              {d.created ?? "—"}
            </TableCell>
          </TableRow>))}
      </TableBody>
    </Table>);
}
