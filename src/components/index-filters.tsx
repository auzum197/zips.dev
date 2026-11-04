"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatusBadge from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/components/ui/table";
import type { ZipStatusGroup } from "@/lib/types";
export interface IndexRow {
    number: number;
    title: string;
    status: string;
    group: string;
    category: string;
    year: number | null;
    upgrades: string[];
}
const GROUP_ORDER = [
    "final",
    "proposed",
    "draft",
    "reserved",
    "active",
    "withdrawn",
    "obsolete",
    "other",
] as const;
const GROUP_LABELS: Record<string, string> = {
    final: "Final",
    proposed: "Proposed",
    draft: "Draft",
    reserved: "Reserved",
    active: "Active",
    withdrawn: "Withdrawn",
    obsolete: "Obsolete",
    other: "Other",
};
export default function IndexFilters({ rows }: {
    rows: IndexRow[];
}) {
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState<string | null>(null);
    const [category, setCategory] = useState("all");
    const [upgrade, setUpgrade] = useState("all");
    const groups = useMemo(() => {
        const present = new Set(rows.map((r) => r.group));
        return GROUP_ORDER.filter((g) => present.has(g));
    }, [rows]);
    const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort((a, b) => a.localeCompare(b)), [rows]);
    const upgrades = useMemo(() => {
        const names = new Set<string>();
        for (const r of rows)
            for (const u of r.upgrades)
                names.add(u);
        return [...names].sort((a, b) => a.localeCompare(b));
    }, [rows]);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return rows.filter((r) => {
            if (status !== null && r.group !== status)
                return false;
            if (category !== "all" && r.category !== category)
                return false;
            if (upgrade !== "all" && !r.upgrades.includes(upgrade))
                return false;
            if (q !== "" && !`${r.number} ${r.title} ${r.category}`.toLowerCase().includes(q)) {
                return false;
            }
            return true;
        });
    }, [rows, query, status, category, upgrade]);
    const active = query.trim() !== "" || status !== null || category !== "all" || upgrade !== "all";
    function reset() {
        setQuery("");
        setStatus(null);
        setCategory("all");
        setUpgrade("all");
    }
    return (<div className="mb-8">
      <div className="mb-3 flex flex-wrap gap-2">
        <Input type="search" placeholder="Filter by number, title, or category…" aria-label="Filter ZIPs" className="min-w-0 max-w-sm flex-1 basis-64" value={query} onChange={(e) => setQuery(e.target.value)}/>
        <select aria-label="Filter by category" className="h-9 max-w-56 rounded-md border border-input bg-transparent px-3 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (<option key={c} value={c}>
              {c}
            </option>))}
        </select>
        <select aria-label="Filter by network upgrade" className="h-9 max-w-56 rounded-md border border-input bg-transparent px-3 text-sm" value={upgrade} onChange={(e) => setUpgrade(e.target.value)}>
          <option value="all">All upgrades</option>
          {upgrades.map((u) => (<option key={u} value={u}>
              {u}
            </option>))}
        </select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {groups.map((g) => (<Button key={g} type="button" variant={status === g ? "default" : "outline"} size="sm" className="rounded-full font-mono" aria-pressed={status === g} onClick={() => setStatus(status === g ? null : g)}>
            {GROUP_LABELS[g] ?? g}
          </Button>))}
        {active && (<Button type="button" variant="ghost" size="sm" className="text-destructive underline underline-offset-2" onClick={reset}>
            Reset
          </Button>)}
        <span className="ml-auto font-mono text-xs text-faint">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">ZIP</TableHead>
            <TableHead scope="col">Title</TableHead>
            <TableHead scope="col">Status</TableHead>
            <TableHead scope="col">Category</TableHead>
            <TableHead scope="col">Created</TableHead>
            <TableHead scope="col">Upgrades</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filtered.map((r) => (<TableRow key={r.number}>
              <TableCell className="whitespace-nowrap font-mono text-muted-foreground">
                <Link href={`/zip/${r.number}/`}>{r.number}</Link>
              </TableCell>
              <TableCell>
                <Link href={`/zip/${r.number}/`} className="font-medium text-foreground hover:text-accent">
                  {r.title}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={r.status} group={r.group as ZipStatusGroup}/>
              </TableCell>
              <TableCell>{r.category}</TableCell>
              <TableCell className="whitespace-nowrap font-mono text-muted-foreground">
                {r.year ?? "—"}
              </TableCell>
              <TableCell>
                {r.upgrades.map((u) => (<span key={u} className="mr-1 inline-block whitespace-nowrap rounded border border-border-subtle bg-muted px-1.5 py-px font-mono text-[0.6875rem] text-muted-foreground">
                    {u}
                  </span>))}
              </TableCell>
            </TableRow>))}
          {filtered.length === 0 && (<TableRow>
              <TableCell colSpan={6} className="py-5 text-muted-foreground">
                No ZIPs match the current filters.
              </TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </div>);
}
