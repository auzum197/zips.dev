import type { Metadata } from "next";
import { ogMetadata } from "@/lib/og";
import { notFound } from "next/navigation";
import PageHeader from "@/components/page-header";
import PrList from "@/components/pr-list";
import { getExternalPrsForSource, getExternalSource, getExternalSources } from "@/lib/data";
export const dynamicParams = false;
export function generateStaticParams() {
    return getExternalSources().map((s) => ({ source: s.id }));
}
export async function generateMetadata({ params, }: {
    params: Promise<{
        source: string;
    }>;
}): Promise<Metadata> {
    const { source } = await params;
    const s = getExternalSource(source);
    if (!s)
        return {};
    return ogMetadata({
        title: `${s.label} external drafts`,
        description: s.note ?? undefined,
        path: `/external/${source}/`,
        card: `external-${source}`,
    });
}
export default async function ExternalSourcePage({ params, }: {
    params: Promise<{
        source: string;
    }>;
}) {
    const { source } = await params;
    const s = getExternalSource(source);
    if (!s)
        notFound();
    const prs = getExternalPrsForSource(s.id);
    return (<div className="mx-auto max-w-[88rem]">
      <PageHeader title={<>
          {s.label}{" "}
          <span className="font-mono text-base font-normal text-faint">{s.repo}</span>
        </>} intro={<>Third-party proposal repository watched by this site · open PRs
          cached at sync time · not part of the canonical zcash/zips ZIP
          set.</>}/>
      {s.note && (<p className="mt-2 max-w-[72ch] text-sm text-muted-foreground">{s.note}</p>)}
      {s.error && (<p className="mt-4 rounded-md bg-warn-soft px-3 py-2 text-sm text-warn">
          Data unavailable this build — showing the last cached snapshot.
        </p>)}

      <div className="mt-6">
        {prs.length === 0
        ? (<p className="text-sm text-muted-foreground">No open pull requests.</p>)
        : <PrList prs={prs}/>}
      </div>

      <p className="mt-10 text-[0.8125rem] text-faint">
        Rendered from each pull request's head commit; normative text (if
        adopted) lives in{" "}
        <a className="underline underline-offset-2" href={`https://github.com/${s.repo}`}>
          github.com/{s.repo}
        </a>
        .
      </p>
    </div>);
}
