"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { LOCALES, localeOfPath, localizeHref, stripLocale } from "@/i18n/config";
/** Blocks that exist 1:1 in every language: the translator keeps the tag
 *  structure, so the nth block of one page is the nth block of the other. */
const BLOCKS = ".prose :is(h1,h2,h3,h4,h5,h6,p,li,dt,dd,pre,tr)";
/** What the cascade brings in one by one: the title, the translation notice
 *  and the leaf text blocks. */
const LEAVES = ":scope > header > h1, :scope > aside, .prose :is(h1,h2,h3,h4,h5,h6,p,pre,dt,tr,li:not(:has(p)))";
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const STEP = 26; // ms between blocks
const MAX_SPREAD = 300; // the last block starts no later than this
interface Anchor {
    index: number;
    /** Distance from the top of the scroller to the top of the block. */
    offset: number;
}
const article = () => document.querySelector<HTMLElement>("main article");
const blocks = () => [...(article()?.querySelectorAll<HTMLElement>(BLOCKS) ?? [])];
/** The block to hold still: the first one that starts in the top half of
 *  the view, so the line that stays in place is one the reader can see. When
 *  one long block fills the view, the block that crosses the top edge. */
function readAnchor(scroller: HTMLElement): Anchor | null {
    if (scroller.scrollTop <= 0)
        return null;
    const box = scroller.getBoundingClientRect();
    const rects = blocks().map((el) => el.getBoundingClientRect());
    let index = rects.findIndex((r) => r.top >= box.top && r.top < box.top + box.height / 2);
    if (index < 0)
        index = rects.findIndex((r) => r.bottom > box.top + 8);
    return index < 0 ? null : { index, offset: rects[index].top - box.top };
}
function restoreAnchor(scroller: HTMLElement, anchor: Anchor): void {
    const el = blocks()[anchor.index];
    if (el)
        scroller.scrollTop += el.getBoundingClientRect().top - scroller.getBoundingClientRect().top - anchor.offset;
}
/** A copy of the article that is on screen now. It stays in place over the
 *  next page for the moment the old text needs to go out. */
function makeGhost(): { el: HTMLElement; rect: DOMRect } | null {
    const source = article();
    if (!source)
        return null;
    const el = source.cloneNode(true) as HTMLElement;
    // the phone "Contents" button and its sheet are fixed UI, not text
    el.querySelectorAll("[data-pagefind-ignore], dialog").forEach((n) => n.remove());
    el.querySelectorAll("[id]").forEach((n) => n.removeAttribute("id"));
    el.removeAttribute("data-pagefind-body");
    el.setAttribute("aria-hidden", "true");
    el.inert = true;
    el.classList.add("lang-ghost");
    return { el, rect: source.getBoundingClientRect() };
}
/** Cascade: the old text goes out fast, then the new blocks in view come in
 *  one by one from the top. Blocks out of view do not animate. */
function cascade(ghost: { el: HTMLElement; rect: DOMRect } | null, scroller: HTMLElement | null): void {
    const next = article();
    if (!next) {
        // a list page: no long text to hold in place, a short fade is enough
        document.querySelector("main")?.animate({ opacity: [0, 1] }, { duration: 200, easing: "ease" });
        return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animations: Animation[] = [];
    if (ghost) {
        ghost.el.style.width = `${ghost.rect.width}px`;
        (next.closest("main") ?? document.body).append(ghost.el);
        const at = ghost.el.getBoundingClientRect();
        ghost.el.style.transform = `translate(${ghost.rect.left - at.left}px, ${ghost.rect.top - at.top}px)`;
        animations.push(ghost.el.animate({ opacity: [1, 0] }, { duration: reduce ? 200 : 110, easing: "ease-out", fill: "forwards" }));
    }
    if (reduce)
        animations.push(next.animate({ opacity: [0, 1] }, { duration: 200, easing: "ease" }));
    else {
        const top = scroller?.getBoundingClientRect().top ?? 0;
        const visible = [...next.querySelectorAll<HTMLElement>(LEAVES)].filter((el) => {
            const r = el.getBoundingClientRect();
            return r.bottom > top && r.top < window.innerHeight;
        });
        const step = Math.min(STEP, MAX_SPREAD / Math.max(visible.length, 1));
        visible.forEach((el, i) => animations.push(el.animate({ opacity: [0, 1], transform: ["translateY(6px)", "translateY(0)"] }, { duration: 220, delay: 70 + i * step, easing: EASE_OUT, fill: "backwards" })));
    }
    // the contents list changes language too
    document.querySelectorAll<HTMLElement>("main nav[data-toc]").forEach((el) => animations.push(el.animate({ opacity: [0, 1] }, { duration: 200, easing: "ease" })));
    Promise.allSettled(animations.map((a) => a.finished)).then(() => ghost?.el.remove());
}
/** The "文A" translation glyph (shape from Lucide's "languages" icon, ISC). */
function LanguageIcon() {
    return (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0" aria-hidden>
      <path d="m5 8 6 6"/>
      <path d="m4 14 6-6 2-3"/>
      <path d="M2 5h12"/>
      <path d="M7 2h1"/>
      <path d="m22 22-5-10-5 10"/>
      <path d="M14 18h6"/>
    </svg>);
}
/**
 * Language menu in the top bar: the global language switch. Every page
 * exists in every language as a static page (English with no prefix, the
 * others under /<code>/), so the menu only navigates to the same page in
 * the other language.
 *
 * The button shows the language code, which rolls like a counter on a change.
 * The menu opens from the button's corner and its rows come in one by one.
 * On a document, the text is replaced with the same motion (see cascade) and
 * the reader stays on the same paragraph. Styles: "language menu" in
 * globals.css.
 */
export default function LangSwitch({ className }: {
    className?: string;
}) {
    const t = useTranslations("Nav");
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const locale = localeOfPath(pathname);
    const index = LOCALES.findIndex((l) => l.id === locale);
    const base = stripLocale(pathname);
    const href = (l: (typeof LOCALES)[number]) => localizeHref(base, l.id);
    /* Work that must run when the other language's page is in the DOM. */
    const onArrive = useRef<(() => void) | null>(null);
    useLayoutEffect(() => {
        onArrive.current?.();
        onArrive.current = null;
    }, [pathname]);
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
    function go(e: MouseEvent<HTMLAnchorElement>, target: (typeof LOCALES)[number]) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
            return;
        e.preventDefault();
        setOpen(false);
        trigger.current?.focus();
        if (target.id === locale)
            return;
        document.querySelectorAll(".lang-ghost").forEach((n) => n.remove());
        const scroller = document.getElementById("scroll-root");
        const html = document.documentElement;
        const anchor = scroller ? readAnchor(scroller) : null;
        const ghost = makeGhost();
        // read by ScrollReset: do not jump to the top
        html.dataset.langSwitch = "";
        const done = () => delete html.dataset.langSwitch;
        // never leave the flag set if the navigation does not land
        const guard = setTimeout(() => { onArrive.current = null; done(); }, 3000);
        onArrive.current = () => {
            clearTimeout(guard);
            if (scroller && anchor)
                restoreAnchor(scroller, anchor);
            cascade(ghost, scroller);
            // ScrollReset reads the flag in a later effect; keep it until the text is in
            setTimeout(done, 600);
        };
        router.push(href(target) + window.location.hash, { scroll: false });
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
            <Link data-item href={href(l)} hrefLang={l.id} lang={l.id} aria-current={l.id === locale ? "true" : undefined} className="lang-menu-item" onClick={(e) => go(e, l)}>
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
