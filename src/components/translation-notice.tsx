import { useLocale, useTranslations } from "next-intl";
import { DEFAULT_LOCALE } from "@/i18n/config";
const box = "mb-8 rounded-md border border-border-subtle bg-muted/50 px-4 py-3 text-[0.875rem] leading-[1.6] text-muted-foreground";
/** The note above a document outside English: a machine translation, or the
 *  English text because no current translation exists. Renders nothing on an
 *  English page. */
export default function TranslationNotice({ model, english }: {
    /** Model that made the translation; null when the text is not translated. */
    model: string | null;
    /** Address of the English page of this document. */
    english: string;
}) {
    const locale = useLocale();
    const t = useTranslations("Doc");
    if (locale === DEFAULT_LOCALE)
        return null;
    if (model === null)
        return (<aside lang={locale} className={box} data-pagefind-ignore>
        <p className="m-0">
          <strong className="font-semibold text-foreground">{t("untranslatedTitle")}</strong> {t("untranslatedBody")}
        </p>
      </aside>);
    return (<aside lang={locale} className={box} data-pagefind-ignore>
      <p className="m-0">
        <strong className="font-semibold text-foreground">{t("machineTitle")}</strong>{" "}
        {t.rich("machineBody", {
            model,
            // a plain anchor: this link leaves the reader's language on purpose
            link: (chunks) => <a href={english} hrefLang={DEFAULT_LOCALE}>{chunks}</a>,
        })}
      </p>
      <p className="m-0 mt-2">
        {t.rich("keywords", { kw: (chunks) => <span className="font-mono text-[0.8125rem]">{chunks}</span> })}
      </p>
    </aside>);
}
