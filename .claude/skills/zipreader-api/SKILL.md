---
name: zipreader-api
description: Query the zipreader JSON API (zips.auzum197.com) for Zcash Improvement Proposals. Use when asked about a ZIP by number or title, a ZIP's status, owners or category, draft ZIPs, open pull requests to zcash/zips, what is new in zcash/zips, or Zcash network upgrades (Sapling, NU5, NU6, NU7).
---

Static JSON snapshots of the zcash/zips repository, regenerated daily (05:23 UTC) by `scripts/sync.mjs`. Base URL: `https://zips.auzum197.com`. Every payload carries the upstream fields `repo`, `commit`, `commitShort`, `commitUrl`, `syncedAt`; data lags upstream by up to a day, so quote `syncedAt` and `commitShort` when freshness matters.

`zips.json` (~85 KB) and `prs.json` (~1.8 MB, carries file patches) are too large to read whole. Pipe through `jq` with `-c`, `select`, `[:20]` or `head` and keep output bounded.

## Endpoints

| Path | Use for | Payload |
|---|---|---|
| `/api/meta.json` | freshness, commit | upstream fields only |
| `/api/zips.json` | catalogue: find, filter, list | `+ zips: ZipMeta[]` (136: 125 numbered ZIPs, 6 `draft-*` drafts, 5 `zip-NNNN` files with unparsed headers that show as `kind: "draft"`, status `Unknown`). No `headings` |
| `/api/zips/<number>.json` | one numbered ZIP, with cross-refs | `ZipMeta + crossReferences, implementations: string[], upgrades: string[]`. No `headings`; drafts have no file here |
| `/api/prs.json` | open PRs, newest first | `+ error: string|null, prs: PrMeta[]` (~70) |
| `/api/upgrades.json` | network upgrades | `+ upgrades: Upgrade[]` (11) |

## Fields

`ZipMeta`: `slug` (`zip-0032` or `draft-<author>-<topic>`), `number` (null for drafts), `displayNumber`, `kind` (`zip`|`draft`), `filename`, `format` (`md`|`rst`), `title`, `status`, `revision`, `owners[]`, `credits[]`, `originalAuthors[]`, `category`, `created`, `license`, `discussionsTo`, `pullRequests[]` (URLs declared in the ZIP header), `upstreamPath`, `upstreamUrl`, `wordCount`, `rendered`.

`status` is free text. Simple values: `Draft`, `Proposed`, `Active`, `Final`, `Reserved`, `Obsolete`, `Withdrawn`, `Unknown`. Multi-revision ZIPs carry compound strings such as `[Revision 0: Canopy, Revision 1: NU6] Final, [Revision 2: NU7] Proposed`, so match with `test(...)`, not `==`. `category` is also free text (`Consensus`, `Standards / Wallet`, `Informational`, ...).

`PrMeta`: `number`, `title`, `author`, `createdAt`, `updatedAt`, `url`, `diffUrl`, `headRef`, `headRepo`, `headSha`, `additions`, `deletions`, `changedFiles`, `bodyExcerpt` (300 chars), plus:
- `zipRefs: number[]`, `draftRefs: string[]` — ZIPs/drafts the PR is about. Heuristic: union of changed `zips/*.md|rst` filenames, a `ZIP NNN` regex over title/body/branch, and ZIP headers that claim the PR. The regex produces false positives (e.g. `0` or an issue number); confirm with `files[].filename`.
- `mapped` — `zipRefs` or `draftRefs` non-empty. `claimed` — some ZIP's `pullRequests` header lists this PR.
- `files[]: {filename, status (added|modified|removed|renamed), additions, deletions, patch}` — unified diff per file; `[]` with `filesTruncated: true` when the PR is large (>20 files or a 400 KB patch).
- `preview` — rendered head-of-branch copy of the first ZIP/draft document the PR touches: `{filename, title, status, format, headings[{level,id,text}]}`. Null when the PR touches no ZIP document or rendering failed.

`Upgrade`: `id` (`overwinter`, `sapling`, `blossom`, `heartwood`, `canopy`, `nu5`, `nu6`, `nu61`, `nu62`, `nu63`, `nu7`), `name`, `code`, `mainnet`, `testnet` (ISO dates or null), `status` (`proposed` or null), `summary`, `zips: number[]`.

## Recipes

