import { cache } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
/* The language of the page that is being rendered.
 *
 * The site is a static export: there is no request to read a language from.
 * A page under /[locale]/ calls setPageLocale before it renders (see
 * localized.tsx); an English page calls nothing and gets the default.
 * React's cache() gives one store per page render.
 */
const store = cache((): { locale: Locale } => ({ locale: DEFAULT_LOCALE }));
export function setPageLocale(locale: Locale): void {
    store().locale = locale;
}
export function getPageLocale(): Locale {
    return store().locale;
}
