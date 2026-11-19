"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
export default function ThemeToggle() {
    const t = useTranslations("Nav");
    const [theme, setTheme] = useState<"light" | "dark" | null>(null);
    useEffect(() => {
        setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
    }, []);
    function toggle() {
        const next = theme === "dark" ? "light" : "dark";
        setTheme(next);
        const c = document.documentElement.classList;
        c.toggle("dark", next === "dark");
        c.toggle("light", next === "light");
        try {
            localStorage.setItem("zd-theme", next);
        }
        catch { }
    }
    return (<Button variant="ghost" size="icon" onClick={toggle} aria-label={t(theme === "dark" ? "toLight" : "toDark")} title={t(theme === "dark" ? "toLight" : "toDark")}>
      {theme === "dark" ? "☼" : "☾"}
    </Button>);
}
