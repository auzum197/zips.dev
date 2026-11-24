"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { LOCALES, localeOfPath, localizeHref, stripLocale, type Locale } from "@/i18n/config";
import { useLanguageSwitch } from "@/lib/language";
/** The "文A" language glyph (shape from Lucide's "languages" icon, ISC). The
 *  menu of the top bar and the command palette show the same one. */
export function LanguageIcon({ className = "h-3.5 w-3.5 shrink-0" }: {
    className?: string;
}) {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="m5 8 6 6"/>
      <path d="m4 14 6-6 2-3"/>
      <path d="M2 5h12"/>
      <path d="M7 2h1"/>
      <path d="m22 22-5-10-5 10"/>
      <path d="M14 18h6"/>
    </svg>);
}
/**
 * Language menu in the top bar. Every page exists in every language as a
 * static page (English with no prefix, the others under /<code>/), so the
 * menu only goes to the same page in the other language. The switch itself,
 * which the command palette uses too, is in lib/language.ts.
 *
 * The button shows the language code, which rolls like a counter on a change.
 * The menu opens from the button's corner and its rows come in one by one.
 * On a document, the text is replaced with the same motion and the reader
 * stays on the same paragraph. Styles: "language menu" in globals.css.
 */
export default function LangSwitch({ className }: {
    className?: string;
}) {
    const t = useTranslations("Nav");
    const pathname = usePathname();
    const switchTo = useLanguageSwitch();
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const locale = localeOfPath(pathname);
    const index = LOCALES.findIndex((l) => l.id === locale);
    const base = stripLocale(pathname);
    const href = (l: (typeof LOCALES)[number]) => localizeHref(base, l.id);
    useEffect(() => {
        if (!open)
            return;
        const onDown = (e: PointerEvent) => {
            if (!root.current?.contains(e.target as Node))
                setOpen(false);
        };
        document.addEventListener("pointerdown", onDown);
        return () => document.removeEventListener("pointerdown", onDown);
    }, [open]);
    function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
        if (e.key === "Escape" && open) {
            setOpen(false);
            trigger.current?.focus();
            return;
        }
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp")
            return;
        e.preventDefault();
        if (!open) {
            setOpen(true);
            return;
        }
        const items = [...(root.current?.querySelectorAll<HTMLAnchorElement>("a[data-item]") ?? [])];
        const at = items.indexOf(document.activeElement as HTMLAnchorElement);
        items[(at + (e.key === "ArrowUp" ? -1 : 1) + items.length) % items.length]?.focus();
    }
    function go(e: MouseEvent<HTMLAnchorElement>, target: Locale) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
            return;
        e.preventDefault();
        setOpen(false);
        trigger.current?.focus();
        switchTo(target);
    }
    return (<div ref={root} className={["lang-menu", className].filter(Boolean).join(" ")} data-open={open || undefined} onKeyDown={onKeyDown} onBlur={(e) => { if (e.relatedTarget && !root.current?.contains(e.relatedTarget as Node))
        setOpen(false); }}>
      <button ref={trigger} type="button" className="lang-menu-trigger" aria-expanded={open} aria-controls="lang-menu-list" aria-label={t("language", { name: LOCALES[index].name })} onClick={() => setOpen(!open)}>
        <LanguageIcon />
        <span className="lang-menu-roll" aria-hidden>
          <span className="lang-menu-roll-col" style={{ transform: `translateY(${-index}rem)` }}>
            {LOCALES.map((l) => <span key={l.id}>{l.code}</span>)}
          </span>
        </span>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="lang-menu-chevron h-3 w-3 shrink-0" aria-hidden>
          <path d="M4 6l4 4 4-4"/>
        </svg>
      </button>
      <ul id="lang-menu-list" className="lang-menu-panel" inert={!open}>
        {LOCALES.map((l, i) => (<li key={l.id} className="lang-menu-row" style={{ "--i": i } as React.CSSProperties}>
            <Link data-item href={href(l)} hrefLang={l.id} lang={l.id} aria-current={l.id === locale ? "true" : undefined} className="lang-menu-item" onClick={(e) => go(e, l.id)}>
              <span className="lang-menu-code">{l.code}</span>
              <span className="lang-menu-name">{l.name}</span>
              {l.id === locale && (<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden>
                  <path d="M3.5 8.5l3 3 6-7"/>
                </svg>)}
            </Link>
          </li>))}
      </ul>
    </div>);
}
