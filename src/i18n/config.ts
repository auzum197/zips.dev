/* Languages of the site.
 *
 * English is the default and has no URL prefix: /zip/200/. Every other
 * language lives under its code: /es/zip/200/. English URLs must never
 * change; they are published.
 *
 * To add a language: add it here, add messages/<code>.json, and translate
 * documents with `pnpm translate`.
 */
export const LOCALES = [
    { id: "en", code: "EN", name: "English" },
    { id: "es", code: "ES", name: "Español" },
] as const;
export type Locale = (typeof LOCALES)[number]["id"];
export const DEFAULT_LOCALE: Locale = "en";
/** Languages that have a URL prefix. */
export const PREFIXED_LOCALES = LOCALES.map((l) => l.id).filter((l) => l !== DEFAULT_LOCALE);
export const isLocale = (value: unknown): value is Locale => LOCALES.some((l) => l.id === value);
/** "/es/zip/200/" → "es"; "/zip/200/" → "en". */
export function localeOfPath(pathname: string): Locale {
    const first = pathname.split("/")[1];
    return first !== DEFAULT_LOCALE && isLocale(first) ? first : DEFAULT_LOCALE;
}
/** "/es/zip/200/" → "/zip/200/". */
export function stripLocale(pathname: string): string {
    const locale = localeOfPath(pathname);
    return locale === DEFAULT_LOCALE ? pathname : pathname.slice(locale.length + 1) || "/";
}
/** The name of a language in another language: ("es", "en") → "Spanish",
 *  ("en", "es") → "inglés". A language names itself in `name` above. */
export function languageName(id: Locale, inLocale: Locale): string {
    return new Intl.DisplayNames([inLocale], { type: "language" }).of(id) ?? id;
}
/** Paths that exist once, for all languages. */
const SHARED = /^\/(api|og|pagefind|upstream|_next)\//;
/** Site path in a language: ("/zip/200/", "es") → "/es/zip/200/". External
 *  URLs, #fragments and shared files are returned as they are. */
export function localizeHref(href: string, locale: Locale): string {
    if (locale === DEFAULT_LOCALE || !href.startsWith("/") || href.startsWith("//") || SHARED.test(href))
        return href;
    return localeOfPath(href) === locale ? href : `/${locale}${href}`;
}
