import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMeta, getPrByNumber, getPrPreviewHtml, getPrs, getZipByNumber, getZipBySlug, prPreviews, } from "@/lib/data";
import StatusBadge from "@/components/status-badge";
import TocSidebar from "@/components/toc-sidebar";
import ZipToc from "@/components/zip-toc";
import { Badge } from "@/components/ui/badge";
export const dynamicParams = false;
export function generateStaticParams() {
    const out: {
        number: string;
        slug: string;
    }[] = [];
    for (const pr of getPrs()) {
        for (const pv of prPreviews(pr)) {
            // Skip pairs whose rendered HTML is missing so a stale snapshot
            // cannot fail the static export.
            if (getPrPreviewHtml(pr, pv.slug) === null)
                continue;
            out.push({ number: String(pr.number), slug: pv.slug });
        }
    }
    return out;
}
export async function generateMetadata({ params, }: {
    params: Promise<{
        number: string;
        slug: string;
    }>;
}): Promise<Metadata> {
    const { number, slug } = await params;
    const pr = getPrByNumber(Number(number));
    const pv = pr ? prPreviews(pr).find((p) => p.slug === slug) : undefined;
    if (!pr || !pv)
        return {};
    return ogMetadata({ title: `PR ${pr.number}: ${pv.title}`, path: `/prs/${number}/${slug}/`, card: `pr-${number}` });
}
function docBase(slug: string): {
    href: string;
    label: string;
    status: string;
} | null {
    const zip = slug.match(/^zip-0*(\d{1,4})$/);
    const z = zip ? getZipByNumber(Number(zip[1])) : undefined;
    if (z && z.number !== null)
        return { href: `/zip/${z.number}/`, label: `ZIP ${z.number}`, status: z.status };
    // Some upstream drafts live in zip-NNNN files; fall back to a slug lookup.
    const d = getZipBySlug(slug);
    return d
        ? {
                href: d.number !== null ? `/zip/${d.number}/` : `/drafts/${d.slug}/`,
                label: d.number !== null ? `ZIP ${d.number}` : d.slug,
                status: d.status,
            }
        : null;
}
export default async function PrDocPage({ params, }: {
    params: Promise<{
        number: string;
        slug: string;
    }>;
}) {
    const { number, slug } = await params;
    const pr = /^\d+$/.test(number) ? getPrByNumber(Number(number)) : undefined;
    const pv = pr ? prPreviews(pr).find((p) => p.slug === slug) : undefined;
    if (!pr || !pv)
        notFound();
    const html = getPrPreviewHtml(pr, pv.slug);
    if (!html)
        notFound();
    const meta = getMeta();
    const base = docBase(pv.slug);
    const headings = pv.headings;
    const hasToc = headings.length > 0;
    return (<div className="relative mx-auto max-w-[88rem] pt-6">
      {hasToc && <TocSidebar headings={headings}/>}

      <div className="mx-auto max-w-[84ch] [--prose-measure:84ch]">
        <header className="mb-8 border-b border-border-subtle pb-4">
          <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-foreground">
            <Badge variant="accent">PR #{pr.number}</Badge>
            <span>
              proposed changes to <Link href={`/prs/${pr.number}/`} className="underline underline-offset-2">PR {pr.number} overview</Link>
            </span>
            {base && (<span>
                <span className="mr-2">·</span>
                <span>current version:</span>{" "}
                <Link href={base.href} className="underline underline-offset-2">
                  {base.label}
                </Link>
              </span>)}
          </p>
          <h1 className="font-display mb-3 text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.2] font-semibold tracking-[-0.02em] [text-wrap:pretty]">
            {pv.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
            {base && pv.status === base.status ? (<StatusBadge status={base.status}/>) : (<Badge variant="warn">status → {pv.status}</Badge>)}
            <span>
              by {pr.author ?? "unknown"} · updated {pr.updatedAt.slice(0, 10)}
            </span>
            <span className="text-faint">
              <code className="font-mono text-xs">{pv.filename}</code> @{" "}
              <code className="font-mono text-xs">{pr.headSha?.slice(0, 10)}</code> · upstream{" "}
              <a className="underline underline-offset-2" href={meta.commitUrl}>
                {meta.commitShort}
              </a>
            </span>
            <a href={pr.url} className="underline underline-offset-2 hover:text-accent">
              view on GitHub ↗
            </a>
          </div>
          <p className="mt-2 text-[0.8125rem] text-faint">
            Unofficial preview — the proposed text below is rendered from the pull
            request head and is not part of the canonical ZIP set.
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
