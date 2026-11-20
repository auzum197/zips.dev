import { useLocale } from "next-intl";
import { getCrossrefs, getMeta, getZipBySlug, getZipHtml, getZipTranslation, prsForDraft, prsForZip, upgradeNameForZip } from "@/lib/data";
import { statusGroup, type ZipMeta } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DEFAULT_LOCALE } from "@/i18n/config";
import MetaPanel from "@/components/meta-panel";
import TranslationNotice from "@/components/translation-notice";
import StatusBadge from "@/components/status-badge";
import TocSidebar from "@/components/toc-sidebar";
import ZipToc from "@/components/zip-toc";
import { Badge } from "@/components/ui/badge";
import { isRevisionList } from "@/lib/zip-status";
const badgesRow = "inline-flex flex-wrap items-center gap-1.5 [&>span]:whitespace-normal";
/** A numbered ZIP or a draft, in the language of the page. Outside English,
 *  the text is the translation when a current one exists (getZipTranslation),
 *  else the English text with a note. */
export default function ZipPage({ zip }: {
    zip: ZipMeta;
}) {
    const locale = useLocale();
    const foreign = locale !== DEFAULT_LOCALE;
    const translation = foreign ? getZipTranslation(zip.slug) : null;
    const html = translation?.html ?? getZipHtml(zip.slug);
    const title = translation?.title ?? zip.title;
    const headings = translation?.headings ?? zip.headings;
    const crossrefs = getCrossrefs(zip.slug);
    const related = (crossrefs?.related ?? []).map(getZipBySlug);
    const numbered = zip.number !== null;
    const english = numbered ? `/zip/${zip.number}/` : `/drafts/${zip.slug}/`;
    return (<div className="relative mx-auto max-w-[88rem] pt-6">
      <TocSidebar headings={headings}/>

      <article lang={foreign && !translation ? DEFAULT_LOCALE : undefined} className="mx-auto max-w-[68ch] [--prose-measure:68ch]" data-pagefind-body>
        <header className="mb-8 border-b border-border-subtle pb-4">
          <h1 className="font-display mb-4 text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.2] font-semibold tracking-[-0.02em] [text-wrap:pretty]">
            {numbered && <>ZIP {zip.number} — </>}{title}
          </h1>
          <div className={cn("mt-2.5", badgesRow)}>
            <StatusBadge status={zip.status} group={statusGroup(zip.status)}/>
            {zip.revision !== null && !isRevisionList(zip.status) && <Badge variant="outline">r{zip.revision}</Badge>}
          </div>
          <div className="min-[70rem]:hidden" data-pagefind-ignore>
            <ZipToc headings={headings} floating/>
          </div>
        </header>
        <TranslationNotice model={translation?.model ?? null} english={english}/>
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }}/>
      </article>

      <MetaPanel zip={zip} prs={numbered ? prsForZip(zip.number as number) : prsForDraft(zip.slug)} upgrades={numbered ? upgradeNameForZip(zip.number as number) : undefined} crossrefs={crossrefs} related={related} commit={getMeta()}/>
    </div>);
}
