import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCrossrefs, getMeta, getNumberedZips, getZipByNumber, getZipBySlug, getZipHtml, prsForZip, upgradeNameForZip, } from "@/lib/data";
import { statusGroup, type ZipMeta } from "@/lib/types";
import { cn } from "@/lib/utils";
import MetaPanel from "@/components/meta-panel";
import PageHeader from "@/components/page-header";
import StatusBadge from "@/components/status-badge";
import TocSidebar from "@/components/toc-sidebar";
import ZipToc from "@/components/zip-toc";
import { Badge } from "@/components/ui/badge";
export const dynamicParams = false;
export function generateStaticParams() {
    return getNumberedZips()
        .filter((z) => z.number !== null)
        .map((z) => ({ number: String(z.number) }));
}
export async function generateMetadata({ params, }: {
    params: Promise<{
        number: string;
    }>;
}): Promise<Metadata> {
    const { number } = await params;
    const zip = /^\d+$/.test(number) ? getZipByNumber(Number(number)) : undefined;
    if (!zip)
        return {};
    return { title: `ZIP ${zip.number}: ${zip.title}` };
}
const badgesRow = "inline-flex flex-wrap items-center gap-1.5 [&>span]:whitespace-normal";
export default async function Page({ params, }: {
    params: Promise<{
        number: string;
    }>;
}) {
    const { number } = await params;
    const zip = /^\d+$/.test(number) ? getZipByNumber(Number(number)) : undefined;
    if (!zip || zip.number === null)
        notFound();
    const html = getZipHtml(zip.slug);
    const zipNumber = zip.number;
    const crossrefs = getCrossrefs(zip.slug);
    const related = (crossrefs?.related ?? []).map(getZipBySlug);
    return (<div className="relative mx-auto max-w-[88rem] pt-6">
      <TocSidebar headings={zip.headings}/>

      <article className="mx-auto max-w-[68ch] [--prose-measure:68ch]" data-pagefind-body>
        <header className="mb-8 border-b border-border-subtle pb-4">
          <h1 className="font-display mb-4 text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.2] font-semibold tracking-[-0.02em] [text-wrap:pretty]">
            ZIP {zipNumber} — {zip.title}
          </h1>
          <div className={cn("mt-2.5", badgesRow)}>
            <StatusBadge status={zip.status} group={statusGroup(zip.status)}/>
            {zip.revision !== null && <Badge variant="outline">r{zip.revision}</Badge>}
          </div>
          <div className="min-[70rem]:hidden" data-pagefind-ignore>
            <ZipToc headings={zip.headings} floating/>
          </div>
        </header>
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }}/>
      </article>

      <MetaPanel zip={zip} prs={prsForZip(zipNumber)} upgrades={upgradeNameForZip(zipNumber)} crossrefs={crossrefs} related={related} commit={getMeta()}/>
    </div>);
}
