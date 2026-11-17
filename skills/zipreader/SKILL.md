---
name: zipreader
description: Query the zipreader JSON API (zipreader.org) for Zcash Improvement Proposals. Use when asked about a ZIP by number or title, a ZIP's status, owners or category, draft ZIPs, open pull requests to zcash/zips, what a PR changes or proposes, watched third-party proposals (Tachyon), what is new in zcash/zips, or Zcash network upgrades (Sapling, NU5, NU6, NU7).
---

JSON snapshots of the zcash/zips repository at `https://zipreader.org`. Every payload carries `syncedAt` and `commitShort`; quote them when freshness matters.

`zips.json`, `prs.json` and `external.json` are too large to read whole: `prs.json` carries file patches. Filter with `jq -c` and bound the output with `[:20]` or `head`. Get field names with `jq 'keys'` on one element.

## Endpoints

| Path | Content |
|---|---|
| `/api/zips.json` | `zips[]`: numbered ZIPs and drafts (`kind: "draft"`, `number: null`) |
| `/api/zips/<number>.json` | one numbered ZIP with its cross-references, implementations and upgrades |
| `/api/prs.json` | `prs[]`: open PRs to zcash/zips, and `error` |
| `/api/external.json` | `sources[]` and `prs[]`: watched third-party PRs, same PR shape |
| `/api/upgrades.json` | `upgrades[]`: network upgrades and their ZIPs |

## Recipes

```sh
B=https://zipreader.org

# One ZIP by number
curl -s $B/api/zips/32.json | jq -c '{number,title,status,category,owners,upgrades,implementations,crossReferences}'

# Filter the catalogue (same pattern for .status, .category, .owners|join(","))
curl -s $B/api/zips.json | jq -c '[.zips[] | select(.title|test("hierarchical";"i")) | {number,slug,kind,title,status}][:20][]'

# Open PRs, newest first; first line is .error
curl -s $B/api/prs.json | jq -c '.error, (.prs | sort_by(.updatedAt) | reverse | .[:20][] | {number,title,author,updatedAt,docs:[.previews[].slug]})'

# PRs that touch a given ZIP
curl -s $B/api/prs.json | jq -c '.prs[] | select(any(.previews[]; .slug=="zip-0032")) | {number,title,updatedAt,url}'

# New proposals: PRs that add a ZIP or draft document
curl -s $B/api/prs.json | jq -c '.prs[] | select(any(.files[]; .status=="added" and (.filename|test("^zips/(zip-[0-9]{4}|draft-[a-z0-9-]+)\\.(md|rst)$")))) | {number,title,author,updatedAt}'

# One PR: its documents with headings, its changed files, then a slice of one patch
curl -s $B/api/prs.json | jq -r --argjson n 1429 '.prs[] | select(.number==$n) | .previews[] | "\(.slug): \(.title) [\(.status)]", (.headings[] | ("#"*.level)+" "+.text)'
curl -s $B/api/prs.json | jq -r --argjson n 1429 '.prs[] | select(.number==$n) | .filesTruncated, (.files[] | "\(.status) \(.filename) +\(.additions)/-\(.deletions)")'
curl -s $B/api/prs.json | jq -r --argjson n 1429 '.prs[] | select(.number==$n) | .files[1].patch' | head -60

# Headings of a merged ZIP: read the anchors on its page
curl -s $B/zip/32/ | grep -oE '<h[1-4][^>]*id="[^"]+"' | sed -E 's/<h([1-4])[^>]*id="([^"]+)"/h\1 \2/'
```

## Gotchas

- `status` and `category` are free text, and `status` can hold one value per revision. Match with `test(...)`, not `==`.
- A non-null `prs.json.error` means `prs` is empty or stale. Check it before you report "no open PRs". Each `external.json` source has its own `error`.
- `previews[]` lists every ZIP or draft document a PR adds or modifies. Use it to find the ZIPs a PR is about: `zipRefs` and `draftRefs` contain false positives.
- `files` is `[]` with `filesTruncated: true` for large PRs.

## Links

Link results to pages on `https://zipreader.org`:

- ZIP: `/zip/<number>/`. Draft: `/drafts/<slug>/`. Upgrade: `/upgrades/<id>/`.
- PR: `/prs/<number>/`, one document of it: `/prs/<number>/<slug>/`. These exist only when `previews` is non-empty; otherwise link the PR's `url`.
- Third-party PR: `/external/<source>/<number>/` and `/external/<source>/<number>/<slug>/`.
- Lists: `/new/` (new proposals), `/prs/`, `/drafts/`, `/external/`.
