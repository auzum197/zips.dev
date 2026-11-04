# ZIPs Explorer — Requirements

An unofficial web frontend for the [zcash/zips](https://github.com/zcash/zips) repository.

## Problem

Existing ZIP frontends are plain renderers: zips.z.cash is a raw index, zips.tools is a commit-pinned snapshot reader, bips.dev proves the clean-reader model for Bitcoin but has no meta layer. Nothing shows the *life* of a proposal: open PRs, implementation status, network-upgrade context, or cross-references.

## Solution

A fast, reader-first site that renders all ZIPs **and** adds a meta layer: PRs as browsable proposals, a ZIP × implementation matrix, network-upgrade timelines, and curated cross-links (related ZIPs, protocol spec sections, analogous BIPs). Clearly unofficial; always links to the canonical repo and pins the upstream commit.

## Goals

- Best-in-class reading experience for ZIPs (numbered and drafts)
- Make proposal lifecycle visible: open PRs as rendered diffs/previews
- Curated meta layer: implementations, external references, related topics
- Static, fast, searchable, machine-readable

## Non-Goals

- Official status or any governance role; no ZIP submission/editing flows
- Per-request SSR of content that changes at merge cadence
- Live GitHub API calls per visitor
- Mirroring comments/discussions; user accounts

## Functional Requirements

1. **Index** — all ZIPs filterable by status, category, and network upgrade; includes reserved/withdrawn/obsolete.
2. **ZIP page** — rendered content with metadata (number, title, status, authors, created, license, category); revision-scoped statuses (e.g. ZIP 214, ZIP 316); heading anchors; code highlighting; canonical source link at pinned commit.
3. **Dual-format rendering** — markdown and reStructuredText sources (rst converted in the build pipeline).
4. **Drafts** — section for unnumbered `draft-*` proposals.
5. **PRs view** — open PRs to zcash/zips mapped to ZIP numbers where detectable; rendered diff plus rendered preview of proposed text; unmapped-PRs bucket.
6. **Implementation matrix** — curated ZIP × implementation grid (zebra, zcashd, ECC libraries, wallets), stored as YAML in this repo, editable via PR.
7. **Upgrade timelines** — per-upgrade views (NU5, NU6, NU6.3, NU7…) showing included ZIPs and their draft/final status.
8. **Cross-references** — related ZIPs, protocol spec sections, analogous BIPs (curated).
9. **Search** — full-text, client-side over all rendered content.
10. **JSON endpoints** — machine-readable ZIP metadata (à la zips.tools' agent guide).
11. **Provenance** — every page shows the pinned upstream commit and timestamp, plus an "unofficial" disclaimer.

## Data & Sync

- Sync job clones/pulls `zcash/zips` (schedule + webhook on push), parses metadata headers, renders documents, writes typed JSON snapshots.
- GitHub data (PRs) fetched with a token at sync time only; cached; pages revalidated on demand.
- Curated data lives as YAML in this repo.

## Non-Functional Requirements

- Static-first: SSG with on-demand revalidation; no per-request server rendering.
- Scales to ~150 documents with per-revision statuses.
- Rate-limit safe: GitHub API used only by the sync job.
- Dark mode, mobile-friendly, accessible.

## Performance ("feels local")

- Navigation must feel instant: all internal links prefetched (hover/viewport), so repeat navigation costs ~zero network.
- Fully static HTML served from an edge CDN — no origin server in the hot path.
- Client JS near zero: server components everywhere; client components only where interactive (ToC scroll-spy, zen mode, filters).
- Budgets: TTFB < 100ms p95; LCP < 1.0s p75 on mid-tier mobile; first-load JS ≤ ~100KB gzip; CLS = 0; no render-blocking third-party scripts.
- No webfonts (per Design), critical CSS inlined, immutable cache headers on static assets.
- Stretch: service worker for offline repeat visits (true "local" feel).

## Design

- Minimal chrome: as little text as possible outside the rendered ZIP — no marketing copy, no verbose navigation, bips.dev-style restraint. Content is the interface.
- Typography: bips.dev's system font stacks — `ui-sans-serif`/`system-ui` for text, `ui-monospace` for code; no webfont downloads.
- ZIP page layout, three columns: **left** — sticky, dynamic table of contents with scroll-spy; **center** — rendered ZIP; **right** — metadata panel (status/revision, authors, created, license, category) including links to open PRs touching this ZIP (their rendered diffs).
- Zen mode: toggle that hides all non-essential chrome, keeping only the table of contents alongside the content; preference persisted.

## Tech Stack (Decided)

| Concern | Choice |
|---|---|
| Framework | Next.js App Router (SSG + ISR, route handlers for webhook + JSON) |
| rst rendering | pandoc or docutils in the build pipeline |
| md rendering / code | remark + Shiki |
| Search | Pagefind (static, no server) |
| Curated data | YAML files in repo |

## Risks / Open Questions

- rst edge cases through pandoc/docutils conversion (highest technical risk)
- Quality of PR→ZIP mapping heuristics
- Ongoing maintenance cost of the curated layer (implementations, cross-links)
