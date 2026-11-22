"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { currentTheme, onThemeChange, toggleTheme, type Theme } from "@/lib/theme";
export default function ThemeToggle() {
    const t = useTranslations("Nav");
    const [theme, setTheme] = useState<Theme | null>(null);
    useEffect(() => {
        const sync = () => setTheme(currentTheme());
        sync();
        return onThemeChange(sync);
    }, []);
    const toggle = () => setTheme(toggleTheme());
    return (<Button variant="ghost" size="icon" onClick={toggle} aria-label={t(theme === "dark" ? "toLight" : "toDark")} title={t(theme === "dark" ? "toLight" : "toDark")}>
      {theme === "dark" ? "☼" : "☾"}
    </Button>);
}
