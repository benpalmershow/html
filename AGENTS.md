# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development commands
- Install Python deps for data scripts:
  - `python3 -m pip install -r requirements.txt`
- Local preview (no build step):
  - `python3 -m http.server 8000`
  - or `npx serve .`
- Primary validation gate:
  - `npm run validate`
  - (runs `node scripts/validate-site.js`: JSON validity, content index references, local asset references, sitemap/feed presence)
- Regenerate feed/sitemap after content updates that affect RSS:
  - `npm run generate:rss`
- Update World Cup data locally:
  - `FOOTBALL_DATA_API_KEY={{FOOTBALL_DATA_API_KEY}} python3 scripts/fetch_world_cup.py`

### Focused single-file checks
- Validate one JSON file quickly:
  - `python3 -m json.tool json/journal.json > /dev/null`
  - `python3 -m json.tool json/financials-data.json > /dev/null`

## Big-picture architecture
- This is a static site (HTML/CSS/JS + JSON data files) with Vercel routing/caching config in `vercel.json`; there is no build pipeline.
- Entry pages (`index.html`, `financials.html`, `journal.html`, `media.html`, `one-pager.html`) load shared scripts and inject reusable fragments from `components/` (footer, meta/fonts, analytics, unified scripts).

### Shared client runtime
- `js/services.js` is the shared foundation:
  - `Services.dataService` (JSON/text fetch + cache)
  - `Services.Registry` (pluggable render/chart strategies)
  - `Services.events` (event bus)
- `js/html-utils.js` centralizes sanitization, markdown frontmatter parsing, numeric parsing, and component/script injection helpers.
- `js/pages-config.js` defines canonical site navigation; `js/nav.js` renders nav from it and adds “new content” badges based on `json/*.json` freshness.
- `js/search.js` auto-selects page-specific search behavior from pathname (financials/media/journal/latest lists).

### Data model and page ownership
- `json/financials-data.json`: core “Numbers” dataset (indicators + prediction markets).
  - `financials.html` orchestration lives in `js/financials.js`.
  - Indicator cards are rendered in `js/indicators.js`.
  - Chart strategy/overlay rendering is in `js/charts.js`.
  - Category/search filtering is in `js/filters.js` + `js/search.js`.
  - World Cup and 13F sections are appended by `js/world-cup.js` and `js/13f-holdings.js`.
- `json/journal.json`: primary publishing feed.
  - `js/journal-feed.js` renders entries, can load markdown from `entry.file`, and parses `{{chart:Indicator Name}}` placeholders into Chart.js charts backed by `json/financials-data.json`.
- `json/media.json`: media catalog.
  - `js/media.js` handles typed filtering (`?type=` / `?filter=`), sorting, rendering, and IndexedDB caching.
- `index.html` summary cards are aggregated by `js/one-pager.js`, which pulls latest items from journal/media/financials and links into full pages via query params.

### Content and automation flows
- Journal-first publishing is the default (`docs/posts-prd.md`): add new routine items to `json/journal.json` first; long-form lives in `article/` and is linked from journal entries.
- RSS/news generation is script-driven (`scripts/generate-rss.js`) and depends on journal markdown-linked entries plus an essay index file reference.
- World Cup automation:
  - Data fetcher: `scripts/fetch_world_cup.py` -> `json/world-cup.json`
  - Scheduled updater: `.github/workflows/fetch-world-cup.yml`

## Project-specific guardrails
- Do not change these without explicit approval:
  - `sw.js` cache strategy
  - Google Analytics IDs/snippets
  - `vercel.json` routing behavior
- For financial/prediction market updates (`docs/financial_fetch.md`):
  - Verify odds from live source URLs before writing JSON.
  - Keep `lastUpdated` timestamps and source URLs current.
  - For NFL markets, format matchup names as `AWAY @ HOME`.
- Keep internal Numbers links query-param based (`financials.html?filter=...`) rather than hash-only navigation.
- Do not delete existing entries from JSON content files unless explicitly instructed.
- Writing style for journal/posts: avoid em dashes in prose; use a spaced hyphen instead.
