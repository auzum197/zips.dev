import Link from "next/link";
import MatrixFilter from "@/components/matrix-filter";
import { Badge } from "@/components/ui/badge";
import type { Implementation, ZipMeta } from "@/lib/types";
const LEVEL_VARIANT = {
    consensus: "success",
    sdk: "purple",
    wallet: "accent",
    infrastructure: "warn",
} as const;
const LEVEL_TEXT = {
    consensus: "text-success",
    sdk: "text-purple",
    wallet: "text-accent",
    infrastructure: "text-warn",
} as const;
type LevelKey = keyof typeof LEVEL_VARIANT;
const LEVEL_BG: Record<LevelKey, string> = {
    consensus: "bg-success",
    sdk: "bg-purple",
    wallet: "bg-accent",
    infrastructure: "bg-warn",
};
function variant(level: string): "secondary" | (typeof LEVEL_VARIANT)[LevelKey] {
    return LEVEL_VARIANT[level as LevelKey] ?? "secondary";
}
function text(level: string): string {
    return LEVEL_TEXT[level as LevelKey] ?? "text-muted-foreground";
}
function bg(level: string): string {
    return LEVEL_BG[level as LevelKey] ?? "bg-faint";
}
export default function ImplementationMatrix({ impls, zips, }: {
    impls: Implementation[];
    zips: ZipMeta[];
}) {
    const levels = [...new Set(impls.map((i) => i.level))];
    return (<>
      <div className="mb-3 mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <MatrixFilter total={zips.length}/>
        <p className="ml-auto text-xs text-muted-foreground">
          {impls.length} implementations · {zips.length} ZIPs tracked
        </p>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label="Legend">
        {levels.map((l) => (<Badge key={l} variant={variant(l)}>
            {l}
          </Badge>))}
        <span className="inline-flex items-center gap-1">
          <span className="font-semibold text-success" aria-hidden="true">
            ✓
          </span>
          supported
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="text-faint" aria-hidden="true">
            ·
          </span>
          not tracked
        </span>
      </div>

      <div className="max-h-[calc(100vh-8rem)] overflow-auto rounded-lg border border-border-subtle">
        <table className="w-full border-collapse text-sm" id="mtx-table">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 top-0 z-30 border-b border-border bg-background px-2.5 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-faint after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border-subtle">
                ZIP
              </th>
              {impls.map((impl) => (<th scope="col" key={impl.name} title={impl.notes} className="sticky top-0 z-20 border-b border-border bg-background px-2.5 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-faint">
                  <span className={`mr-1.5 inline-block size-2 rounded-full align-middle ${bg(impl.level)}`} aria-hidden="true"/>
                  <a href={impl.url} rel="noopener noreferrer" className="text-xs normal-case tracking-normal text-muted-foreground hover:text-accent">
                    {impl.label}
                  </a>
                </th>))}
            </tr>
          </thead>
          <tbody>
            {zips.map((zip) => (<tr key={zip.slug} data-q={`${zip.displayNumber} ${zip.title}`.toLowerCase()}>
                <th scope="row" className="sticky left-0 z-10 min-w-[24rem] border-b border-border-subtle bg-background px-2.5 py-1.5 text-left font-normal after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border-subtle">
                  <Link href={`/zip/${zip.number}/`} className="group flex items-baseline gap-2 hover:no-underline">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {zip.displayNumber}
                    </span>
                    <span className="max-w-[22rem] truncate text-muted-foreground group-hover:text-accent">
                      {zip.title}
                    </span>
                  </Link>
                </th>
                {impls.map((impl) => (<td key={impl.name} className="min-w-16 border-b border-border-subtle px-2.5 py-1.5 text-center" title={`${impl.label}${impl.zips.includes(zip.number ?? -1) ? ": supported" : ""}`}>
                    {impl.zips.includes(zip.number ?? -1) ? (<span className={`font-semibold ${text(impl.level)}`} aria-label="supported">
                        ✓
                      </span>) : (<span className="text-faint" aria-label="not tracked">
                        ·
                      </span>)}
                  </td>))}
              </tr>))}
          </tbody>
        </table>
      </div>

      <section className="mt-8 text-xs text-muted-foreground" aria-label="Implementation notes">
        <h2 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-faint">
          Notes
        </h2>
        <ul className="space-y-1">
          {impls.map((impl) => (<li key={impl.name}>
              <a href={impl.url} rel="noopener noreferrer" className="hover:text-accent hover:underline">
                {impl.label}
              </a>{" "}
              — {impl.notes}
            </li>))}
        </ul>
      </section>
    </>);
}
