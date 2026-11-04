import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getCrossrefs, getDrafts, getMeta, getZipBySlug, getZipHtml, prsForDraft, } from "@/lib/data";
import { statusGroup, type Crossrefs, type PrMeta, type ZipMeta } from "@/lib/types";
import { cn } from "@/lib/utils";
import StatusBadge from "@/components/status-badge";
import ZipToc from "@/components/zip-toc";
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
function authorParts(a: string): {
    name: string;
    email: string | null;
} {
    const m = a.match(/^(.*?)\s*<([^>]+)>\s*$/);
    return m ? { name: m[1], email: m[2] } : { name: a, email: null };
}
const badgesRow = "inline-flex flex-wrap items-center gap-1.5 [&>span]:whitespace-normal";
function Section({ title, children }: {
    title: string;
    children: ReactNode;
}) {
    return (<section className="min-w-0">
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">
        {title}
      </h2>
      {children}
    </section>);
}
function AuthorList({ names }: {
    names: string[];
}) {
    return (<ul className="space-y-0.5">
      {names.map((a) => {
            const p = authorParts(a);
            return (<li key={a} className="min-w-0">
            {p.name}
            {p.email && (<span className="block font-mono text-[0.6875rem] text-faint">{p.email}</span>)}
          </li>);
        })}
    </ul>);
}
function PlainList({ items }: {
    items: string[];
}) {
    return (<ul className="space-y-0.5">
      {items.map((s) => (<li key={s} className="min-w-0">
          {s}
        </li>))}
    </ul>);
}
function MetaPanel({ zip, prs, crossrefs, }: {
    zip: ZipMeta;
    prs: PrMeta[];
    crossrefs: Crossrefs | null;
}) {
    const meta = getMeta();
    const discussion = zip.discussionsTo?.startsWith("http") ? zip.discussionsTo : null;
    return (<aside className="zen-fade absolute right-0 top-6 bottom-0 hidden w-72 min-[73rem]:block space-y-6 text-[0.8125rem] text-muted-foreground zen:hidden">
      <Section title="Status">
        <p className={cn("m-0", badgesRow)}>
          <StatusBadge status={zip.status} group={statusGroup(zip.status)}/>
          {zip.revision !== null && <Badge variant="outline">r{zip.revision}</Badge>}
        </p>
      </Section>

      {zip.owners.length > 0 && (<Section title="Owners">
          <AuthorList names={zip.owners}/>
        </Section>)}

      {zip.originalAuthors.length > 0 && (<Section title="Original authors">
          <AuthorList names={zip.originalAuthors}/>
        </Section>)}

      {zip.credits.length > 0 && (<Section title="Credits">
          <PlainList items={zip.credits}/>
        </Section>)}

      {zip.created && (<Section title="Created">
          <p className="m-0">
            <time dateTime={zip.created}>{zip.created}</time>
          </p>
        </Section>)}

      <Section title="License">
        <p className="m-0">{zip.license}</p>
      </Section>

      <Section title="Category">
        <p className="m-0">{zip.category}</p>
      </Section>

      {crossrefs?.related && crossrefs.related.length > 0 && (<Section title="Related ZIPs">
          <ul className="space-y-0.5">
            {crossrefs.related.map((slug) => {
                const rel = getZipBySlug(slug);
                if (!rel)
                    return <li key={slug}>{slug}</li>;
                const href = rel.number !== null ? `/zip/${rel.number}/` : `/drafts/${rel.slug}/`;
                const label = rel.number !== null ? `ZIP ${rel.displayNumber}` : "Draft";
                return (<li key={slug} className="min-w-0">
                  <Link href={href} className="hover:text-accent hover:underline">
                    {label}
                  </Link>{" "}
                  <span className="text-xs text-faint">{rel.title}</span>
                </li>);
            })}
          </ul>
        </Section>)}

      {crossrefs?.analogous_bips && crossrefs.analogous_bips.length > 0 && (<Section title="Analogous BIPs">
          <PlainList items={crossrefs.analogous_bips}/>
        </Section>)}

      {crossrefs?.spec_sections && crossrefs.spec_sections.length > 0 && (<Section title="Spec sections">
          <PlainList items={crossrefs.spec_sections}/>
        </Section>)}

      {prs.length > 0 && (<Section title="Open PRs">
          <ul className="space-y-0.5">
            {prs.map((p) => (<li key={p.number} className="min-w-0">
                <Link href={p.preview ? `/prs/${p.number}/` : p.url} className="block truncate hover:text-accent" title={p.preview ? `${p.title} — rendered preview of the proposed text` : p.title}>
                  <span className="font-mono text-accent">#{p.number}</span> {p.title}
                </Link>
              </li>))}
          </ul>
        </Section>)}

      <Section title="Source">
        <ul className="space-y-0.5">
          <li className="min-w-0">
            <a href={zip.upstreamUrl} className="hover:text-accent hover:underline">
              {zip.filename}
            </a>{" "}
            <span className="text-xs text-faint">pinned @ {meta.commitShort}</span>
          </li>
          {discussion && (<li>
              <a href={discussion} className="hover:text-accent hover:underline">
                Discussion
              </a>
            </li>)}
        </ul>
      </Section>
    </aside>);
}
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
    return (<div className="relative mx-auto max-w-[88rem] pt-6">
      <aside className="group/ztoc absolute left-0 top-6 bottom-0 hidden w-64 min-[70rem]:block">
        <button type="button" aria-label="Show table of contents" className="sticky top-[4.5rem] z-10 hidden h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-muted-foreground zen:pointer-events-auto zen:grid zen:bg-background/70 zen:transition-opacity zen:duration-[600ms] zen:delay-250 zen:hover:text-foreground zen:group-hover/ztoc:pointer-events-none zen:group-hover/ztoc:opacity-0 zen:group-hover/ztoc:delay-0 zen:group-hover/ztoc:duration-[400ms]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M9 6h11"/>
            <path d="M9 12h11"/>
            <path d="M9 18h11"/>
            <path d="M5 6v.01"/>
            <path d="M5 12v.01"/>
            <path d="M5 18v.01"/>
          </svg>
        </button>
        <div className="toc-scroll sticky top-[4.5rem] max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 [overscroll-behavior:contain] zen:pointer-events-none zen:opacity-0 zen:transition-opacity zen:duration-[600ms] zen:delay-250 zen:[transition-timing-function:cubic-bezier(0.23,1,0.32,1)] zen:group-hover/ztoc:pointer-events-auto zen:group-hover/ztoc:opacity-100 zen:group-hover/ztoc:delay-0 zen:group-hover/ztoc:duration-[400ms]">
          <ZipToc headings={zip.headings}/>
        </div>
      </aside>

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

      <MetaPanel zip={zip} prs={prsForDraft(zip.slug)} crossrefs={getCrossrefs(zip.slug)}/>
    </div>);
}
