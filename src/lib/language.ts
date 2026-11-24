import { usePathname, useRouter } from "next/navigation";
import { useLayoutEffect } from "react";
import { localizeHref, localeOfPath, stripLocale, type Locale } from "@/i18n/config";

/* The language of a page is its URL (see i18n/config.ts): every page exists
 * in every language as a static page. The controls that change the language,
 * the menu in the top bar and the action of the command palette, go through
 * here, so each one switches with the same motion.
 *
 * On a document the text is replaced as a cascade: the old text goes out
 * fast, then the new blocks in view come in one by one from the top. The
 * reader stays on the same paragraph. */
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

/** The work of the last switch, for the moment the other language's page is
 *  in the DOM. */
let onArrive: (() => void) | null = null;
let guard: ReturnType<typeof setTimeout> | undefined;

/** Goes to the same page in another language. The text on screen stays in
 *  place until the other language's page is in the DOM (see makeGhost). */
function switchLanguage(router: ReturnType<typeof useRouter>, pathname: string, target: Locale): void {
    if (localeOfPath(pathname) === target)
        return;
    clearTimeout(guard);
    document.querySelectorAll(".lang-ghost").forEach((n) => n.remove());
    const scroller = document.getElementById("scroll-root");
    const html = document.documentElement;
    const anchor = scroller ? readAnchor(scroller) : null;
    const ghost = makeGhost();
    // read by ScrollReset: do not jump to the top
    html.dataset.langSwitch = "";
    const done = () => delete html.dataset.langSwitch;
    // never leave the flag set if the navigation does not land
    guard = setTimeout(() => { onArrive = null; done(); }, 3000);
    onArrive = () => {
        clearTimeout(guard);
        if (scroller && anchor)
            restoreAnchor(scroller, anchor);
        cascade(ghost, scroller);
        // ScrollReset reads the flag in a later effect; keep it until the text is in
        setTimeout(done, 600);
    };
    router.push(localizeHref(stripLocale(pathname), target) + window.location.hash, { scroll: false });
}

/** The language switch, for a control. Returns the function that goes to a
 *  language. It also runs, on every path change, the work a switch left for
 *  the new page, so a control that uses it stays mounted across pages. */
export function useLanguageSwitch(): (target: Locale) => void {
    const router = useRouter();
    const pathname = usePathname();
    useLayoutEffect(() => {
        onArrive?.();
        onArrive = null;
    }, [pathname]);
    return (target) => switchLanguage(router, pathname, target);
}
