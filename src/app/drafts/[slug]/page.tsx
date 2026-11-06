import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCrossrefs, getDrafts, getMeta, getZipBySlug, getZipHtml, prsForDraft, } from "@/lib/data";
import { statusGroup } from "@/lib/types";
import { cn } from "@/lib/utils";
import MetaPanel from "@/components/meta-panel";
import StatusBadge from "@/components/status-badge";
import TocSidebar from "@/components/toc-sidebar";
import { Badge } from "@/components/ui/badge";
export const dynamicParams = false;
export function generateStaticParams() {
    return getDrafts().map((z) => ({ slug: z.slug }));
}
export async function generateMetadata({ params, }: {
    params: Promise<{
        slug: string;
    }>;
}): Promise<Metadata> {
    const { slug } = await params;
    const zip = getZipBySlug(slug);
    if (!zip || zip.kind !== "draft")
        return {};
    return { title: zip.title };
}
const badgesRow = "inline-flex flex-wrap items-center gap-1.5 [&>span]:whitespace-normal";
export default async function Page({ params, }: {
    params: Promise<{
        slug: string;
    }>;
}) {
    const { slug } = await params;
    const zip = getZipBySlug(slug);
    if (!zip || zip.kind !== "draft")
        notFound();
    const html = getZipHtml(zip.slug);
    const crossrefs = getCrossrefs(zip.slug);
    const related = (crossrefs?.related ?? []).map(getZipBySlug);
    return (<div className="relative mx-auto max-w-[88rem] pt-6">
      <TocSidebar headings={zip.headings}/>

      <article className="mx-auto max-w-[68ch] [--prose-measure:68ch]" data-pagefind-body>
        <header className="mb-8 border-b border-border-subtle pb-4">
          <h1 className="font-display mb-4 text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.2] font-semibold tracking-[-0.02em] [text-wrap:pretty]">{zip.title}</h1>
          <div className={cn("mt-2.5", badgesRow)}>
            <StatusBadge status={zip.status} group={statusGroup(zip.status)}/>
            {zip.revision !== null && <Badge variant="outline">r{zip.revision}</Badge>}
          </div>
        </header>
        <div className="prose" dangerouslySetInnerHTML={{ __html: html }}/>
      </article>

      <MetaPanel zip={zip} prs={prsForDraft(zip.slug)} crossrefs={crossrefs} related={related} commit={getMeta()}/>
    </div>);
}
