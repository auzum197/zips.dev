"use client";
import { usePathname } from "next/navigation";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { useEffect, type ReactNode } from "react";
import { localeOfPath, type Locale } from "./config";
/** Messages for client components. The root layout is shared by all
 *  languages and cannot know the language on the server, so it passes every
 *  language's messages and this picks by URL. */
export default function I18nProvider({ messages, children }: {
    messages: Record<Locale, AbstractIntlMessages>;
    children: ReactNode;
}) {
    const locale = localeOfPath(usePathname());
    // The static HTML gets its lang from scripts/html-lang.mts; this keeps it
    // right after a client-side language change.
    useEffect(() => {
        document.documentElement.lang = locale;
    }, [locale]);
    return (<NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="UTC">
      {children}
    </NextIntlClientProvider>);
}
