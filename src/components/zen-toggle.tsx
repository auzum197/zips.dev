"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
const EASE = "cubic-bezier(0.23, 1, 0.32, 1)";
function glideArticle() {
    const el = document.querySelector<HTMLElement>("main article");
    if (!el || typeof el.animate !== "function")
        return;
    const before = el.getBoundingClientRect();
    document.documentElement.classList.toggle("zen");
    const after = el.getBoundingClientRect();
    const dx = before.left - after.left;
    const dy = before.top - after.top;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2)
        return;
    el.animate({ transform: [`translate(${dx}px, ${dy}px)`, "translate(0px, 0px)"] }, { duration: 350, easing: EASE });
}
export default function ZenToggle() {
    const t = useTranslations("Nav");
    const [zen, setZen] = useState(false);
    useEffect(() => {
        try {
            setZen(localStorage.getItem("zd-zen") === "1");
        }
        catch { }
    }, []);
    useEffect(() => {
        document.documentElement.classList.toggle("zen", zen);
    }, [zen]);
    function toggle() {
        const nextValue = !zen;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) {
            setZen(nextValue);
            try {
                localStorage.setItem("zd-zen", nextValue ? "1" : "0");
            }
            catch { }
            return;
        }
        glideArticle();
        setZen(nextValue);
        try {
            localStorage.setItem("zd-zen", nextValue ? "1" : "0");
        }
        catch { }
    }
    return (<Button type="button" variant="ghost" size="sm" onClick={toggle} aria-pressed={zen} title={t(zen ? "zenExit" : "zenEnter")} className="zen:pointer-events-auto zen:bg-background/70 aria-pressed:bg-muted aria-pressed:text-foreground">
      {t("zen")}
    </Button>);
}
