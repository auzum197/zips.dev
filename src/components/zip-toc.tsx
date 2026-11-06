"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ZipHeading } from "@/lib/types";
export default function ZipToc({ headings, floating = false }: {
    headings: ZipHeading[];
    /** Narrow viewports: a floating "Contents" pill that opens a bottom sheet (no active-heading tracking). */
    floating?: boolean;
}) {
    const [activeId, setActiveId] = useState<string | null>(floating ? null : (headings[0]?.id ?? null));
    const sheetRef = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        if (headings.length === 0 || floating)
            return;
        const visible = new Set<string>();
        const BAND_TOP = 90;
        const update = () => {
            for (const h of headings) {
                if (visible.has(h.id)) {
                    setActiveId(h.id);
                    return;
                }
            }
            let last: string | null = null;
            for (const h of headings) {
                const el = document.getElementById(h.id);
                if (el && el.getBoundingClientRect().top <= BAND_TOP)
                    last = h.id;
            }
            if (last)
                setActiveId(last);
        };
        const io = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting)
                    visible.add(e.target.id);
                else
                    visible.delete(e.target.id);
            }
            update();
        }, { rootMargin: "-72px 0px -65% 0px" });
        for (const h of headings) {
            const el = document.getElementById(h.id);
            if (el)
                io.observe(el);
        }
        update();
        return () => io.disconnect();
    }, [headings, floating]);
    if (headings.length === 0)
        return null;
    const label = "Contents";
    const labelClass = "text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground";
    const list = (<ul className={cn("m-0 list-none p-0", floating ? "" : "mt-2")}>
        {headings.map((h) => {
            const level = Math.min(Math.max(h.level, 1), 4);
            const indent = (level - 1) * 0.85;
            return (<li key={h.id} style={indent ? { paddingLeft: `${indent}rem` } : undefined}>
              <a href={`#${h.id}`} className={cn("block text-muted-foreground no-underline transition-colors hover:text-accent", floating ? "py-2 text-[0.9375rem] leading-[1.4]" : "py-0.5 text-[0.8125rem] leading-[1.4]", activeId === h.id && "font-semibold text-accent")}>
                {h.text}
              </a>
            </li>);
        })}
      </ul>);
    if (floating) {
        const open = () => sheetRef.current?.showModal();
        const close = () => sheetRef.current?.close();
        return (<>
        <button type="button" onClick={open} aria-haspopup="dialog" className={cn("zen-dim fixed right-4 bottom-4 z-30 flex h-10 items-center gap-1.5 rounded-full border border-border bg-background/90 pr-4 pl-3.5 shadow-md backdrop-blur transition-colors hover:text-foreground [padding-bottom:0] [margin-bottom:env(safe-area-inset-bottom)]", labelClass)}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden>
            <path d="M3 4.5h10M3 8h10M3 11.5h6"/>
          </svg>
          {label}
        </button>
        <dialog ref={sheetRef} className="toc-sheet" aria-label="On this page" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
          <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-1">
            <p className={labelClass}>{label}</p>
            <button type="button" onClick={close} aria-label="Close table of contents" className="-mr-2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="h-3.5 w-3.5" aria-hidden>
                <path d="M4 4l8 8M12 4l-8 8"/>
              </svg>
            </button>
          </div>
          <nav aria-label="On this page" className="min-h-0 overflow-y-auto px-5 pb-5 [overscroll-behavior:contain]" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) close(); }}>
            {list}
          </nav>
        </dialog>
      </>);
    }
    return (<nav aria-label="On this page">
      <p className={cn("mb-2.5", labelClass)}>{label}</p>
      {list}
    </nav>);
}
