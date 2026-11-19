import NextLink from "next/link";
import { useLocale } from "next-intl";
import type { ComponentProps } from "react";
import { localizeHref, type Locale } from "./config";
/** next/link that stays in the reader's language: a site path gets the
 *  language prefix, an external URL is not changed. Use it for every link
 *  in the interface. Works in server and client components. */
export default function Link({ href, ...props }: Omit<ComponentProps<typeof NextLink>, "href"> & {
    href: string;
}) {
    const locale = useLocale() as Locale;
    return <NextLink href={localizeHref(href, locale)} {...props}/>;
}
