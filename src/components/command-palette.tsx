"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { localizeHref, type Locale } from "@/i18n/config";
import { closeCommandPalette, openCommandPalette, useCommandPalette } from "@/lib/command-palette";
import { searchPagefind, type PagefindResultData } from "@/lib/pagefind";
import { currentTheme, toggleTheme } from "@/lib/theme";

type Group = "zips" | "drafts" | "prs" | "external" | "pages" | "actions" | "text";
/* What a row is, at a glance: the icons that GitHub uses for the same things
 * (Octicons, MIT). A document, a pull request, a document that a pull
 * request adds or changes. */
const ICONS = {
    file: "M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z",
    pr: "M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z",
    diff: "M1 1.75C1 .784 1.784 0 2.75 0h7.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16H2.75A1.75 1.75 0 0 1 1 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h10.5a.25.25 0 0 0 .25-.25V4.664a.25.25 0 0 0-.073-.177l-2.914-2.914a.25.25 0 0 0-.177-.073ZM8 3.25a.75.75 0 0 1 .75.75v1.5h1.5a.75.75 0 0 1 0 1.5h-1.5v1.5a.75.75 0 0 1-1.5 0V7h-1.5a.75.75 0 0 1 0-1.5h1.5V4A.75.75 0 0 1 8 3.25Zm-3 8a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z",
    arrow: "M8.22 2.97a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042l2.97-2.97H3.75a.75.75 0 0 1 0-1.5h7.44L8.22 4.03a.75.75 0 0 1 0-1.06Z",
    sun: "M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm5.657-8.157a.75.75 0 0 1 0 1.061l-1.061 1.06a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.06-1.06a.75.75 0 0 1 1.06 0Zm-9.193 9.193a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0ZM3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8Zm13 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8Zm-8 5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13Zm3.536-1.464a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061ZM2.343 2.343a.75.75 0 0 1 1.061 0l1.06 1.061a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-1.06-1.06a.75.75 0 0 1 0-1.06Z",
    moon: "M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.499 5.499 0 1 0 7.678-7.678Z",
} as const;
type Icon = keyof typeof ICONS;

type Item = {
    id: string;
    group: Group;
    icon: Icon;
    /** A document under its pull request: the row is indented. */
    nested?: boolean;
    label: string;
    /** Mono text before the label: the ZIP number. */
    lead?: string;
    /** Faint text at the end of the row. */
    hint?: string;
    /** Pagefind excerpt (HTML with <mark>). */
    excerpt?: string;
    run: () => void;
};
/** One document that the palette finds by its number or title. */
type Entry = {
    group: "zips" | "drafts" | "prs" | "external";
    href: string;
    /** For the best-match order: "32" for ZIP 32, "1466" for PR #1466. */
    number: string | null;
    icon: Icon;
    lead?: string;
    title: string;
    hint?: string;
    haystack: string;
    /** Of a pull request: the documents that it adds or changes. */
    docs?: Entry[];
    nested?: boolean;
};

const PAGES = [
    { href: "/", key: "zips" },
    { href: "/drafts/", key: "drafts" },
    { href: "/new/", key: "new" },
    { href: "/prs/", key: "prs" },
    { href: "/external/", key: "external" },
    { href: "/upgrades/", key: "upgrades" },
] as const;
const GROUPS: Group[] = ["zips", "drafts", "prs", "external", "pages", "actions", "text"];
/** Rows for each group: a query with many matches stays a short list. */
const MAX: Record<Entry["group"], number> = { zips: 5, drafts: 3, prs: 3, external: 3 };
/** Documents under one pull request. */
const MAX_DOCS = 3;
const MAX_TEXT = 6;
const TEXT_DEBOUNCE_MS = 120;

type ApiZip = { slug: string; number: number | null; kind: string; title: string; status: string };
type ApiPr = { source: string | null; number: number; title: string; author: string | null; previews?: { slug: string; filename: string; title: string }[] };
const getJson = <T,>(url: string): Promise<T | null> => fetch(url).then((r) => r.ok ? r.json() as Promise<T> : null).catch(() => null);

