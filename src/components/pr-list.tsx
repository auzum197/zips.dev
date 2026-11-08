import Link from "next/link";
import { dateSlice } from "@/lib/date";
import type { PrMeta } from "@/lib/types";
function PrRefs({ pr, existingZipNumbers, }: {
    pr: PrMeta;
    existingZipNumbers: Set<number>;
}) {
    if (pr.zipRefs.length === 0 && pr.draftRefs.length === 0)
        return null;
    return (<span className="flex min-w-0 flex-wrap items-baseline gap-x-2 font-mono text-xs">
      {pr.zipRefs.map((n) => existingZipNumbers.has(n) ? (<Link key={`z${n}`} href={`/zip/${n}/`} className="text-accent hover:underline">
            ZIP {n}
          </Link>) : (<span key={`z${n}`} className="text-faint">
            ZIP {n}
          </span>))}
      {pr.draftRefs.map((slug) => (<Link key={`d${slug}`} href={`/drafts/${slug}/`} className="text-accent hover:underline">
          {slug}
        </Link>))}
    </span>);
}
function PrRow({ pr, existingZipNumbers, }: {
    pr: PrMeta;
    existingZipNumbers: Set<number>;
}) {
    return (<li id={`pr-${pr.number}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border-subtle py-2.5 scroll-mt-18 [&:target]:bg-muted">
      <span className="shrink-0 font-mono text-xs text-faint tabular-nums">
        #{pr.number}
      </span>
      <a href={pr.preview ? `/prs/${pr.number}/` : pr.url} title={pr.preview ? "Rendered preview of the proposed text" : undefined} className="min-w-0 flex-1 basis-64 leading-snug transition-colors hover:text-accent">
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
      {prs.map((pr) => (<PrRow key={pr.number} pr={pr} existingZipNumbers={existing}/>))}
    </ul>);
}
