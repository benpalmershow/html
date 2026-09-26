**Repository Purpose (short)**
- Static HTML/CSS/JS site serving curated commentary and financial indicators; JSON files are the runtime data source. Deployed to Vercel; no build step.

**Quick Start / Preview**
- Serve locally from repo root and open the site:

```bash
python -m http.server 8000
# or
npx serve .
```

**Where runtime data lives**
- `json/posts.json` — post index consumed by `js/posts-loader.js` (prefetched in `index.html`).
- `json/financials-data.json` — all indicators & prediction markets rendered by chart code (`js/posts-loader.js`, `js/charts.js`).
- `json/13f-holdings.json` — 13F holdings; updated by `get_latest_13f_holdings_final.py`.

**Posts workflow (exact rules)**
- Add a markdown file to `article/posts/` with YAML frontmatter containing at minimum:

```markdown
---
date: 2025-11-22T10:50:00
---
```

- Add/replace the corresponding entry in `json/posts.json` with the `date` and `file` path. Example entry:

```json
{
  "date": "2025-11-22T10:50:00",
  "file": "article/posts/2025-11-22-consumer-sentiment-final.md"
}
```

**Embedding charts in posts**
- Use the exact template syntax: `{{chart:Indicator Name}}` (indicator `name` must match `json/financials-data.json`).
- `js/posts-loader.js` replaces `{{chart:...}}` with a chart container and `data-indicator` attribute used by the chart renderer.

**Financial indicator JSON template (example)**
- A minimal indicator object in `json/financials-data.json` looks like:

```json
{
  "category": "Consumer Indicators",
  "agency": "Conference Board",
  "name": "Consumer Sentiment",
  "releaseDay": 22,
  "url": "https://example.gov/consumer-sentiment",
  "november": "51",
  "october": "53.6",
  "change": "-2.6",
  "lastUpdated": "2025-11-22T12:00:00Z"
}
```

**Prediction market (NFL) JSON template (follow `docs/financial_fetch.md`)**

```json
{
  "category": "Prediction Markets",
  "agency": "Kalshi",
  "name": "NE @ CIN",
  "game_title": "Patriots @ Bengals",
  "game_time": "Nov 23, 2025 1:00 PM ET",
  "game_time_iso": "2025-11-23T13:00:00-05:00",
  "url": "https://kalshi.com/markets/...",
  "polymarket_url": "https://polymarket.com/event/...",
  "NE_win_odds": "62¢",
  "CIN_win_odds": "38¢",
  "lastUpdated": "2025-11-22T14:00:00Z"
}
```

Note: Always verify odds live on Kalshi/Polymarket before editing; include the `lastUpdated` timestamp and source URLs.

**13F holdings workflow (short)**
- Inspect and run `get_latest_13f_holdings_final.py` to fetch or regenerate `json/13f-holdings.json`. Example:

```bash
python get_latest_13f_holdings_final.py
```

Check output file `json/13f-holdings.json` and add a `lastUpdated` timestamp in the JSON root.

**Runtime notes & gotchas**
- `index.html` prefetches `json/posts.json` into `window.postsPromise`. If you change the fetch path or add querystring/versioning, update the prefetch code.
- `js/posts-loader.js` expects `marked`, `Chart` and `lucide` to be globally available (CDN loads). If altering loaders, ensure fallback/timeouts are preserved.
- Charts: `js/posts-loader.js` looks for month-named fields (e.g., `november`, `october`) and `bps_probabilities` for prediction markets. Keep field names consistent.

**Files NOT to change without approval**
- `sw.js` (cache strategy), analytics IDs and `vercel.json` routing.

**Quick PR checklist for AI edits**
- Update `json/` and `article/` changes together when posting content.
- Include source URLs and `lastUpdated` fields for any financial/prediction data.
- Run a local static preview and visually verify charts render.

If you want, I can append a few real `json/financials-data.json` objects from the repo as examples, or add a small validation script to check `{{chart:...}}` references against `json/financials-data.json` names.
**Repository Purpose**
- **What:** Static content site (news/posts/analysis) with curated financial indicators and prediction markets.
- **Key runtime:** Pure static HTML/CSS/JS with JSON-backed content. Deployed to Vercel (`vercel.json`) and served with `sw.js` service-worker support.

