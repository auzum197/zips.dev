import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { labels } from "@/i18n/labels";
import PageHeader from "@/components/page-header";
import PrList from "@/components/pr-list";
import { getExternalPrsForSource, getExternalSource, getExternalSources } from "@/lib/data";
export const dynamicParams = false;
export function generateStaticParams() {
    return getExternalSources().map((s) => ({ source: s.id }));
}
export async function generateMetadata({ params, }: {
    params: Promise<{
        source: string;
    }>;
}): Promise<Metadata> {
    const { source } = await params;
    const s = getExternalSource(source);
    if (!s)
        return {};
    const t = await getTranslations("External");
    return ogMetadata({
        title: t("sourceTitle", { label: s.label }),
        description: s.note ? labels(await getTranslations("Data")).sourceNote(s.id, s.note) : undefined,
        path: `/external/${source}/`,
        card: `external-${source}`,
    });
}
export default async function ExternalSourcePage({ params, }: {
    params: Promise<{
        source: string;
    }>;
}) {
    const { source } = await params;
    const s = getExternalSource(source);
    if (!s)
        notFound();
    const prs = getExternalPrsForSource(s.id);
    const t = await getTranslations("External");
    const tc = await getTranslations("Common");
    return (<div className="mx-auto max-w-[88rem]">
      <PageHeader title={<>
          {s.label}{" "}
          <span className="font-mono text-base font-normal text-faint">{s.repo}</span>
        </>}/>
      {s.error && (<p className="mt-4 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          {tc("dataUnavailable")}
        </p>)}

      <div className="mt-6">
        {prs.length === 0
        ? (<p className="text-sm text-muted-foreground">{tc("noOpenPrs")}</p>)
        : <PrList prs={prs}/>}
      </div>

      <p className="mt-10 text-[0.8125rem] text-faint">
        {t.rich("sourceFooter", { repo: s.repo, link: (chunks) => <a className="underline underline-offset-2" href={`https://github.com/${s.repo}`}>{chunks}</a> })}
      </p>
    </div>);
}
