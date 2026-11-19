import { getRequestConfig } from "next-intl/server";
import { getPageLocale } from "./server";
/* next-intl configuration for server components. The language comes from
 * our own per-render store, not from the request: next-intl's requestLocale
 * reads headers, which a static export does not have. */
export default getRequestConfig(async () => {
    const locale = getPageLocale();
    return {
        locale,
        messages: (await import(`../../messages/${locale}.json`)).default,
        timeZone: "UTC",
    };
});
