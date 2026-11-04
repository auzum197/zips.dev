import { getMeta } from "@/lib/data";
export default function SiteFooter() {
    const meta = getMeta();
    const synced = new Date(meta.syncedAt);
    return (<footer className="zen-dim border-t border-border-subtle pb-8 pt-5 text-[0.8125rem] text-muted-foreground">
      <div className="mx-auto max-w-[88rem] px-5">
        <p>
          Unofficial — not affiliated with the Zcash creators or the ZIP editors.
          Content{" "}
          <a className="underline underline-offset-2" href={meta.commitUrl}>
            pinned to upstream <code className="font-mono text-xs text-faint">{meta.commitShort}</code>
          </a>{" "}
          (synced {synced.toISOString().slice(0, 10)}). Canonical source:{" "}
          <a className="underline underline-offset-2" href="https://github.com/zcash/zips">
            github.com/zcash/zips
          </a>
          . Normative versions live there.
        </p>
        <p className="mt-1.5 text-faint">
          Machine-readable metadata:{" "}
          <a className="underline underline-offset-2" href="/api/zips.json"><code className="font-mono text-xs">/api/zips.json</code></a>{" "}
          ·{" "}
          <a className="underline underline-offset-2" href="/api/prs.json"><code className="font-mono text-xs">/api/prs.json</code></a>{" "}
          ·{" "}
          <a className="underline underline-offset-2" href="/api/meta.json"><code className="font-mono text-xs">/api/meta.json</code></a>
        </p>
      </div>
    </footer>);
}
