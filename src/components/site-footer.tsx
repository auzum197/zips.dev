"use client";
import { useTranslations } from "next-intl";
import AuzLogo from "@/components/auz-logo";
import type { UpstreamMeta } from "@/lib/types";
const API = ["zips", "prs", "external", "meta"];
/* One line, on one baseline: what the site is, the JSON API, and who made
   it. On a narrow screen the groups wrap; the maker stays at the right. */
export default function SiteFooter({ meta }: {
    meta: UpstreamMeta;
}) {
    const t = useTranslations("Footer");
    const link = "font-mono text-xs underline underline-offset-2";
    return (<footer className="zen-dim border-t border-border-subtle py-5 text-[0.8125rem] text-muted-foreground">
      <div className="mx-auto flex max-w-[88rem] flex-wrap items-baseline gap-x-8 gap-y-2 px-5">
        <p>
          {t.rich("disclaimer", {
            sha: meta.commitShort,
            date: new Date(meta.syncedAt).toISOString().slice(0, 10),
            commit: (chunks) => <a className={link} href={meta.commitUrl}>{chunks}</a>,
        })}
        </p>
        <p className="flex items-baseline gap-x-3">
          <span>{t("machine")}</span>
          {API.map((name) => (<a key={name} className={link} href={`/api/${name}.json`}>{name}</a>))}
        </p>
        <a href="https://auzum197.com" className="ml-auto inline-flex shrink-0 items-baseline gap-1.5 hover:no-underline">
          {t("madeBy")}
          <AuzLogo className="text-lg text-foreground"/>
        </a>
      </div>
    </footer>);
}
