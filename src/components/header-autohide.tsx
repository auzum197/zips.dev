"use client";
import { useEffect } from "react";
/**
 * Phone header behaviour. The header is absolutely positioned over #scroll-root
 * below 48rem (globals.css); this hides it while reading downwards and brings
 * it back on the first upward scroll, at the top, or when the viewport widens.
 * It also publishes the header's height as --header-h so the scroller can
 * reserve exactly that much space (zen mode uses it on every width).
 */
const THRESHOLD = 12; // px of travel in one direction before toggling
const PHONE = "(width < 48rem)";
export default function HeaderAutohide() {
    useEffect(() => {
        const header = document.getElementById("site-header");
        const scroller = document.getElementById("scroll-root");
        if (!header || !scroller)
            return;
        const root = document.documentElement;
        const mq = window.matchMedia(PHONE);
        const ro = new ResizeObserver(() => root.style.setProperty("--header-h", `${header.offsetHeight}px`));
        ro.observe(header);
        let last = scroller.scrollTop;
        let acc = 0;
        let hidden = false;
        let holdUntil = 0;
        const set = (next: boolean) => {
            if (next === hidden)
                return;
            hidden = next;
            header.dataset.hidden = String(next);
        };
        const onScroll = () => {
            if (!mq.matches) {
                set(false);
                return;
            }
            const y = scroller.scrollTop;
            const dy = y - last;
            last = y;
            if (y <= 0) {
                acc = 0;
                set(false);
                return;
            }
            if (dy === 0 || performance.now() < holdUntil)
                return;
            if ((dy > 0) !== (acc > 0))
                acc = 0;
            acc += dy;
            if (acc > THRESHOLD && y > header.offsetHeight)
                set(true);
            else if (acc < -THRESHOLD)
                set(false);
        };
        // an in-page jump (ToC, footnote) means reading: tuck the header away and
        // ignore the smooth-scroll travel so it does not pop back mid-flight
        const onHash = () => {
            if (!mq.matches)
                return;
            set(true);
            acc = 0;
            holdUntil = performance.now() + 800;
        };
        const onMq = () => {
            if (!mq.matches)
                set(false);
        };
        scroller.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("hashchange", onHash);
        mq.addEventListener("change", onMq);
        return () => {
            ro.disconnect();
            scroller.removeEventListener("scroll", onScroll);
            window.removeEventListener("hashchange", onHash);
            mq.removeEventListener("change", onMq);
            root.style.removeProperty("--header-h");
            delete header.dataset.hidden;
        };
    }, []);
    return null;
}