**Big-picture Architecture**
- `index.html`, `news.html`, `journal.html`, `financials.html`, `media.html`, `portfolio.html` are entry points that assemble small reusable components from `components/` and runtime data from `json/`.
- Content pipeline: markdown posts in `article/posts/` -> indexed in `json/posts.json` -> consumed by `js/posts-loader.js` and other client scripts.
- Financial/indicator data lives in `json/financials-data.json`; charts and UI render via `js/` (e.g., `js/posts-loader.js`, `js/charts.js`).
- Serverless/deploy: Vercel static hosting; no build step found in repo — changes are typically direct edits to HTML/JS/JSON and then deploy.

**Critical Developer Workflows**
- Local preview: serve the folder with a static server, e.g. `python -m http.server 8000` or `npx serve .` from the repo root and open `http://localhost:8000`.
- Updating posts: add markdown file to `article/posts/` with YAML frontmatter including a `date` field, then update `json/posts.json` (see `docs/posts-prd.md` for exact format). `js/posts-loader.js` prefetches `json/posts.json` at runtime.
- Updating indicators/prediction markets: edit `json/financials-data.json` following the templates in `docs/financial_fetch.md`. For NFL prediction updates, follow the explicit verification and odds protocol in that doc.
- 13F holdings: `get_latest_13f_holdings_final.py` is the canonical script for fetching 13F data — inspect it before editing `json/13f-holdings.json`.

**Project-specific Conventions & Patterns**
- Use `{{chart:Indicator Name}}` in markdown posts to inject charts; the indicator name must match the `name` field in `json/financials-data.json` (see `docs/posts-prd.md`).
- Post format: markdown files in `article/posts/` must have YAML frontmatter with `date: YYYY-MM-DDTHH:MM:SS` (ISO) — `posts-loader.js` relies on that.
- Component usage: reusable fragments live in `components/` and are referenced inline in HTML; prefer updating `components/*` for shared UI changes (header, footer, analytics snippets).
- Assets & cache: critical CSS is preloaded in HTML (see `index.html`), and `sw.js` manages offline caching — be conservative changing cache keys.
- **Internal linking to financials categories**: Use query parameter method: `financials.html?filter=CategoryName` (e.g., `financials.html?filter=Commodities`, `financials.html?filter=Housing%20Market`). Spaces encoded as `%20`, ampersands as `%26`. The page auto-filters and activates the filter button. **Prefer this over hash anchors**—it's the established pattern.

**Integration Points & External Dependencies**
- CDN libs: `marked`, `Chart.js`, `lucide` loaded via CDNs in HTML — script loaders in `index.html` and `js/*` expect them to be globally available.
- External data sources: prediction markets (Kalshi/Polymarket), official agencies (BLS, Fed, FRED) referenced in `docs/financial_fetch.md` — always record source URLs and timestamps when updating JSON.
- Deployment: `vercel.json` implies Vercel; CI/deploy hooks are not in-repo. Assume push-to-main triggers deploy unless repo uses an external pipeline.

**Where to Look (examples)**
- Post ingestion rules: `docs/posts-prd.md` (examples and `{{chart:...}}` usage)
- Financial data SOP: `docs/financial_fetch.md` (indicator templates and prediction-market procedures)
- Runtime renderer: `js/posts-loader.js` (time formatting, markdown parsing, chart placeholder insertion)
- Site shell & preloads: `index.html` (critical CSS, analytics, resource preloading)
- JSON sources: `json/posts.json`, `json/financials-data.json`, `json/13f-holdings.json`

**What an agent can safely do**
- Edit or add markdown posts (follow `docs/posts-prd.md`), update `json/posts.json`, and adjust `components/` and `css/` files for presentation.
- Update `json/financials-data.json` after following verification steps in `docs/financial_fetch.md` (especially for prediction markets and odds).

**What an agent must NOT do without confirmation**
- Do not change `sw.js` caching strategy, Google Analytics IDs, or `vercel.json` routing without human sign-off.
- Do not publish unverified market odds or financial figures; updates to `json/financials-data.json` must include source URL & timestamp.

**Short checklist for PRs by an AI agent**
- Update `json/` and `article/` changes together (posts + posts.json).  
- Run a local static preview to validate UI and chart rendering.  
- Add source URLs & `lastUpdated` timestamps when touching data JSON.  
- Keep edits focused; avoid reorganizing files unless requested.

If any of these sections are unclear or you'd like more examples merged from `docs/`, tell me which area to expand and I'll iterate.
