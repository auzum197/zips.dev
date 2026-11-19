import { ogMetadata } from "@/lib/og";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import ProposalList from "@/components/proposal-list";
import PageHeader from "@/components/page-header";
import { getNewProposals } from "@/lib/data";
export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("New");
    return ogMetadata({ title: t("title"), description: t("description"), path: "/new/", card: "new" });
}
export default function NewPage() {
    const t = useTranslations("New");
    const proposals = getNewProposals();
    const zips = proposals.filter((p) => p.kind === "zip");
    const drafts = proposals.filter((p) => p.kind === "draft");
    return (<>
      <PageHeader title={t("title")}/>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{t("zipsTitle")}</h2>
        {zips.length > 0 ? (<ProposalList items={zips}/>) : (<p className="text-sm text-muted-foreground">
            {t("zipsEmpty")}
          </p>)}
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{t("draftsTitle")}</h2>
        {drafts.length > 0 ? (<ProposalList items={drafts}/>) : (<p className="text-sm text-muted-foreground">
            {t("draftsEmpty")}
          </p>)}
      </section>
    </>);
}
