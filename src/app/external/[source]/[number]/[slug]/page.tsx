import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getExternalPr, getExternalPrsForSource, getExternalSource, getExternalSources, getPrPreviewHtml, prPreviews, } from "@/lib/data";
import StatusBadge from "@/components/status-badge";
import TocSidebar from "@/components/toc-sidebar";
import ZipToc from "@/components/zip-toc";
import { Badge } from "@/components/ui/badge";
export const dynamicParams = false;
export function generateStaticParams() {
    const out: {
        source: string;
        number: string;
        slug: string;
    }[] = [];
    for (const s of getExternalSources()) {
        for (const pr of getExternalPrsForSource(s.id)) {
            for (const pv of prPreviews(pr)) {
                // Skip pairs whose rendered HTML is missing so a stale snapshot
                // cannot fail the static export.
                if (getPrPreviewHtml(pr, pv.slug) === null)
                    continue;
                out.push({ source: s.id, number: String(pr.number), slug: pv.slug });
            }
        }
    }
    return out;
}
export async function generateMetadata({ params, }: {
    params: Promise<{
        source: string;
        number: string;
        slug: string;
    }>;
}): Promise<Metadata> {
    const { source, number, slug } = await params;
    const pr = /^\d+$/.test(number) ? getExternalPr(source, Number(number)) : undefined;
    const pv = pr ? prPreviews(pr).find((p) => p.slug === slug) : undefined;
    if (!pr || !pv)
        return {};
    const s = getExternalSource(source);
    return { title: `${s?.label ?? source} PR ${pr.number}: ${pv.title}` };
}
export default async function ExternalPrDocPage({ params, }: {
    params: Promise<{
        source: string;
        number: string;
        slug: string;
    }>;
}) {
    const { source, number, slug } = await params;
    const pr = /^\d+$/.test(number) ? getExternalPr(source, Number(number)) : undefined;
    const s = getExternalSource(source);
    const pv = pr && s ? prPreviews(pr).find((p) => p.slug === slug) : undefined;
    if (!pr || !s || !pv)
        notFound();
    const html = getPrPreviewHtml(pr, pv.slug);
    if (!html)
        notFound();
    const headings = pv.headings;
    const hasToc = headings.length > 0;
    return (<div className="relative mx-auto max-w-[88rem] pt-6">
      {hasToc && <TocSidebar headings={headings}/>}

      <div className="mx-auto max-w-[84ch] [--prose-measure:84ch]">
        <header className="mb-8 border-b border-border-subtle pb-4">
          <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-foreground">
            <Badge variant="secondary">
              <Link href={`/external/${s.id}/`} className="hover:text-foreground">
                {s.label}
              </Link>
            </Badge>
            <Badge variant="accent">PR #{pr.number}</Badge>
            <span>
              proposed changes in{" "}
              <Link href={`/external/${s.id}/${pr.number}/`} className="underline underline-offset-2">
                {s.repo}#{pr.number}
              </Link>
            </span>
          </p>
          <h1 className="font-display mb-3 text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.2] font-semibold tracking-[-0.02em] [text-wrap:pretty]">
            {pv.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
            <StatusBadge status={pv.status}/>
            <span>
              by {pr.author ?? "unknown"} · updated {pr.updatedAt.slice(0, 10)}
            </span>
            <span className="text-faint">
              <code className="font-mono text-xs">{pv.filename}</code> @{" "}
              <a className="underline underline-offset-2" href={`https://github.com/${pr.repo}/commit/${pr.headSha}`}>
                <code className="font-mono text-xs">{pr.headSha?.slice(0, 10)}</code>
              </a>{" "}
              ·{" "}
              <a className="underline underline-offset-2" href={`https://github.com/${pr.repo}`}>
                {pr.repo}
              </a>
            </span>
            <a href={pr.url} className="underline underline-offset-2 hover:text-accent">
              view on GitHub ↗
            </a>
          </div>
          <p className="mt-2 text-[0.8125rem] text-faint">
            Unofficial preview — rendered from the head of {pr.repo}
            #{pr.number}, a third-party proposal. Not part of the canonical
            zcash/zips ZIP set.
          </p>
          {hasToc && (<div className="min-[70rem]:hidden">
              <ZipToc headings={headings} floating/>
            </div>)}
        </header>

        <article data-pagefind-body>
          <div className="prose" dangerouslySetInnerHTML={{ __html: html }}/>
        </article>
      </div>
    </div>);
}
