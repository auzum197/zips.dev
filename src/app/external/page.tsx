import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "@/i18n/link";
import PageHeader from "@/components/page-header";
import PrList from "@/components/pr-list";
import { getExternalPrs, getExternalSources } from "@/lib/data";
import type { PrMeta } from "@/lib/types";
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("External");
    return ogMetadata({ title: t("title"), description: t("description"), path: "/external/", card: "external" });
}
function byUpdatedDesc(a: PrMeta, b: PrMeta): number {
    return b.updatedAt.localeCompare(a.updatedAt);
}
export default function ExternalIndexPage() {
    const t = useTranslations("External");
    const tc = useTranslations("Common");
    const sources = getExternalSources();
    const prs = getExternalPrs();
    return (<>
      <PageHeader title={t("heading")}/>

      {sources.length === 0 && (<p className="mt-6 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          {t.rich("noSources", { code: (chunks) => <code className="font-mono text-xs">{chunks}</code> })}
        </p>)}

      {sources.map((s) => {
        const list = prs.filter((p) => p.source === s.id).sort(byUpdatedDesc);
        return (<section key={s.id} className="mt-10">
            <h2 className="flex flex-wrap items-baseline gap-x-2 text-lg font-semibold tracking-tight">
              <Link href={`/external/${s.id}/`} className="hover:text-accent">
                {s.label}
              </Link>
              <a href={`https://github.com/${s.repo}`} className="font-mono text-xs font-normal text-faint underline underline-offset-2">
                {s.repo}
              </a>
            </h2>
            {s.error && (<p className="mt-2 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
                {tc("dataUnavailable")}
              </p>)}
            <div className="mt-3">
              {list.length === 0
                ? (<p className="text-sm text-muted-foreground">{tc("noOpenPrs")}</p>)
                : <PrList prs={list}/>}
            </div>
          </section>);
      })}
    </>);
}
