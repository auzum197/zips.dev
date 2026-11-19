import type { Metadata } from "next";
import type { ComponentType } from "react";
import { ORIGIN } from "@/lib/og";
import { isLocale, localizeHref, PREFIXED_LOCALES, type Locale } from "./config";
import { setPageLocale } from "./server";
/* Makes the /[locale]/… version of an English page.
 *
 * Each file under src/app/[locale]/ is three lines: it imports the English
 * page module and exports what this returns. The page itself is not
 * duplicated; it renders in the language set here.
 */
type Params = Record<string, string>;
interface PageModule {
    default: ComponentType<any>;
    generateStaticParams?: () => Params[] | Promise<Params[]>;
    generateMetadata?: (props: any) => Metadata | Promise<Metadata>;
    metadata?: Metadata;
}
interface Props {
    params: Promise<Params & {
        locale: string;
    }>;
}
function localizeMetadata(meta: Metadata, locale: Locale): Metadata {
    const canonical = meta.alternates?.canonical;
    if (typeof canonical !== "string")
        return meta;
    const path = localizeHref(canonical, locale);
    return {
        ...meta,
        alternates: { ...meta.alternates, canonical: path },
        openGraph: meta.openGraph ? { ...meta.openGraph, url: `${ORIGIN}${path}`, locale } : meta.openGraph,
    };
}
export function localized(mod: PageModule) {
    const Page = mod.default;
    return {
        async generateStaticParams(): Promise<Params[]> {
            const base = mod.generateStaticParams ? await mod.generateStaticParams() : [{}];
            return PREFIXED_LOCALES.flatMap((locale) => base.map((p) => ({ ...p, locale })));
        },
        async generateMetadata(props: Props): Promise<Metadata> {
            const { locale } = await props.params;
            if (!isLocale(locale))
                return {};
            setPageLocale(locale);
            const meta = mod.generateMetadata ? await mod.generateMetadata(props) : (mod.metadata ?? {});
            return localizeMetadata(meta, locale);
        },
        async Page(props: Props) {
            const { locale } = await props.params;
            if (isLocale(locale))
                setPageLocale(locale);
            return <Page {...props}/>;
        },
    };
}
