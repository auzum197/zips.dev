import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { diffToHtml } from "@/lib/diff";
import { getMeta, getPrByNumber, getPrs, getZipByNumber, getZipBySlug, prPreviews, } from "@/lib/data";
import { type PrMeta, type PrPreview } from "@/lib/types";
import StatusBadge from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
export const dynamicParams = false;
export function generateStaticParams() {
    return getPrs()
        .filter((p) => prPreviews(p).length > 0)
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
function dateSlice(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toISOString().slice(0, 10);
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
function previewBadge({ pv, base }: {
    pv: PrPreview;
    base: ReturnType<typeof docBase>;
}) {
    if (base && pv.status === base.status)
        return <StatusBadge status={base.status}/>;
    return <Badge variant="warn">status → {pv.status}</Badge>;
}
function PreviewRow({ pr, pv }: {
    pr: PrMeta;
    pv: PrPreview;
}) {
    const file = pr.files.find((f) => f.filename === pv.filename);
    const base = docBase(pv.slug);
    const isZip = /^zip-/.test(pv.slug);
    return (<li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border-subtle py-2.5">
      <span className="shrink-0 font-mono text-xs text-accent">
        {isZip ? `ZIP ${Number(pv.slug.slice(4))}` : pv.slug}
      </span>
      <a href={`/prs/${pr.number}/${pv.slug}/`} title="Rendered preview of the proposed text" className="min-w-0 flex-1 basis-64 leading-snug transition-colors hover:text-accent">
        {pv.title}
      </a>
      {previewBadge({ pv, base })}
      <span className="shrink-0 font-mono text-xs text-faint uppercase">
        {pv.format}
      </span>
      {file && (<span className="shrink-0 font-mono text-xs">
          <span className="text-success">+{file.additions}</span>{" "}
          <span className="text-destructive">−{file.deletions}</span>
          <span className="text-faint"> {file.status}</span>
        </span>)}
    </li>);
}
export default async function PrOverviewPage({ params, }: {
    params: Promise<{
        number: string;
    }>;
}) {
    const { number } = await params;
    const n = Number(number);
    const pr = /^\d+$/.test(number) ? getPrByNumber(n) : undefined;
    const previews = pr ? prPreviews(pr) : [];
    if (!pr || previews.length === 0)
        notFound();
    const meta = getMeta();
    const diffableFiles = pr.files.filter((f) => f.patch);
    return (<div className="relative mx-auto max-w-[88rem] pt-6">
      <div className="mx-auto max-w-[84ch] [--prose-measure:84ch]">
        <header className="mb-8 border-b border-border-subtle pb-4">
          <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-foreground">
            <Badge variant="accent">PR #{pr.number}</Badge>
            <span>proposed changes to</span>
            {pr.zipRefs.map((z, i) => {
                // Link to whichever page exists: the numbered ZIP, or the
                // numberless draft living in a zip-NNNN file.
                const base = docBase(`zip-${String(z).padStart(4, "0")}`);
                return (<span key={z}>
                    {i > 0 && <span className="mr-2">·</span>}
                    {base ? (<Link href={base.href} className="underline underline-offset-2">
                        ZIP {z}
                      </Link>) : (<span>ZIP {z}</span>)}
                  </span>);
            })}
            {pr.draftRefs.map((d) => {
                const exists = Boolean(getZipBySlug(d));
                return (<span key={d}>
                    <span className="mr-2">·</span>
                    {exists ? (<Link href={`/drafts/${d}/`} className="underline underline-offset-2">
                        {d}
                      </Link>) : (<span>{d}</span>)}
                  </span>);
            })}
          </p>
          <h1 className="font-display mb-3 text-[clamp(1.75rem,3vw,2.35rem)] leading-[1.2] font-semibold tracking-[-0.02em] [text-wrap:pretty]">
            {pr.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] text-muted-foreground">
            <span>
              by {pr.author ?? "unknown"} · created {dateSlice(pr.createdAt)} ·
              updated {dateSlice(pr.updatedAt)}
            </span>
            <span className="text-faint">
              {pr.changedFiles} file{pr.changedFiles === 1 ? "" : "s"} ·{" "}
              <span className="text-success">+{pr.additions}</span>{" "}
              <span className="text-destructive">−{pr.deletions}</span>
              {pr.headSha && (<>
                  {" "}
                  · head <code className="font-mono text-xs">{pr.headSha.slice(0, 10)}</code>
                </>)}{" "}
              · upstream{" "}
              <a className="underline underline-offset-2" href={meta.commitUrl}>
                {meta.commitShort}
              </a>
            </span>
            <a href={pr.url} className="underline underline-offset-2 hover:text-accent">
              view on GitHub ↗
            </a>
          </div>
        </header>

        <section className="mt-2">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Changed documents
          </h2>
          <p className="mb-3 mt-0.5 text-[0.8125rem] text-muted-foreground">
            {previews.length} rendered preview{previews.length === 1 ? "" : "s"}{" "}
            from the pull request head — unofficial text, not part of the
            canonical ZIP set.
          </p>
          <ul className="border-t border-border-subtle text-sm">
            {previews.map((pv) => (<PreviewRow key={pv.slug} pr={pr} pv={pv}/>))}
          </ul>
        </section>

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
