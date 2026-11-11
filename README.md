# zipreader

An unofficial, static web frontend for the [zcash/zips](https://github.com/zcash/zips) repository — rendered ZIPs, open PRs as browsable proposals, an implementation matrix, network-upgrade timelines, and curated cross-references.

**Clearly unofficial.** Every page pins the upstream commit it was rendered from and links to the canonical repo. Normative ZIP text lives only in `zcash/zips`.

## How it works

```
vendor/zips (shallow clone)          data/*.yaml (curated)
        │                                  │
        ▼                                  ▼
  scripts/sync.mts  ──── writes ───▶  content/*.json + content/rendered/*.html
        │                             public/api/*.json (machine-readable)
        ▼
  next build (SSG, output: "export")  ──▶  out/ (static site)
        ▼
  pagefind --site out  ──▶  out/pagefind/ (client-side full-text search)
```

- **Parsing** — ZIP metadata headers are indentation-based `Key: Value` blocks (2-space indent in `.rst`, 4-space in `.md`, wrapped in a leading `::` literal block for rst). Some third-party repos instead wrap the header in a fenced code block at zero indent — handled too. `scripts/sync.mts` handles all variants plus multi-line values (`Owners`, `Credits`, `Original-Authors`).
- **Rendering** — markdown via `remark` + GFM + Shiki (dual light/dark themes); RST via `docutils` (`scripts/rst2fragment.py`, class-based Pygments, section ids moved onto headings for the ToC). rst is the *dominant* format upstream (100 of 125 ZIPs).
- **PRs** — fetched from the GitHub API at sync time only (never per-visitor), mapped to ZIPs by: explicit `Pull-Request:` header claims (strongest), title/body/branch heuristics, and changed-file paths. Inline diffs are cached where the changed-file set is small. Set `GITHUB_TOKEN` for full coverage (60 req/hr unauthenticated caps file fetching).
- **External sources** — watched third-party PRs are curated per-PR in `data/sources.yaml` (e.g. `tachyon-zcash/zips#5` for the NuTachyon draft ZIPs). Each pinned PR is fetched and rendered through the same pipeline but namespaced under `/external/<id>/<number>/` with explicit provenance; nothing outside the pinned entries is tracked, and they never mix into the canonical ZIP set, the drafts index, or the primary `/prs/` listing.
- **Curated layer** — `data/upgrades.yaml`, `data/implementations.yaml`, `data/crossrefs.yaml`, `data/sources.yaml`. Best-effort seeds; fix via PR.
- **Render cache** — `content/render-cache.json` keys rendered HTML by input identity (git blob sha for canonical docs; repo + head sha + file for PR previews), so a warm sync re-renders only what actually changed. Bump `RENDER_CACHE_VERSION` in `scripts/sync.mts` when changing the render pipeline.
- **Search** — Pagefind indexes only ZIP/draft bodies (`data-pagefind-body`), post-build, fully static.

## Development

```sh
pnpm install
pnpm sync        # clone/pull vendor/zips + render + fetch PRs → content/
pnpm dev         # search won't work in dev (no pagefind assets); everything else does
pnpm build       # sync + next build + pagefind → out/
pnpm start       # preview the static export (pnpm dlx serve out)
pnpm storybook   # component workbench at http://localhost:6006
```

Every component has its own story file next to it (`src/components/*.stories.tsx`, `src/components/ui/*.stories.tsx`). Mock data lives in `src/lib/fixtures.ts`.

## Link previews

Every route ships its own title, description, canonical URL, Open Graph tags and X card tags. Section pages come from `ogMetadata()` in `src/lib/og.ts` over the copy in `scripts/og-cards.json`; dynamic pages (each ZIP, draft, PR, upgrade, external source) pass a doc-card slug, so a shared link carries a card with that page's real title.

Card images are 1200×630 PNGs generated at deploy time — never committed. `scripts/og.mts` draws them with satori + resvg (pure node, no browser): one per section, plus one per page of the stable corpus — every ZIP, draft, upgrade, external source, and currently-open PR, with its actual title — plus the apple-touch-icon. PR previews share their PR's card. `pnpm build` runs it after the sync; run `pnpm og` to draw them standalone:

```sh
pnpm og
```

To see the cards before a deploy, run:

```sh
pnpm og:preview
```

It starts the dev server and opens `/og-preview.html`, which fetches each sample route as a crawler does and shows four sections: the images, a table of checks with a column per route, the card as X, Slack, Discord, LinkedIn, Facebook and iMessage lay it out for a chosen route, and the raw tags. Once the site is live, the platforms' own tools show the real result: the Facebook Sharing Debugger, the LinkedIn Post Inspector, and a draft post on X.

pnpm is the package manager of record: `"packageManager"` pins the version (Corepack-compatible), `pnpm-lock.yaml` is committed, CI installs with `--frozen-lockfile`.

Upstream is vendored read-only in `vendor/zips/` (shallow clone). Re-run `npm run sync` to refresh; the pinned commit lands in `content/meta.json` and the site footer.

## Stack

| Concern    | Choice                                          |
| ---------- | ----------------------------------------------- |
| Framework  | Next.js App Router, full static export           |
| Styling    | Tailwind CSS v4 + shadcn-style components (no runtime CSS-in-JS) |
| md + code  | remark + rehype + Shiki                          |
| rst        | docutils in the build pipeline                   |
| Search     | Pagefind (static, no server)                     |
| Curated data | YAML in this repo                              |

Client JS is limited to: index filters, ToC scroll-spy, zen-mode + theme toggles, the search box, and the matrix filter. Everything else is server-rendered HTML.

## Deployment

The `out/` directory is fully static — serve from any edge/CDN with immutable caching on `/_next/static/` and `/pagefind/`. Rebuild + redeploy on:

- **Schedule** — `.github/workflows/sync.yml` runs the sync + build daily.
- **Webhook** — point a `repository_dispatch` (or your host's deploy hook) at the same workflow for push-triggered revalidation; no origin server needed in the hot path.
