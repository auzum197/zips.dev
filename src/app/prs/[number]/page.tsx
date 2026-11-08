import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { diffToHtml } from "@/lib/diff";
import { getMeta, getPrByNumber, getPrPreviewHtml, getPrs, getZipByNumber } from "@/lib/data";
import StatusBadge from "@/components/status-badge";
import TocSidebar from "@/components/toc-sidebar";
import ZipToc from "@/components/zip-toc";
import { Badge } from "@/components/ui/badge";
export const dynamicParams = false;
export function generateStaticParams() {
    return getPrs()
        .filter((p) => p.preview)
        .map((p) => ({ number: String(p.number) }));
}
export async function generateMetadata({ params, }: {
    params: Promise<{
        number: string;
    }>;
}): Promise<Metadata> {
    const { number } = await params;
    const pr = getPrByNumber(Number(number));
    if (!pr)
        return {};
    return { title: `PR ${pr.number}: ${pr.title}` };
}
export default async function PrPreviewPage({ params, }: {
    params: Promise<{
        number: string;
    }>;
}) {
    const { number } = await params;
    const n = Number(number);
    const pr = /^\d+$/.test(number) ? getPrByNumber(n) : undefined;
    if (!pr || !pr.preview)
        notFound();
    const html = getPrPreviewHtml(n);
    if (!html)
        notFound();
    const meta = getMeta();
    const diffableFiles = pr.files.filter((f) => f.patch);
    const base = pr.zipRefs.length ? getZipByNumber(pr.zipRefs[0]) : undefined;
    const headings = pr.preview.headings;
    const hasToc = headings.length > 0;
    return (<div className="relative mx-auto max-w-[88rem] pt-6">
      {hasToc && <TocSidebar headings={headings}/>}

      <div className="mx-auto max-w-[84ch] [--prose-measure:84ch]">
        <header className="mb-8 border-b border-border-subtle pb-4">
          <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-foreground">
            <Badge variant="accent">PR #{pr.number}</Badge>
            <span>proposed changes to</span>
            {pr.zipRefs.map((z, i) => (<span key={z}>
                {i > 0 && <span className="mr-2">·</span>}
                <Link href={`/zip/${z}/`} className="underline underline-offset-2">
                  ZIP {z}
                </Link>
              </span>))}
            {pr.draftRefs.map((d) => (<span key={d}>
                <span className="mr-2">·</span>
                <Link href={`/drafts/${d}/`} className="underline underline-offset-2">
                  {d}
                </Link>
              </span>))}
          </p>
          <h1 className="font-display mb-3 text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.2] font-semibold tracking-[-0.02em] [text-wrap:pretty]">
            {pr.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
            {base && pr.preview.status === base.status ? (<StatusBadge status={base.status}/>) : (<Badge variant="warn">status → {pr.preview.status}</Badge>)}
            <span>
              by {pr.author ?? "unknown"} · updated {pr.updatedAt.slice(0, 10)}
            </span>
            <span className="text-faint">
              <code className="font-mono text-xs">{pr.preview.filename}</code> @{" "}
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

        {(diffableFiles.length > 0 || pr.files.length > 0) && (<section className="mt-12 border-t border-border-subtle pt-6">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Changes
            </h2>
            {pr.filesTruncated && (<p className="mb-3 text-[0.8125rem] text-warn">
                Full diff not cached —{" "}
                <a href={`${pr.url}/files`} className="underline underline-offset-2">
                  view all {pr.changedFiles} changed files on GitHub
                </a>
                .
              </p>)}
            {pr.files.map((f) => (<details key={f.filename} className="mb-3">
                <summary className="cursor-pointer text-[0.8125rem] text-accent">
                  <span className="font-mono text-xs text-muted-foreground">{f.filename}</span>{" "}
                  <span className="font-mono text-xs">
                    <span className="text-success">+{f.additions}</span>{" "}
                    <span className="text-destructive">−{f.deletions}</span>
                  </span>
                </summary>
                {f.patch ? (<div className="mt-2 overflow-x-auto rounded-md border border-border-subtle bg-code py-2 font-mono text-xs">
                    <div dangerouslySetInnerHTML={{ __html: diffToHtml(f.patch) }}/>
                  </div>) : (<p className="mt-2 text-[0.8125rem] text-muted-foreground">
                    Diff not cached —{" "}
                    <a href={`${pr.url}/files`} className="underline underline-offset-2">
                      view on GitHub
                    </a>
                    .
                  </p>)}
              </details>))}
          </section>)}
      </div>
    </div>);
}
