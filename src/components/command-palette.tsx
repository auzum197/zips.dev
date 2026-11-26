"use client";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { languageName, LOCALES, localizeHref, type Locale } from "@/i18n/config";
import { closeCommandPalette, openCommandPalette, useCommandPalette } from "@/lib/command-palette";
import { useLanguageSwitch } from "@/lib/language";
import { LanguageIcon } from "./lang-switch";
import { searchPagefind, type PagefindResultData } from "@/lib/pagefind";
import { loadIndex, matchEntries, PALETTE_CAPS, textIcon, type Entry } from "@/lib/search-index";
import { currentTheme, toggleTheme } from "@/lib/theme";

type Group = "query" | "zips" | "drafts" | "prs" | "external" | "pages" | "actions" | "text" | "languages";
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
type Octicon = keyof typeof ICONS;
/** A row's icon: an Octicon, the language glyph of the top bar, or the
 *  search glyph of the input. */
type Icon = Octicon | "language" | "search";

type Item = {
    id: string;
    group: Group;
    icon?: Icon;
    /** A document under its pull request: the row is indented. */
    nested?: boolean;
    label: string;
    /** Mono text before the label: the ZIP number. */
    lead?: string;
    /** Faint text at the end of the row. */
    hint?: string;
    /** Lowercase words that find the row and are not shown. */
    keywords?: string;
    /** The language of the page, in the list of languages. */
    current?: boolean;
    /** The palette stays open after it: the action shows another list. */
    keepOpen?: boolean;
    /** Pagefind excerpt (HTML with <mark>). */
    excerpt?: string;
    run: () => void;
};
const PAGES = [
    { href: "/", key: "zips" },
    { href: "/drafts/", key: "drafts" },
    { href: "/new/", key: "new" },
    { href: "/prs/", key: "prs" },
    { href: "/external/", key: "external" },
    { href: "/upgrades/", key: "upgrades" },
] as const;
const GROUPS: Group[] = ["query", "zips", "drafts", "prs", "external", "pages", "actions", "text"];
/** The list of the languages, shown alone behind the action "Switch language": every language under its own name, the one of the page marked, as in the menu of the top bar. */
const LANGUAGES: Group[] = ["languages"];
const MAX_TEXT = 6;
const TEXT_DEBOUNCE_MS = 120;

const isEditable = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
/** For matching a row that was typed without accents: "Español" → "espanol". */
const unaccent = (text: string): string => text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
/* `--ease-out` in globals.css, for the motion that JS drives here. */
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
/** The palette shows one of two lists: its own, or the languages. */
type View = "home" | "languages";
/** The row to highlight in the list of languages: the first language that is not the one of the page, so that Enter again switches. */
const firstOther = (locale: Locale): number => Math.max(0, LOCALES.findIndex((l) => l.id !== locale));

/**
 * Command palette: the search of the site. ⌘K (or "/") opens it from any
 * page; the search button in the top bar opens it too.
 *
 * With no query it lists the pages and the actions: the theme, and the
 * languages. The action "Switch language" shows the languages as a list of
 * their own; Esc goes back to this one. With a query it finds ZIPs, drafts,
 * PRs and external PRs by number and title at once, then adds matches from
 * the full text (Pagefind). The first row is the query itself: it opens the
 * search page, whose URL has the query and is the link to share.
 * Styles: "command palette" in globals.css.
 */