```sh
B=https://zips.auzum197.com

# Freshness: which upstream commit, synced when
curl -s $B/api/meta.json | jq -c '{commitShort, syncedAt}'

# One ZIP by number (includes cross-refs, implementations, upgrades)
curl -s $B/api/zips/32.json | jq -c '{number,title,status,category,owners,upgrades,implementations,crossReferences}'

# Find ZIPs by title keyword
curl -s $B/api/zips.json | jq -c '.zips[] | select(.title|test("hierarchical";"i")) | {number,slug,kind,title,status}'

# List by status / category / owner (first 20)
curl -s $B/api/zips.json | jq -c '[.zips[] | select(.status|test("proposed";"i")) | {number,title,status}][:20][]'
curl -s $B/api/zips.json | jq -c '[.zips[] | select(.category|test("wallet";"i")) | {number,title,category}][:20][]'
curl -s $B/api/zips.json | jq -c '[.zips[] | select(.owners|join(",")|test("grigg";"i")) | {number,title}][:20][]'

# Draft ZIPs (unnumbered; slug prefix excludes the unparsed zip-NNNN placeholders)
curl -s $B/api/zips.json | jq -c '.zips[] | select(.slug|startswith("draft-")) | {slug,title,status,owners}'

# Open PRs, newest first (first 20); first line is .error
curl -s $B/api/prs.json | jq -c '.error, (.prs | sort_by(.updatedAt) | reverse | .[:20][] | {number,title,author,updatedAt,zipRefs,draftRefs,hasPreview:(.preview!=null)})'

# PRs touching a given ZIP number (by ref, then by changed file)
curl -s $B/api/prs.json | jq -c --argjson n 32 '.prs[] | select(.zipRefs|index($n)) | {number,title,updatedAt,claimed,url}'
curl -s $B/api/prs.json | jq -c '.prs[] | select(any(.files[]; .filename|test("zip-0032"))) | {number,title}'

# New proposals: PRs that add a ZIP/draft document (what the /new/ page shows)
curl -s $B/api/prs.json | jq -c '.prs[] | select(any(.files[]; .status=="added" and (.filename|test("^zips/(zip-[0-9]{4}|draft-[a-z0-9-]+)\\.(md|rst)$")))) | {number,title,author,updatedAt,zipRefs,draftRefs}'

# A PR's preview: title, status, headings
curl -s $B/api/prs.json | jq -r --argjson n 1429 '.prs[] | select(.number==$n) | .preview | "\(.title) [\(.status)] \(.filename)", (.headings[] | ("#"*.level)+" "+.text)'

# A PR's changed files, then a bounded slice of one patch
curl -s $B/api/prs.json | jq -r --argjson n 1429 '.prs[] | select(.number==$n) | .filesTruncated, (.files[] | "\(.status) \(.filename) +\(.additions)/-\(.deletions)")'
curl -s $B/api/prs.json | jq -r --argjson n 1429 '.prs[] | select(.number==$n) | .files[1].patch' | head -60

# A ZIP's headings (not in the JSON; read the anchors on the rendered page)
curl -s $B/zip/32/ | grep -oE '<h[1-4][^>]*id="[^"]+"' | sed -E 's/<h([1-4])[^>]*id="([^"]+)"/h\1 \2/'

# Network upgrades and their ZIPs
curl -s $B/api/upgrades.json | jq -c '.upgrades[] | {id,name,code,mainnet,status,zips}'
```

## Linking results

Pages on `https://zips.auzum197.com`:
- numbered ZIP: `/zip/<number>/` (e.g. `/zip/32/`)
- draft: `/drafts/<slug>/` with the full slug (e.g. `/drafts/draft-arya-jvff-p2p-quic-transport/`)
- PR preview: `/prs/<number>/` — exists only when `preview` is non-null; otherwise link `url` (GitHub)
- new proposals: `/new/`; all open PRs: `/prs/`; all drafts: `/drafts/`
- upgrade: `/upgrades/<id>/` (e.g. `/upgrades/nu7/`)
- upstream source: `upstreamUrl` (pinned to the synced commit)

## Caveats

- `prs.json.error` is non-null when the GitHub fetch failed and no snapshot under 24 h old could be reused; `prs` is then empty or stale. Check it before reporting "no open PRs".
- Headings are shipped only in `prs[].preview.headings`; for a merged ZIP use the page-anchor recipe above.
- Patches in `files[].patch` can run to 100 KB per file. Always slice with `head` or `.[:N]`.
