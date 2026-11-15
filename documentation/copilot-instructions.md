**Repository Purpose**
- Static HTML/CSS/JS site for independent economic commentary, with JSON as the runtime data source.
- Deployed to Vercel. There is no application build step; `npm run generate:content` regenerates article metadata, RSS, sitemaps, and the journal search index.

**Quick Start / Preview**
```bash
python3 -m http.server 8000
# or
npx serve .
```

**Runtime data**
- `json/journal.json` - primary publishing feed, grouped by date (`MM/DD/YY`), newest first.
- `json/financials-data.json` - indicators and prediction markets rendered by `js/financials.js` and `js/charts.js`.
- `json/media.json` - media catalog rendered by `js/media.js`.
- `json/13f-holdings.json` - 13F holdings; updated by `scripts/get_latest_13f_holdings_final.py`.
- `json/article-index.json` - generated manifest for `article.html?slug=<slug>`.
- `json/journal-tags.json` - generated file-to-tags map for file-backed journal entries.
- `json/journal-search.json` - generated plain-text index used by the journal search box.

**Publishing workflow**
1. Routine publishing starts in `json/journal.json`. Add the entry to the newest date block at the top of the file, or create a new date block.
2. For a file-backed entry, create `article/posts/YYYY-MM-DD-slug.md` with YAML frontmatter:

```markdown
---
date: 2026-11-15T12:00:00Z
category: policy
tags: ["housing", "regulation"]
---
```

3. Add the journal entry with `title`, `category`, `subcategory`, `type`, `file`, and `collapsed`. Do not duplicate the title as a heading inside the markdown body.
4. Tags for file-backed entries are canonical in the markdown frontmatter. `scripts/build-article-index.js` writes them to `json/journal-tags.json` and removes duplicated `tags` from those journal entries.
5. Run `npm run generate:content` after adding or editing a markdown file. It rebuilds the tag map, `json/article-index.json`, `json/journal-search.json`, the RSS feed, and sitemaps.
6. Run `npm run validate` before publishing. It checks journal schema, date order, canonical categories, tag sync, local links, and article/feed consistency.

**Journal entry fields**
- `title` - required, emoji prefix expected.
- `category` - one of `economy`, `policy`, `trade`, `society`, `dispatches`.
- `subcategory` - focused sub-topic such as `tariffs`, `housing`, `markets`, `legal`, `personal`.
- `type` - `note`, `essay`, `data`, `curation`, `dispatch`, or `verse`.
- `tags` - lowercase kebab-case, maximum 5. File-backed entries inherit tags from markdown frontmatter.
- `time` - optional `h:mm AM/PM` timestamp. Include it when known; it orders entries within a day.
- `content`, `file`, or `link` - at least one is required.

**Embedding charts in posts**
- Use `{{chart:Indicator Name}}`. The name must exactly match the `name` field in `json/financials-data.json`.
- `js/markdown.js` renders the placeholder into a chart container consumed by `js/charts.js`.

**Financial indicator JSON template (example)**
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

**Prediction market (NFL) JSON template**
```json
{
  "category": "Prediction Markets",
  "agency": "Polymarket",
  "name": "NE @ CIN",
  "game_title": "Patriots @ Bengals",
  "game_time": "Nov 23, 2025 1:00 PM ET",
  "game_time_iso": "2025-11-23T13:00:00-05:00",
  "url": "https://polymarket.com/event/...",
  "NE_win_odds": "62¢",
  "CIN_win_odds": "38¢",
  "lastUpdated": "2025-11-22T14:00:00Z"
}
```
Always verify odds live on Kalshi/Polymarket before editing, include `lastUpdated`, and use `AWAY @ HOME` for matchup names.

**13F holdings workflow**
- Inspect and run `scripts/get_latest_13f_holdings_final.py` to regenerate `json/13f-holdings.json`.
- Keep a `lastUpdated` timestamp in the JSON root.

**Files NOT to change without approval**
- `sw.js` cache strategy, Google Analytics IDs/snippets, and `vercel.json` routing.

**Quick PR checklist**
- Journal entries and their markdown files are updated together.
- File-backed tags live in markdown frontmatter; `npm run generate:content` writes `json/journal-tags.json`.
- `npm run validate` passes.
- Source URLs and `lastUpdated` timestamps are present for financial or prediction-market data.
- Avoid em dashes in prose and the "not X, it's Y" inversion.