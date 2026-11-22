"use client";
import { useMemo, useRef, useState } from "react";
import Link from "@/i18n/link";
import { useTranslations } from "next-intl";
import { useLabels } from "@/i18n/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
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
export default function IndexFilters({ rows }: {
    rows: IndexRow[];
}) {
    const t = useTranslations("Home");
    const th = useTranslations("Table");
    const tc = useTranslations("Common");
    const label = useLabels();
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
            if (q !== "" && !`${r.number} ${r.title} ${r.category} ${label.category(r.category)}`.toLowerCase().includes(q)) {
                return false;
            }
            return true;
        });
    }, [rows, query, status, category, upgrade]);
    const active = query.trim() !== "" || status !== null || category !== "all" || upgrade !== "all";
    /* A filter set with the pointer replaces the rows: they fade in, with no
       movement. Text in the search box does not call this: the rows follow
       the keys with no delay. */
    const body = useRef<HTMLTableSectionElement>(null);
    const fade = useRef<Animation | null>(null);
    function settle() {
        fade.current?.cancel();
        fade.current = body.current?.animate({ opacity: [0, 1] }, { duration: 180, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }) ?? null;
    }
    function reset() {
        settle();
        setQuery("");
        setStatus(null);
        setCategory("all");
        setUpgrade("all");
    }
    return (<div className="mb-8">
      <div className="mb-3 flex flex-wrap gap-2">
        <Input type="search" placeholder={t("filterPlaceholder")} aria-label={t("filterLabel")} className="min-w-0 max-w-sm flex-1 basis-64" value={query} onChange={(e) => setQuery(e.target.value)}/>
        <Select aria-label={t("byCategory")} className="max-sm:max-w-none max-sm:grow" placeholder={category === "all"} value={category} onChange={(e) => { settle(); setCategory(e.target.value); }}>
          <option value="all">{t("allCategories")}</option>
          {categories.map((c) => (<option key={c} value={c}>
              {label.category(c)}
            </option>))}
        </Select>
        <Select aria-label={t("byUpgrade")} className="max-sm:max-w-none max-sm:grow" placeholder={upgrade === "all"} value={upgrade} onChange={(e) => { settle(); setUpgrade(e.target.value); }}>
          <option value="all">{t("allUpgrades")}</option>
          {upgrades.map((u) => (<option key={u} value={u}>
              {u}
            </option>))}
        </Select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {groups.map((g) => (<Button key={g} type="button" variant={status === g ? "default" : "outline"} size="sm" className={`rounded-full border font-mono ${status === g ? "border-accent" : "border-border/60 bg-muted text-muted-foreground hover:bg-border-subtle"}`} aria-pressed={status === g} onClick={() => { settle(); setStatus(status === g ? null : g); }}>
            {t(`group.${g}`)}
          </Button>))}
        {active && (<Button type="button" variant="ghost" size="sm" className="rounded-full text-destructive underline underline-offset-2 transition-[color,background-color,border-color,scale,opacity] starting:opacity-0" onClick={reset}>
            {t("reset")}
          </Button>)}
        <span className="ml-auto font-mono text-xs text-faint">
          {tc("of", { count: filtered.length, total: rows.length })}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{th("zip")}</TableHead>
            <TableHead scope="col">{th("title")}</TableHead>
            <TableHead scope="col">{th("status")}</TableHead>
            <TableHead scope="col">{th("category")}</TableHead>
            <TableHead scope="col">{th("created")}</TableHead>
            <TableHead scope="col">{th("upgrades")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody ref={body}>
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
              <TableCell>{label.category(r.category)}</TableCell>
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
                {t("empty")}
              </TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </div>);
}
