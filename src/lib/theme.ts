/* The colour theme lives as a class on <html> (see themeInit in
 * app/layout.tsx). Every control that changes it goes through here, so each
 * one shows the same state. */
export type Theme = "light" | "dark";
const EVENT = "zd-theme";

export function currentTheme(): Theme {
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function toggleTheme(): Theme {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    const c = document.documentElement.classList;
    c.toggle("dark", next === "dark");
    c.toggle("light", next === "light");
    try {
        localStorage.setItem("zd-theme", next);
    }
    catch { }
    window.dispatchEvent(new Event(EVENT));
    return next;
}

export function onThemeChange(fn: () => void): () => void {
    window.addEventListener(EVENT, fn);
    return () => window.removeEventListener(EVENT, fn);
}
