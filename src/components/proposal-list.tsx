import { Badge } from "@/components/ui/badge";
import { dateSlice } from "@/lib/date";
import { getExternalSource, prBaseHref, prPreviews } from "@/lib/data";
import type { NewProposal } from "@/lib/types";
function ProposalRow({ p }: {
    p: NewProposal;
}) {
    const pr = p.pr;
    // Link each proposal to its own document page when the PR rendered one.
    const preview = prPreviews(pr).find((pv) => pv.slug === p.slug) ?? null;
    const title = preview?.title ?? pr.title;
    const href = preview ? `${prBaseHref(pr)}/${preview.slug}/` : pr.url;
    const source = pr.source ? getExternalSource(pr.source) : undefined;
    return (<li className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-border-subtle py-2.5">
      <a href={href} title={preview ? "Rendered preview of the proposed text" : undefined} className="min-w-0 flex-1 basis-64 leading-snug transition-colors hover:text-accent">
        {title}
      </a>
      {source && (<Badge variant="secondary" title={`Watched third-party proposal from ${source.repo}`}>
          {source.label}
        </Badge>)}
      {p.kind === "zip" ? (<span className="shrink-0 font-mono text-xs text-accent">
          ZIP {p.number}
        </span>) : (<span className="shrink-0 font-mono text-xs text-faint">{p.slug}</span>)}
      <span className="shrink-0 whitespace-nowrap text-xs text-faint max-sm:hidden">
        {pr.author ?? "unknown"} · {dateSlice(pr.updatedAt) ?? "—"}
      </span>
    </li>);
}
export default function ProposalList({ items }: {
    items: NewProposal[];
}) {
    return (<ul className="border-t border-border-subtle text-sm">
      {items.map((p) => (<ProposalRow key={`${p.pr.repo}-${p.pr.number}-${p.slug}`} p={p}/>))}
    </ul>);
}