export default function CommandPalette() {
    const { open, instant } = useCommandPalette();
    const t = useTranslations("Palette");
    const nav = useTranslations("Nav");
    const locale = useLocale() as Locale;
    const router = useRouter();
    const switchTo = useLanguageSwitch();
    const [view, setView] = useState<View>("home");
    const [query, setQuery] = useState("");
    const [active, setActive] = useState(0);
    const [entries, setEntries] = useState<Entry[]>([]);
    const [text, setText] = useState<PagefindResultData[]>([]);
    const [pending, setPending] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const returnFocus = useRef<HTMLElement | null>(null);
    const fromHeight = useRef<number | null>(null);
    const resizing = useRef<Animation | null>(null);

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
        if (!open || !q || view !== "home") {
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
    }, [open, q, view]);

    function close() {
        closeCommandPalette();
        setView("home");
        setQuery("");
        setActive(0);
        returnFocus.current?.focus({ preventScroll: true });
    }
    function show(next: View) {
        fromHeight.current = panelRef.current?.offsetHeight ?? null;
        resizing.current?.cancel();
        setView(next);
        setQuery("");
        setActive(next === "languages" ? firstOther(locale) : 0);
    }
    useLayoutEffect(() => {
        const el = panelRef.current;
        const from = fromHeight.current;
        fromHeight.current = null;
        if (!open || !el || from === null)
            return;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        listRef.current?.animate({ opacity: [0, 1] }, { duration: reduce ? 150 : 120, easing: EASE_OUT });
        const to = el.offsetHeight;
        if (!reduce && Math.abs(to - from) > 1)
            resizing.current = el.animate({ height: [`${from}px`, `${to}px`] }, { duration: 200, easing: EASE_OUT });
    }, [view, open]);
    const heading = (g: Group) => g === "drafts" || g === "prs" || g === "external" ? nav(g) : g === "languages" ? t("switchLanguage") : g === "query" ? t("allResults") : t(g);
    const go = (href: string) => () => router.push(href);

    const matched = q ? matchEntries(entries, q, PALETTE_CAPS) : [];
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
    const themeAction: Item = { id: "action:theme", group: "actions", icon: dark ? "sun" : "moon", label: nav(dark ? "toLight" : "toDark"), keywords: "theme", run: () => void toggleTheme() };
    const languageAction: Item = { id: "action:language", group: "actions", icon: "language", label: t("switchLanguage"), keywords: LOCALES.map((l) => `${l.id} ${l.name} ${languageName(l.id, locale)}`).join(" "), keepOpen: true, run: () => show("languages") };
    const actionItems = [themeAction, languageAction]
        .filter((a) => !q || unaccent(a.label).includes(unaccent(q)) || unaccent(a.keywords ?? "").includes(unaccent(q)));
    const shown = new Set(matched.map((e) => localizeHref(e.href, locale)));
    const textItems: Item[] = text
        .filter((r) => !shown.has(r.url))
        .slice(0, MAX_TEXT)
        .map((r) => ({
            id: `text:${r.url}`,
            group: "text",
            icon: textIcon(r.url),
            label: r.meta?.title ?? r.meta?.display_name ?? r.url,
            excerpt: r.excerpt,
            run: go(r.url),
        }));
    const languageItems: Item[] = LOCALES
        .map((l): Item => ({ id: `lang:${l.id}`, group: "languages", lead: l.code, label: l.name, current: l.id === locale, keywords: `${l.id} ${languageName(l.id, locale)}`, run: () => switchTo(l.id) }))
        .filter((a) => !q || unaccent(a.label).includes(unaccent(q)) || unaccent(a.keywords ?? "").includes(unaccent(q)));
    /* What was typed, as the first row. The highlight starts on it, so Enter
     * opens the search page of the query. */
    const queryItems: Item[] = q ? [{ id: "query", group: "query", icon: "search", label: query.trim(), hint: t("allResults"), run: go(`${localizeHref("/search/", locale)}?q=${encodeURIComponent(query.trim())}`) }] : [];
    const items = view === "languages" ? languageItems : [...queryItems, ...entryItems, ...pageItems, ...actionItems, ...textItems];
    const current = Math.min(active, Math.max(items.length - 1, 0));

    useEffect(() => {
        listRef.current?.querySelector("[data-active]")?.scrollIntoView({ block: "nearest" });
    }, [current, open, items.length]);

    function run(i: number) {
        const item = items[i];
        if (!item)
            return;
        if (!item.keepOpen)
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
                if (view === "languages")
                    show("home");
                else
                    close();
                break;
            case "Backspace":
                if (view === "languages" && !query)
                    show("home");
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
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label={t("label")} className="cmdk-panel">
        <div className="cmdk-search">
          {view === "languages" ? (<button type="button" className="cmdk-back" aria-label={t("back")} onClick={() => show("home")}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
              <path d="M10 3L5 8l5 5"/>
            </svg>
          </button>) : <SearchIcon />}
          <input autoFocus role="combobox" aria-expanded="true" aria-controls="cmdk-list" aria-activedescendant={items[current] ? `cmdk-${current}` : undefined} aria-label={t("label")} value={query} placeholder={view === "languages" ? t("switchLanguage") : t("placeholder")} spellCheck={false} autoComplete="off" autoCorrect="off" enterKeyHint={view === "home" && q ? "search" : "go"} onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
        }} onKeyDown={onInputKey}/>
        </div>
        <div ref={listRef} id="cmdk-list" role="listbox" aria-label={t("label")} className="cmdk-list">
          {(view === "languages" ? LANGUAGES : GROUPS).map((group) => {
            const rows = items.map((item, i) => ({ item, i })).filter((r) => r.item.group === group);
            if (!rows.length)
                return null;
            return (<div key={group} role="group" aria-label={heading(group)}>
                {group !== "languages" && group !== "query" && (<div className="cmdk-heading" aria-hidden>{heading(group)}</div>)}
                {rows.map(({ item, i }) => (<div key={item.id} id={`cmdk-${i}`} role="option" aria-selected={i === current} aria-current={item.current || undefined} data-active={i === current || undefined} data-nested={item.nested || undefined} className="cmdk-item" onPointerMove={() => i !== current && setActive(i)} onClick={() => run(i)}>
                    {item.icon && <RowIcon icon={item.icon}/>}
                    {item.lead && <span className="cmdk-lead">{item.lead}</span>}
                    <span className="cmdk-text">
                      <span className="cmdk-label">{item.label}</span>
                      {item.excerpt && <span className="cmdk-excerpt" dangerouslySetInnerHTML={{ __html: item.excerpt }}/>}
                    </span>
                    {item.hint && <span className="cmdk-hint">{item.hint}</span>}
                    {item.current && (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="cmdk-check" aria-hidden>
                      <path d="M3.5 8.5l3 3 6-7"/>
                    </svg>)}
                  </div>))}
              </div>);
        })}
          {items.length === 0 && !pending && (<p className="cmdk-empty">{t("noResults", { query: query.trim() })}</p>)}
        </div>
        <footer className="cmdk-foot" aria-hidden>
          <span><kbd>↑</kbd><kbd>↓</kbd> {t("move")}</span>
          <span><kbd>↵</kbd> {t(view === "languages" ? "choose" : "select")}</span>
          <span><kbd>esc</kbd> {t(view === "languages" ? "back" : "close")}</span>
        </footer>
      </div>
    </div>);
}
/** The icon of a row. The languages have the glyph of the top bar, so that
 *  both controls show the same one. The search page has the same icons. */
export function RowIcon({ icon }: { icon: Icon }) {
    if (icon === "language")
        return <LanguageIcon className="cmdk-icon cmdk-stroke" />;
    if (icon === "search")
        return <SearchIcon className="cmdk-icon cmdk-stroke"/>;
    return (<svg viewBox="0 0 16 16" className="cmdk-icon" data-icon={icon} aria-hidden>
      <path d={ICONS[icon]}/>
    </svg>);
}
export function SearchIcon({ className = "h-3.5 w-3.5 shrink-0" }: { className?: string }) {
    return (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className} aria-hidden>
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
