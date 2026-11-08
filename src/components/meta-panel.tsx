import Link from "next/link";
import PanelSection from "@/components/panel-section";
import AuthorList from "@/components/author-list";
import PlainList from "@/components/plain-list";
import StatusBadge from "@/components/status-badge";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { prPreviewHref } from "@/lib/data";
import type { Crossrefs, PrMeta, Upgrade, UpstreamMeta, ZipMeta, } from "@/lib/types";
import { statusGroup } from "@/lib/types";
import { cn } from "@/lib/utils";
const badgesRow = "inline-flex flex-wrap items-center gap-1.5 [&>span]:whitespace-normal";
export default function MetaPanel({ zip, prs, upgrades, crossrefs, related, commit, className, }: {
    zip: ZipMeta;
    prs: PrMeta[];
    upgrades?: Upgrade[];
    crossrefs: Crossrefs | null;
    related?: (ZipMeta | undefined)[];
    commit: UpstreamMeta;
    className?: string;
}) {
    const discussion = zip.discussionsTo?.startsWith("http") ? zip.discussionsTo : null;
    const existing = (related ?? []).filter((r): r is ZipMeta => r !== undefined);
    return (<aside className={cn("zen-fade absolute right-0 top-6 bottom-0 hidden w-72 min-[73rem]:block space-y-6 text-[0.8125rem] text-muted-foreground zen:hidden", className)}>
      <PanelSection title="Status">
        <p className={cn("m-0", badgesRow)}>
          <StatusBadge status={zip.status} group={statusGroup(zip.status)}/>
          {zip.revision !== null && <Badge variant="outline">r{zip.revision}</Badge>}
        </p>
      </PanelSection>

      {zip.owners.length > 0 && (<PanelSection title="Owners">
          <AuthorList names={zip.owners}/>
        </PanelSection>)}

      {zip.originalAuthors.length > 0 && (<PanelSection title="Original authors">
          <AuthorList names={zip.originalAuthors}/>
        </PanelSection>)}

      {zip.credits.length > 0 && (<PanelSection title="Credits">
          <PlainList items={zip.credits}/>
        </PanelSection>)}

      {zip.created && (<PanelSection title="Created">
          <p className="m-0">
            <time dateTime={zip.created}>{zip.created}</time>
          </p>
        </PanelSection>)}

      <PanelSection title="License">
        <p className="m-0">{zip.license}</p>
      </PanelSection>

      <PanelSection title="Category">
        <p className="m-0">{zip.category}</p>
      </PanelSection>

      {upgrades && upgrades.length > 0 && (<PanelSection title="Network upgrades">
          <div className="flex flex-wrap gap-1.5">
            {upgrades.map((u) => (<Link key={u.id} href={`/upgrades/${u.id}/`} className={cn(badgeVariants({ variant: "secondary" }), "transition-colors hover:text-foreground")}>
                {u.name}
                {u.code && u.code !== u.name && (<span className="text-faint">{u.code}</span>)}
              </Link>))}
          </div>
        </PanelSection>)}

      {existing.length > 0 && (<PanelSection title="Related ZIPs">
          <ul className="space-y-0.5">
            {existing.map((rel) => {
            const href = rel.number !== null ? `/zip/${rel.number}/` : `/drafts/${rel.slug}/`;
            const label = rel.number !== null ? `ZIP ${rel.displayNumber}` : "Draft";
            return (<li key={rel.slug} className="min-w-0">
                  <Link href={href} className="hover:text-accent hover:underline">
                    {label}
                  </Link>{" "}
                  <span className="text-xs text-faint">{rel.title}</span>
                </li>);
        })}
          </ul>
        </PanelSection>)}

      {crossrefs?.analogous_bips && crossrefs.analogous_bips.length > 0 && (<PanelSection title="Analogous BIPs">
          <PlainList items={crossrefs.analogous_bips}/>
        </PanelSection>)}

      {crossrefs?.spec_sections && crossrefs.spec_sections.length > 0 && (<PanelSection title="Spec sections">
          <PlainList items={crossrefs.spec_sections}/>
        </PanelSection>)}

      {prs.length > 0 && (<PanelSection title="Open PRs">
          <ul className="space-y-0.5">
            {prs.map((p) => {
                // Deep-link to the changed document when the PR previewed one
                // for this ZIP/draft; multi-doc PRs fall back to the overview.
                const href = prPreviewHref(p, zip.slug);
                return (<li key={p.number} className="min-w-0">
                  <Link href={href ?? p.url} className="block truncate hover:text-accent" title={href ? `${p.title} — rendered preview of the proposed text` : p.title}>
                    <span className="font-mono text-accent">#{p.number}</span> {p.title}
                  </Link>
                </li>);
            })}
          </ul>
        </PanelSection>)}

      <PanelSection title="Source">
        <ul className="space-y-0.5">
          <li className="min-w-0">
            <a href={zip.upstreamUrl} className="hover:text-accent hover:underline">
              {zip.filename}
            </a>{" "}
            <span className="text-xs text-faint">pinned @ {commit.commitShort}</span>
          </li>
          {discussion && (<li>
              <a href={discussion} className="hover:text-accent hover:underline">
                Discussion
              </a>
            </li>)}
        </ul>
      </PanelSection>
    </aside>);
}
