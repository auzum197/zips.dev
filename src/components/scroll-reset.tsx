"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
/** The document does not scroll (see globals.css); #scroll-root does. Next.js
 *  resets only the document on navigation, so reset the scroller ourselves. */
export default function ScrollReset() {
    const pathname = usePathname();
    const first = useRef(true);
    useEffect(() => {
        if (first.current) {
            first.current = false;
            return;
        }
        if (window.location.hash)
            return;
        document.getElementById("scroll-root")?.scrollTo({ top: 0, behavior: "instant" });
    }, [pathname]);
    return null;
}
