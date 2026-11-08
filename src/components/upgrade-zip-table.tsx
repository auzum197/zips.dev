import Link from "next/link";
import StatusBadge from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import type { ZipMeta } from "@/lib/types";
export default function UpgradeZipTable({ zips }: {
    zips: ZipMeta[];
}) {
    return (<Table>
      <TableHeader>
        <TableRow>
          <TableHead>ZIP</TableHead>
          <TableHead>Title</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Category</TableHead>
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
                {z.title}
              </Link>
            </TableCell>
            <TableCell>
              <StatusBadge status={z.status}/>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {z.category}
            </TableCell>
          </TableRow>))}
      </TableBody>
    </Table>);
}
