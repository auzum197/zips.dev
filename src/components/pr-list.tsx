import Link from "next/link";
import { dateSlice } from "@/lib/date";
import { getZipByNumber, getZipBySlug, prPreviewHref } from "@/lib/data";
import type { PrMeta } from "@/lib/types";
function PrRefs({ pr, existingZipNumbers, }: {
    pr: PrMeta;
    existingZipNumbers: Set<number>;
}) {
    if (pr.zipRefs.length === 0 && pr.draftRefs.length === 0)
        return null;
    return (<span className="flex min-w-0 flex-wrap items-baseline gap-x-2 font-mono text-xs">
      {pr.zipRefs.map((n) => {
            // Numbered ZIPs link to /zip/<n>/; upstream drafts filed under
            // zip-NNNN filenames have no number yet but still have pages at
            // /drafts/<slug>/ — link them too, faint only when nothing exists.
            const zip = getZipByNumber(n);
            const draft = zip || existingZipNumbers.has(n)
                ? undefined
                : getZipBySlug(`zip-${String(n).padStart(4, "0")}`);
            const href = zip ? `/zip/${n}/` : draft ? `/drafts/${draft.slug}/` : null;
            return href ? (<Link key={`z${n}`} href={href} className="text-accent hover:underline">
                ZIP {n}
              </Link>) : (<span key={`z${n}`} className="text-faint">
                ZIP {n}
              </span>);
        })}
      {pr.draftRefs.map((slug) => getZipBySlug(slug) ? (<Link key={`d${slug}`} href={`/drafts/${slug}/`} className="text-accent hover:underline">
          {slug}
        </Link>) : (<span key={`d${slug}`} className="text-faint">
          {slug}
        </span>))}
    </span>);
}
function PrRow({ pr, existingZipNumbers, }: {
    pr: PrMeta;
    existingZipNumbers: Set<number>;
}) {
    const href = prPreviewHref(pr);
    const key = `${pr.repo}-${pr.number}`;
    return (<li id={`pr-${key}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border-subtle py-2.5 scroll-mt-18 [&:target]:bg-muted">
      <span className="shrink-0 font-mono text-xs text-faint tabular-nums">
        #{pr.number}
      </span>
      <a href={href ?? pr.url} title={href ? "Rendered preview of the proposed text" : undefined} className="min-w-0 flex-1 basis-64 leading-snug transition-colors hover:text-accent">
        {pr.title}
      </a>
      {pr.claimed && (<span className="shrink-0 font-mono text-xs text-purple">claimed</span>)}
      <PrRefs pr={pr} existingZipNumbers={existingZipNumbers}/>
      <span className="shrink-0 whitespace-nowrap text-xs text-faint max-sm:hidden">
        {pr.author ?? "unknown"} · {dateSlice(pr.updatedAt) ?? "—"}
      </span>
    </li>);
}
export default function PrList({ prs, existingZipNumbers = [], }: {
    prs: PrMeta[];
    existingZipNumbers?: Iterable<number>;
}) {
    const existing = existingZipNumbers instanceof Set
        ? existingZipNumbers
        : new Set(existingZipNumbers);
    return (<ul className="border-t border-border-subtle text-sm">
      {prs.map((pr) => (<PrRow key={`${pr.repo}-${pr.number}`} pr={pr} existingZipNumbers={existing}/>))}
    </ul>);
}
