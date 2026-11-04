"use client";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { ZipHeading } from "@/lib/types";
export default function ZipToc({ headings }: {
    headings: ZipHeading[];
}) {
    const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);
    useEffect(() => {
        if (headings.length === 0)
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
    }, [headings]);
    if (headings.length === 0)
        return null;
    return (<nav aria-label="On this page">
      <p className="mb-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Contents
      </p>
      <ul className="m-0 mt-2 list-none p-0">
        {headings.map((h) => {
            const level = Math.min(Math.max(h.level, 1), 4);
            const indent = (level - 1) * 0.85;
            return (<li key={h.id} style={indent ? { paddingLeft: `${indent}rem` } : undefined}>
              <a href={`#${h.id}`} className={cn("block py-0.5 text-[0.8125rem] leading-[1.4] text-muted-foreground no-underline transition-colors hover:text-accent", activeId === h.id && "font-semibold text-accent")}>
                {h.text}
              </a>
            </li>);
        })}
      </ul>
    </nav>);
}
