# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Local Development

No build step. Serve locally from the repo root:
```bash
python -m http.server 8000
# or
npx serve .
```
Then open `http://localhost:8000`. Visually verify charts render after any content or JS change.

## Architecture

**Howdy, Stranger** is a static HTML/CSS/JS site for independent economic commentary. There is no framework, no bundler, and no database - JSON files are the runtime data source, deployed to Vercel with no build step.

**Entry points** (`index.html`, `financials.html`, `news.html`, `journal.html`, `media.html`, `portfolio.html`) compose reusable HTML fragments from `components/` (header, footer, analytics, fonts, etc.) and pull runtime data from `json/`.

**Content pipeline:**
- Long-form articles live in `article/` (and `_/` for drafts/archive)
- Short posts live in `article/posts/` as markdown with YAML frontmatter
- `json/posts.json` is the post index, consumed by `js/posts-loader.js` (prefetched via `window.postsPromise` in `index.html`)
- `js/posts-loader.js` parses markdown, extracts snippets, injects chart placeholders (`{{chart:Name}}`), and relies on `marked`, `Chart.js`, and `lucide` being available globally via CDN

**Financial data:** `json/financials-data.json` holds all indicators and prediction markets. Charts and the financials page render from this file via `js/charts.js` and `js/financials.js`.

**Other data files:**
- `json/media.json` - curated media
- `json/journal.json` - journal/tweet feed
- `json/portfolio.json` - investment portfolio
- `json/13f-holdings.json` - 13F holdings (updated by `scripts/get_latest_13f_holdings_final.py`)

**`scripts/`** contains utility scripts (RSS generation, Python data fetchers). See `docs/financial_fetch.md` for the full data update SOP.

## Posts Workflow

See `docs/posts-prd.md` for full spec. Quick reference:

1. Create `article/posts/YYYY-MM-DD-slug.md` with YAML frontmatter:
   ```markdown
   ---
   date: 2025-11-22T10:50:00Z
   category: financials
   ---
   ```
2. Add an entry to `json/posts.json` (newest first):
   ```json
   { "date": "2025-11-22T10:50:00Z", "file": "article/posts/2025-11-22-slug.md" }
   ```
3. Use `<p>` tags for paragraphs (not `<br><br>`) - snippet extraction depends on them.
4. Use `{{chart:Indicator Name}}` to embed a chart; the name must exactly match the `name` field in `json/financials-data.json`.
5. Use Lucide icons (`<i data-lucide='icon-name' class='post-icon'></i>`), not emojis.
6. Keep posts under 150 words. Use `<b>` for bold, not `**markdown**`.
7. Internal links to financials use query params: `financials.html?filter=Category%20Name` (not hash anchors).

**MoM percentage formula:** `((Current - Previous) / Previous) × 100`, rounded to one decimal. Always verify arithmetic.

**Use the latest data:** In `financials-data.json`, always read the most recent year object (e.g., `"2026": {"february": "60.04"}`), not older monthly fields.

## Financial Data Updates

See `docs/financial_fetch.md` for the full SOP (NFL predictions, FOMC markets, economic indicators).

- **Never** enter market odds without verifying live from Kalshi/Polymarket URLs.
- Always include `lastUpdated` (ISO timestamp) and source URLs in any JSON data change.
- NFL format is always `AWAY @ HOME`.

## CSS / Theming

- Use CSS custom properties for all colors - never hardcode values that would break dark mode.
- Text must be black in light mode and white in dark mode; use theme-aware variables.
- Always verify new UI works in both light and dark modes before committing.

## Code Conventions

- File names: kebab-case. JS variables/functions: camelCase.
- ES6+ modules, async/await, try/catch around async operations.
- CDN libs (`marked`, `Chart.js`, `lucide`) are loaded globally in HTML - do not import them as modules.
- Relative imports within the project.
- Reusable UI changes (header, footer, analytics) belong in `components/`, not duplicated across HTML files.

## Do Not Change Without Approval

- `sw.js` (cache strategy)
- Google Analytics IDs
- `vercel.json` routing

## Anti-AI Writing Patterns

This site publishes human-written economic commentary. Avoid these AI tells in all article and post content:

1. **Em dashes in prose** - use a regular hyphen with spaces instead.
   - Wrong: "Survival in West Texas isn't noble—it's brutal."
   - Right: "Survival in West Texas isn't noble - it's brutal."
   - Exception: em dashes in markdown table structure are fine.

2. **"It's not X, it's Y" inversion** - restructure instead.
   - Wrong: "The tariff isn't the objective—it's the deterrent."
   - Right: "The tariff functions as a deterrent, not the objective."

## Data File Preservation

**Never delete existing entries from JSON data files (journal.json, media.json, posts.json, etc.) unless explicitly instructed.** New commits should only add new entries. If old entries need to be removed, this must be explicitly stated in the task description.
