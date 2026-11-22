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
    // All colours change in the same frame. Without this, the elements that
    // have a colour transition go to the new theme later than the page.
    c.add("theme-switch");
    c.toggle("dark", next === "dark");
    c.toggle("light", next === "light");
    void getComputedStyle(document.documentElement).opacity;
    requestAnimationFrame(() => requestAnimationFrame(() => c.remove("theme-switch")));
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