let index: Promise<Entry[]> | null = null;
/** Every ZIP, draft, PR and external PR, and the documents of each PR, from
 *  the public API. One load per visit. A file that does not load leaves its group empty. */
function loadIndex(): Promise<Entry[]> {
    index ??= Promise.all([
        getJson<{ zips: ApiZip[] }>("/api/zips.json"),
        getJson<{ prs: ApiPr[] }>("/api/prs.json"),
        getJson<{ sources: { id: string; label: string }[]; prs: ApiPr[] }>("/api/external.json"),
    ]).then(([zips, prs, external]) => {
        if (!zips)
            index = null;
        const pr = (p: ApiPr, group: "prs" | "external", href: string, hint?: string): Entry => ({
            group,
            href,
            number: String(p.number),
            icon: "pr",
            title: p.title,
            hint: [hint, `#${p.number}`].filter(Boolean).join(" "),
            haystack: `#${p.number} pr ${p.number} ${p.title} ${p.author ?? ""} ${hint ?? ""}`.toLowerCase(),
            docs: (p.previews ?? []).map((d): Entry => ({
                group,
                href: `${href}${d.slug}/`,
                number: null,
                icon: "diff",
                title: d.title || d.slug,
                haystack: `${d.title} ${d.slug} ${d.filename}`.toLowerCase(),
                nested: true,
            })),
        });
        return [
            ...(zips?.zips ?? []).map((z): Entry => {
                const number = z.kind === "zip" && z.number !== null ? String(z.number) : null;
                return number !== null ? {
                    group: "zips",
                    href: `/zip/${number}/`,
                    number,
                    icon: "file",
                    lead: number,
                    title: z.title,
                    hint: z.status.replace(/\[[^\]]*\]\s*/g, "").split(",")[0].trim(),
                    haystack: `zip ${number} zip-${number} ${z.title}`.toLowerCase(),
                } : {
                    group: "drafts",
                    href: `/drafts/${z.slug}/`,
                    number: null,
                    icon: "file",
                    title: z.title,
                    haystack: `draft ${z.title} ${z.slug}`.toLowerCase(),
                };
            }),
            ...(prs?.prs ?? []).map((p) => pr(p, "prs", `/prs/${p.number}/`, p.author ?? undefined)),
            ...(external?.prs ?? []).map((p) => pr(p, "external", `/external/${p.source}/${p.number}/`, external?.sources.find((s) => s.id === p.source)?.label)),
        ];
    });
    return index;
}

/** Best matches first in each group: the exact number, then a number prefix,
 *  then a title that starts with the query, then the rest in upstream order.
 *  A pull request is a match when it or one of its documents is a match; its
 *  documents that match come under it. The exact PR number shows them all. */
