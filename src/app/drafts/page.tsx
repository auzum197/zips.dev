import type { Metadata } from "next";
import Link from "next/link";
import StatusBadge from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import { getDrafts } from "@/lib/data";
import { statusGroup } from "@/lib/types";
export const metadata: Metadata = {
    title: "Drafts",
};
export default function DraftsPage() {
    const drafts = [...getDrafts()].sort((a, b) => a.slug.localeCompare(b.slug));
    return (<>
      <h1 className="mt-8 font-display text-2xl font-semibold tracking-tight">Drafts</h1>
      <p className="text-[0.9375rem] text-muted-foreground">
        {drafts.length} unnumbered proposals not yet assigned a ZIP number.
      </p>
      <Table className="mb-8 mt-4">
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Title</TableHead>
            <TableHead scope="col">Draft</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">Category</TableHead>
            <TableHead scope="col">Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {drafts.map((d) => (<TableRow key={d.slug}>
              <TableCell>
                <Link href={`/drafts/${d.slug}/`} className="font-medium text-foreground hover:text-accent">
                  {d.title}
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
              <TableCell>{d.category}</TableCell>
              <TableCell className="whitespace-nowrap font-mono text-muted-foreground">
                {d.created ?? "—"}
              </TableCell>
            </TableRow>))}
        </TableBody>
      </Table>
    </>);
}
