import Link from "@/i18n/link";
import { useLocale, useTranslations } from "next-intl";
import { localTitle } from "@/lib/data";
import { useLabels } from "@/i18n/labels";
import StatusBadge from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import type { ZipMeta } from "@/lib/types";
export default function UpgradeZipTable({ zips }: {
    zips: ZipMeta[];
}) {
    const t = useTranslations("Table");
    const locale = useLocale();
    const label = useLabels();
    return (<Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("zip")}</TableHead>
          <TableHead>{t("title")}</TableHead>
          <TableHead>{t("status")}</TableHead>
          <TableHead>{t("category")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {zips.map((z) => (<TableRow key={z.slug}>
            <TableCell className="whitespace-nowrap font-mono">
              <Link href={`/zip/${z.number}/`} className="hover:text-accent">
                {z.displayNumber}
              </Link>
            </TableCell>
            <TableCell>
              <Link href={`/zip/${z.number}/`} className="hover:text-accent">
                {localTitle(z, locale)}
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge status={z.status}/>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {label.category(z.category)}
            </TableCell>
          </TableRow>))}
      </TableBody>
    </Table>);
}
