"use client";
import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { RowIcon } from "@/components/command-palette";
import { Input } from "@/components/ui/input";
import { localizeHref, type Locale } from "@/i18n/config";
import Link from "@/i18n/link";
import { searchPagefind, type PagefindResultData } from "@/lib/pagefind";
import { loadIndex, matchEntries, PAGE_CAPS, textIcon, type Entry, type EntryIcon } from "@/lib/search-index";
export type { PagefindResultData };

const DEBOUNCE_MS = 150;
const MAX_TEXT = 25;

/**
 * The search page: the input and the results of its query. The query is in
 * the URL (?q=), so the address bar is always the link to share. The row of
 * the query in the command palette opens this page.
 *
 * It shows what the palette finds, with no short limit: ZIPs, drafts, PRs
 * and external PRs by number and title, then matches in the full text
 * (Pagefind). The rows are the rows of the palette: the same icons,
 * indentation and text. A match in the text also shows its path and three
 * lines of the excerpt. Styles: "search page" in globals.css. The site is a static export: the page reads the URL in the
 * browser, so it must be under a Suspense boundary.
 */
export default function SearchBox() {
    const param = useSearchParams().get("q") ?? "";
    const t = useTranslations("Search");
    const palette = useTranslations("Palette");
    const nav = useTranslations("Nav");
    const locale = useLocale() as Locale;
    const [query, setQuery] = useState(param);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [text, setText] = useState<PagefindResultData[]>([]);
    const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

    /* A new query from outside (the palette, Back): the input follows the URL. */
    useEffect(() => {
        setQuery((typed) => typed.trim() === param ? typed : param);
    }, [param]);

    useEffect(() => {
        let live = true;
        loadIndex().then((list) => live && setEntries(list));
        return () => {
            live = false;
        };
    }, []);

    const trimmed = query.trim();
    const q = trimmed.toLowerCase();

    /* The URL follows the input, with no new history entry for each letter. */
    useEffect(() => {
        let live = true;
        if (q)
            setState("loading");
        const timer = setTimeout(() => {
            const url = new URL(window.location.href);
            if ((url.searchParams.get("q") ?? "") !== trimmed) {
                if (trimmed)
                    url.searchParams.set("q", trimmed);
                else
                    url.searchParams.delete("q");
                window.history.replaceState(null, "", url);
            }
            if (!q) {
                setText([]);
                setState("idle");
                return;
            }
            searchPagefind(q, MAX_TEXT)
                .then((res) => {
                    if (!live)
                        return;
                    setText(res);
                    setState("done");
                })
                .catch(() => {
                    if (!live)
                        return;
                    setText([]);
                    setState("error");
                });
        }, DEBOUNCE_MS);
        return () => {
            live = false;
            clearTimeout(timer);
        };
    }, [q, trimmed]);

    const matched = q ? matchEntries(entries, q, PAGE_CAPS) : [];
    const shown = new Set(matched.map((e) => localizeHref(e.href, locale)));
    const groups = (["zips", "drafts", "prs", "external"] as const)
        .map((g) => ({ g, rows: matched.filter((e) => e.group === g) }))
        .filter((x) => x.rows.length);
    const inText = text.filter((r) => !shown.has(r.url));
    const status = !q ? null
        : state === "error" ? <p className="cmdk-empty text-warn">{t("indexMissing")}</p>
            : state === "loading" && !inText.length ? <p className="cmdk-empty">{t("searching")}</p>
                : state === "done" && !matched.length && !inText.length ? <p className="cmdk-empty">{t("noResults", { query: trimmed })}</p>
                    : null;

    return (<div className="mt-4 max-w-3xl">
      <form role="search" onSubmit={(e) => e.preventDefault()}>
        <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("placeholder")} aria-label={t("label")} autoFocus={!param} enterKeyHint="search" className="h-11 text-base"/>
      </form>

      <div className="mt-3">
        {groups.map(({ g, rows }) => (<Section key={g} heading={g === "zips" ? palette("zips") : nav(g)}>
            {rows.map((e) => <Row key={e.href} href={e.href} icon={e.icon} nested={e.nested} lead={e.lead} label={e.title} hint={e.hint}/>)}
          </Section>))}
        {inText.length > 0 && (<div className="results-text mt-2">
            <Section heading={palette("text")}>
              {inText.map((r) => <Row key={r.url} href={r.url} icon={textIcon(r.url)} label={r.meta?.title ?? r.meta?.display_name ?? r.url} path excerpt={r.excerpt}/>)}
            </Section>
          </div>)}
        {status}
      </div>
    </div>);
}

/** A group of rows under its heading, as in the palette. */
function Section({ heading, children }: { heading: string; children: ReactNode }) {
    return (<section className="results-section" aria-label={heading}>
      <h2 className="cmdk-heading">{heading}</h2>
      {children}
    </section>);
}

/** One row of the palette, as a link. */
function Row({ href, icon, nested, lead, label, hint, path, excerpt }: {
    href: string;
    icon: EntryIcon;
    /** A document under its pull request: the row is indented. */
    nested?: boolean;
    /** Mono text before the label: the ZIP number. */
    lead?: string;
    label: string;
    /** Faint text at the end of the row. */
    hint?: string;
    /** Show the path of the page under the label. */
    path?: boolean;
    /** Pagefind excerpt (HTML with <mark>). */
    excerpt?: string;
}) {
    return (<Link href={href} className="cmdk-item results-row" data-nested={nested || undefined}>
      <RowIcon icon={icon}/>
      {lead && <span className="cmdk-lead">{lead}</span>}
      <span className="cmdk-text">
        <span className="cmdk-label">{label}</span>
        {path && <span className="results-path">{href}</span>}
        {excerpt && <span className="cmdk-excerpt" dangerouslySetInnerHTML={{ __html: excerpt }}/>}
      </span>
      {hint && <span className="cmdk-hint">{hint}</span>}
    </Link>);
}
