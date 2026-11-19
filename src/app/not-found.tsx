"use client";
import { useTranslations } from "next-intl";
import Link from "@/i18n/link";
export default function NotFound() {
    const t = useTranslations("NotFound");
    return (<div className="py-20 text-center">
      <p className="font-mono text-5xl text-faint">404</p>
      <p className="mt-3 text-muted-foreground">{t("title")}</p>
      <p className="mt-4 text-sm">
        {t.rich("hint", {
            index: (chunks) => <Link href="/" className="text-accent hover:underline">{chunks}</Link>,
            search: (chunks) => <Link href="/search/" className="text-accent hover:underline">{chunks}</Link>,
        })}
      </p>
    </div>);
}
