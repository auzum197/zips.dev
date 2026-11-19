import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Link from "@/i18n/link";
import PrList from "@/components/pr-list";
import PageHeader from "@/components/page-header";
import { getPrError, getPrs, getZipByNumber } from "@/lib/data";
import type { PrMeta } from "@/lib/types";
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Prs");
    return ogMetadata({ title: t("title"), description: t("description"), path: "/prs/", card: "prs" });
}
function byUpdatedDesc(a: PrMeta, b: PrMeta): number {
    return b.updatedAt.localeCompare(a.updatedAt);
}
export default function PrsPage() {
    const t = useTranslations("Prs");
    const error = getPrError();
    const prs = getPrs();
    const mapped = prs.filter((p) => p.mapped).sort(byUpdatedDesc);
    const unmapped = prs.filter((p) => !p.mapped).sort(byUpdatedDesc);
    const existingZipNumbers = new Set(prs
        .flatMap((p) => p.zipRefs)
        .filter((n) => getZipByNumber(n) !== undefined));
    return (<>
      <PageHeader title={t("title")}/>

      {error && (<p className="mb-6 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          {t("unavailable")}
        </p>)}

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{t("mappedTitle")}</h2>
        <PrList prs={mapped} existingZipNumbers={existingZipNumbers}/>
      </section>

      {unmapped.length > 0 && (<section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">{t("unmappedTitle")}</h2>
          <PrList prs={unmapped} existingZipNumbers={existingZipNumbers}/>
        </section>)}

      <p className="mt-10 text-sm text-muted-foreground">
        {t.rich("externalNote", { link: (chunks) => <Link href="/external/" className="underline underline-offset-2">{chunks}</Link> })}
      </p>
    </>);
}
