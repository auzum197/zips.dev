import type { Metadata } from "next";
import { useLocale, useTranslations } from "next-intl";
import { LOCALES, localizeHref } from "@/i18n/config";
import IndexFilters, { type IndexRow } from "@/components/index-filters";
import PageHeader from "@/components/page-header";
import { getNumberedZips, getUpgrades, localTitle } from "@/lib/data";
import { statusGroup } from "@/lib/types";
export const metadata: Metadata = {
    title: { absolute: "zipreader" },
    alternates: { canonical: "/", languages: Object.fromEntries(LOCALES.map((l) => [l.id, localizeHref("/", l.id)])) },
};
export default function HomePage() {
    const t = useTranslations("Home");
    const locale = useLocale();
    const zips = [...getNumberedZips()].sort((a, b) => (a.number ?? 0) - (b.number ?? 0));
    const upgradeNames = new Map<number, string[]>();
    for (const u of getUpgrades()) {
        for (const n of u.zips) {
            const names = upgradeNames.get(n) ?? [];
            names.push(u.name);
            upgradeNames.set(n, names);
        }
    }
    const rows: IndexRow[] = zips.map((z) => ({
        number: z.number as number,
        title: localTitle(z, locale),
        status: z.status,
        group: statusGroup(z.status),
        category: z.category,
        year: z.created === null ? null : Number(z.created.slice(0, 4)),
        upgrades: upgradeNames.get(z.number as number) ?? [],
    }));
    return (<>
      <PageHeader title={t("title")}/>
      <div className="mt-4"/>
      <IndexFilters rows={rows}/>
    </>);
}
