"use client";
import { useTranslations } from "next-intl";
import type { UpstreamMeta } from "@/lib/types";
const API = ["/api/zips.json", "/api/prs.json", "/api/external.json", "/api/meta.json"];
export default function SiteFooter({ meta }: {
    meta: UpstreamMeta;
}) {
    const t = useTranslations("Footer");
    const link = "underline underline-offset-2";
    return (<footer className="zen-dim border-t border-border-subtle pb-8 pt-5 text-[0.8125rem] text-muted-foreground">
      <div className="mx-auto max-w-[88rem] px-5">
        <p>
          {t.rich("disclaimer", {
            sha: meta.commitShort,
            date: new Date(meta.syncedAt).toISOString().slice(0, 10),
            commit: (chunks) => <a className={link} href={meta.commitUrl}>{chunks}</a>,
            code: (chunks) => <code className="font-mono text-xs text-faint">{chunks}</code>,
            repo: (chunks) => <a className={link} href="https://github.com/zcash/zips">{chunks}</a>,
        })}
        </p>
        <p className="mt-1.5 text-faint">
          {t("machine")}{" "}
          {API.map((href, i) => (<span key={href}>
              {i > 0 && " · "}
              <a className={link} href={href}><code className="font-mono text-xs">{href}</code></a>
            </span>))}
        </p>
      </div>
    </footer>);
}