function matchEntries(entries: Entry[], q: string): Entry[] {
    const words = q.split(/\s+/).filter(Boolean);
    const num = q.replace(/^(zip|pr)?[\s#-]*/, "");
    const ok = (e: Entry) => words.every((w) => e.haystack.includes(w));
    const rank = (e: Entry) => e.number === num ? 0
        : e.number?.startsWith(num) && /^\d+$/.test(num) ? 1
            : e.title.toLowerCase().startsWith(q) ? 2 : 3;
    const hits = entries
        .map((e, i) => {
            const docs = e.number === num ? e.docs ?? [] : (e.docs ?? []).filter(ok);
            return ok(e) || docs.length ? { e, docs, r: Math.min(ok(e) ? rank(e) : 3, ...docs.map(rank)), i } : null;
        })
        .filter((x) => x !== null)
        .sort((a, b) => a.r - b.r || a.i - b.i);
    return (Object.keys(MAX) as Entry["group"][]).flatMap((g) => hits
        .filter((x) => x.e.group === g)
        .slice(0, MAX[g])
        .flatMap((x) => [x.e, ...x.docs.slice(0, MAX_DOCS)]));
}

const isEditable = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

/**
 * Command palette: the search of the site. ⌘K (or "/") opens it from any
 * page; the search button in the top bar opens it too.
 *
 * With no query it lists the pages and the actions. With a query it finds
 * ZIPs, drafts, PRs and external PRs by number and title at once, then adds
 * matches from the full text (Pagefind). Styles: "command palette" in globals.css.
 */
export default function CommandPalette() {
    const { open, instant } = useCommandPalette();
    const t = useTranslations("Palette");
    const nav = useTranslations("Nav");
    const locale = useLocale() as Locale;
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [text, setText] = useState<PagefindResultData[]>([]);
    const [pending, setPending] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const returnFocus = useRef<HTMLElement | null>(null);

    useEffect(() => {
        function onKey(e: globalThis.KeyboardEvent) {
            const k = (e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k";
            const slash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !open && !isEditable(e.target);
            if (!k && !slash)
                return;
            e.preventDefault();
            if (open)
                close();
            else
                openCommandPalette({ instant: true });
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    useEffect(() => {
        if (!open)
            return;
        returnFocus.current = document.activeElement as HTMLElement | null;
        let live = true;
        loadIndex().then((list) => live && setEntries(list));
        return () => {
            live = false;
        };
    }, [open]);

    const q = query.trim().toLowerCase();

    useEffect(() => {
        if (!open || !q) {
            setText([]);
            setPending(false);
            return;
        }
        let live = true;
        setPending(true);
        const timer = setTimeout(() => {
            searchPagefind(q, MAX_TEXT * 3)
                .then((res) => live && setText(res))
                .catch(() => live && setText([]))
                .finally(() => live && setPending(false));
        }, TEXT_DEBOUNCE_MS);
        return () => {
            live = false;
            clearTimeout(timer);
        };
    }, [open, q]);

    function close() {
        closeCommandPalette();
        setQuery("");
        setActive(0);
        returnFocus.current?.focus({ preventScroll: true });
    }
    const heading = (g: Group) => g === "drafts" || g === "prs" || g === "external" ? nav(g) : t(g);
    const go = (href: string) => () => router.push(href);

    const matched = q ? matchEntries(entries, q) : [];
    const entryItems: Item[] = matched.map((e) => ({
        id: `${e.group}:${e.href}`,
        group: e.group,
        icon: e.icon,
        nested: e.nested,
        label: e.title,
        lead: e.lead,
        hint: e.hint,
        run: go(localizeHref(e.href, locale)),
    }));
    const pageItems: Item[] = PAGES
        .map((p) => ({ ...p, label: nav(p.key) }))
        .filter((p) => !q || p.label.toLowerCase().includes(q))
        .map((p) => ({ id: `page:${p.href}`, group: "pages", icon: "arrow", label: p.label, run: go(localizeHref(p.href, locale)) }));
    const dark = open && currentTheme() === "dark";
    const themeLabel = nav(dark ? "toLight" : "toDark");
    const actionItems: Item[] = !q || themeLabel.toLowerCase().includes(q) || "theme".includes(q)
        ? [{ id: "action:theme", group: "actions", icon: dark ? "sun" : "moon", label: themeLabel, run: () => void toggleTheme() }]
        : [];
    const shown = new Set(matched.map((e) => localizeHref(e.href, locale)));
    const textItems: Item[] = text
        .filter((r) => !shown.has(r.url))
        .slice(0, MAX_TEXT)
        .map((r) => ({
            id: `text:${r.url}`,
            group: "text",
            icon: /\/(prs|external\/[^/]+)\/\d+\/[^/]+\/$/.test(r.url) ? "diff" : /\/(prs|external\/[^/]+)\/\d+\/$/.test(r.url) ? "pr" : "file",
            label: r.meta?.title ?? r.meta?.display_name ?? r.url,
            excerpt: r.excerpt,
            run: go(r.url),
        }));
    const items = [...entryItems, ...pageItems, ...actionItems, ...textItems];
    const current = Math.min(active, Math.max(items.length - 1, 0));

    useEffect(() => {
        listRef.current?.querySelector("[data-active]")?.scrollIntoView({ block: "nearest" });
    }, [current, open, items.length]);

    function run(i: number) {
        const item = items[i];
        if (!item)
            return;
        close();
        item.run();
    }

    function onInputKey(e: KeyboardEvent<HTMLInputElement>) {
        const n = items.length;
        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                if (n)
                    setActive((current + 1) % n);
                break;
            case "ArrowUp":
                e.preventDefault();
                if (n)
                    setActive((current - 1 + n) % n);
                break;
            case "Enter":
                if (e.nativeEvent.isComposing)
                    break;
                e.preventDefault();
                run(current);
                break;
            case "Escape":
                e.preventDefault();
                close();
                break;
            case "Tab":
                e.preventDefault();
                break;
        }
    }

    if (!open)
        return null;

    return (<div className="cmdk" data-instant={instant || undefined}>
      <div className="cmdk-scrim" onPointerDown={close}/>
      <div role="dialog" aria-modal="true" aria-label={t("label")} className="cmdk-panel">
        <div className="cmdk-search">
          <SearchIcon />
          <input autoFocus role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-activedescendant={items[current] ? `cmdk-${current}` : undefined} aria-label={t("label")} value={query} placeholder={t("placeholder")} spellCheck={false} autoComplete="off" autoCorrect="off" enterKeyHint="go" onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
        }} onKeyDown={onInputKey}/>
        </div>
        <div ref={listRef} id="cmdk-list" role="listbox" aria-label={t("label")} className="cmdk-list">
          {GROUPS.map((group) => {
            const rows = items.map((item, i) => ({ item, i })).filter((r) => r.item.group === group);
            if (!rows.length)
                return null;
            return (<div key={group} role="group" aria-label={heading(group)}>
                <div className="cmdk-heading" aria-hidden>{heading(group)}</div>
                {rows.map(({ item, i }) => (<div key={item.id} id={`cmdk-${i}`} role="option" aria-selected={i === current} data-active={i === current || undefined} data-nested={item.nested || undefined} className="cmdk-item" onPointerMove={() => i !== current && setActive(i)} onClick={() => run(i)}>
                    <svg viewBox="0 0 16 16" className="cmdk-icon" data-icon={item.icon} aria-hidden>
                      <path d={ICONS[item.icon]}/>
                    </svg>
                    {item.lead && <span className="cmdk-lead">{item.lead}</span>}
                    <span className="cmdk-text">
                      <span className="cmdk-label">{item.label}</span>
                      {item.excerpt && <span className="cmdk-excerpt" dangerouslySetInnerHTML={{ __html: item.excerpt }}/>}
                    </span>
                    {item.hint && <span className="cmdk-hint">{item.hint}</span>}
                  </div>))}
              </div>);
        })}
          {items.length === 0 && !pending && (<p className="cmdk-empty">{t("noResults", { query: query.trim() })}</p>)}
        </div>
        <footer className="cmdk-foot" aria-hidden>
          <span><kbd>↑</kbd><kbd>↓</kbd> {t("move")}</span>
          <span><kbd>↵</kbd> {t("select")}</span>
          <span><kbd>esc</kbd> {t("close")}</span>
        </footer>
      </div>
    </div>);
}
export function SearchIcon() {
    return (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <circle cx="7" cy="7" r="4.25"/>
      <path d="m10.25 10.25 3 3"/>
    </svg>);
}

/** The search button in the top bar. It shows the shortcut of the platform. */
export function CommandPaletteTrigger() {
    const t = useTranslations("Palette");
    const [mod, setMod] = useState<string | null>(null);
    useEffect(() => {
        setMod(/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl ");
    }, []);
    return (<button type="button" className="cmdk-trigger" aria-label={t("open")} aria-keyshortcuts="Meta+K Control+K" onClick={() => openCommandPalette()}>
      <SearchIcon />
      <span className="cmdk-trigger-label">{t("open")}</span>
      <kbd style={{ visibility: mod ? undefined : "hidden" }}>{mod ?? "⌘"}K</kbd>
    </button>);
}
