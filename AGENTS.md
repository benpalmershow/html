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
- Regenerate the article index, feed, and sitemaps after any content change:
  - `npm run generate:content`
  - (runs `node scripts/build-article-index.js` then `node scripts/generate-rss.js`)
  - `npm run publish` runs this automatically.
- Keep short notes out of the index (their feed links fall back to `journal.html` anchors):
  - `ARTICLE_MIN_WORDS=200 npm run generate:content`
- Update World Cup data locally:
  - `FOOTBALL_DATA_API_KEY={{FOOTBALL_DATA_API_KEY}} python3 scripts/fetch_world_cup.py`

### Focused single-file checks
- Validate one JSON file quickly:
  - `python3 -m json.tool json/journal.json > /dev/null`
  - `python3 -m json.tool json/financials-data.json > /dev/null`

## Big-picture architecture
- This is a static site (HTML/CSS/JS + JSON data files) with Vercel routing/caching config in `vercel.json`; there is no build pipeline.
- Entry pages (`index.html`, `financials.html`, `journal.html`, `article.html`, `media.html`, `one-pager.html`) load shared scripts and inject reusable fragments from `components/` (footer, meta/fonts, analytics, unified scripts).

### Shared client runtime
- `js/services.js` is the shared foundation:
  - `Services.dataService` (JSON/text fetch + cache)
  - `Services.Registry` (pluggable render/chart strategies)
  - `Services.events` (event bus)
- `js/html-utils.js` centralizes sanitization, markdown frontmatter parsing, numeric parsing, and component/script injection helpers.
- `js/markdown.js` is the shared Markdown renderer (UMD: `window.MarkdownUtils` in the browser, `require()` in Node). `journal.html`, `article.html`, and `scripts/build-article-index.js` all use it so the journal feed, the article page, and the feed render identical markup. Change it in one place, never in a copy.
- Navigation is hardcoded inline in each HTML page's `<nav>` element; there is no `pages-config.js` or `nav.js`.
- `js/search.js` is a placeholder; no page currently ships a search UI.

### Data model and page ownership
- `json/financials-data.json`: core “Numbers” dataset (indicators + prediction markets).
  - `financials.html` orchestration lives in `js/financials.js`.
  - Indicator cards are rendered in `js/indicators.js`.
  - Chart strategy/overlay rendering is in `js/charts.js`.
  - Category/search filtering is in `js/filters.js` + `js/search.js`.
  - World Cup and 13F sections are appended by `js/world-cup.js` and `js/13f-holdings.js`.
  - Deep links use `financials.html?indicator=<exact indicator name>`; `scrollToIndicatorByName()` in `js/financials.js` resolves the card.
- `json/journal.json`: primary publishing feed.
  - `journal.html` renders entries inline, loads markdown from `entry.file`, and links each file-backed entry to its standalone page via `.entry-permalink`.
  - Entry ids are the source file basename; `data-slug` holds the title slug so `journal.html#<title-slug>` anchors resolve.
- `json/article-index.json`: generated manifest of every publishable article (slug, source file, title, date, category, tags).
  - `article.html?slug=<slug>` is the single article page; it reads this manifest, fetches the markdown, and renders it in the browser.
- `json/media.json`: media catalog.
  - `js/media.js` handles typed filtering (`?type=` / `?filter=`), sorting, rendering, and IndexedDB caching.
- `index.html` summary cards are aggregated by `js/one-pager.js`, which pulls latest items from journal/media/financials and links into full pages via query params.

### Content and automation flows
- Journal-first publishing is the default (`docs/posts-prd.md`): add new routine items to `json/journal.json` first; long-form lives in `article/` and is linked from journal entries.
- Article pages are rendered by one page, not one file per article:
  - `article.html?slug=<slug>` loads `json/article-index.json`, fetches the markdown source, and renders it with `js/markdown.js`.
  - `scripts/build-article-index.js` writes that manifest from every `article/**/*.md` (excluding `article/draft/`).
  - `scripts/generate-rss.js` reads the same sources to build `news-feed.xml`, `news-sitemap.xml`, and `sitemap.xml`; every emitted URL must resolve to a real page.
  - Run `npm run generate:content` after any article or journal edit. `npm run publish` already does.
  - Article slugs come from the source file basename so URLs stay stable when a title is edited.
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
- Keep internal Numbers links query-param based (`financials.html?filter=...`, `financials.html?indicator=<exact name>`) rather than hash-only navigation.
- Article bodies live in `article/**/*.md`; the browser renders them, so never hand-edit rendered article output.
- Do not delete existing entries from JSON content files unless explicitly instructed.
- Writing style for journal/posts: avoid em dashes in prose; use a spaced hyphen instead.
- **ANT (Anthropic) earnings card protection**:
  - ANT is manually sourced from SEC S-1 filing, not available via yfinance
  - `.github/workflows/fetch-earnings.yml` backs up and restores the ANT entry
  - `scripts/fetch_earnings.py` skips ANT symbol during yfinance fetch
  - Do not remove ANT from `json/earnings-tickers.json` (workflow auto-adds it if missing)
  - To update ANT data: manually edit `json/earnings.json` quarterlyFinancials entry with new S-1 fields
