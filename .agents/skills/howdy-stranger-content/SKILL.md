---
name: howdy-stranger-content
description: Manages content creation and data updates for Howdy, Stranger - independent economic commentary site. Use for creating posts, updating financial indicators, managing media, and maintaining JSON data files.
---

# Howdy, Stranger Content Management

Skill for managing all content updates and data maintenance on the static HTML site covering economic analysis, news, and lifestyle commentary.

## Overview

**Howdy, Stranger** is a static HTML/CSS/JS site with no backend database. All content is stored in JSON data files and markdown posts. This skill covers:
- Post creation and publishing
- Financial data indicator updates
- Media management
- News feed curation
- Site data maintenance

## Post Creation Workflow

Posts are stored as markdown files in `article/posts/` and rendered on `journal.html` via entries in `json/journal.json`. The `json/posts.json` file and `js/posts-loader.js` are legacy and not wired to any active page.

### 1. Create Markdown Post File

Create a new file in `article/posts/` following the naming convention:
- Format: `YYYY-MM-DD-slug-title.md`
- Example: `2026-01-08-jancara-playlist.md`

Structure the markdown with optional YAML frontmatter:

```markdown
---
date: 2026-01-08T14:00:00Z
category: government
---

### <i data-lucide='trending-down' class='post-icon'></i> **Post Title**

Content paragraph. Keep first paragraph short as it becomes the snippet.

{{chart:Consumer Sentiment}}

[View indicators](financials.html?filter=Category)
```

### 2. Add Entry to journal.json

Posts render on `journal.html` via `js/journal-feed.js`, which reads from `json/journal.json`. Add a new entry object at the **top** of the array:

```json
{
  "date": "03/28/26",
  "entries": [
    {
      "title": "📉 Post Title Here",
      "file": "article/posts/2026-03-28-slug-title.md",
      "collapsed": true
    }
  ]
}
```

**Date format:** `MM/DD/YY` (e.g., `03/28/26`)

**Entry fields:**
- `title` - Display title with optional emoji prefix
- `file` - Path to markdown file relative to site root
- `collapsed` (optional) - Set `true` to start collapsed (click to expand)

**Key rules:**
- Entries are displayed in reverse chronological order (newest first)
- Multiple entries can share the same date block
- Each entry in `entries[]` renders as a collapsible item within its date group
- Inline entries (without `file`) use `content` field for short text instead

### 3. Content Guidelines

**Avoid AI Red Flags** (from AGENTS.md):
- Avoid em dashes (—) and hyphens (-) in prose
  - Don't: "The tariff isn't the objective—it's the deterrent"
  - Do: "The tariff functions as a deterrent"
- Avoid the "It's not X, it's Y" inversion pattern

**Best Practices:**
- Include lucide icon in first heading or markdown: `<i data-lucide="book-open"></i>`
- First paragraph becomes the entry snippet (keep it short)
- Include financial data references when relevant (check `financials-data.json` for latest data)
- Use `{{chart:Indicator Name}}` to embed charts in journal entries

### 4. Post Rendering

The `journal-feed.js` script on `journal.html`:
- Loads entries from `json/journal.json`
- Fetches and parses referenced markdown files via `marked.js`
- Renders entries as collapsible items grouped by date
- Supports inline entries (no `file`) with `content` field
- Sanitizes HTML via DOMPurify

**Note:** `posts-loader.js` and `posts.json` are legacy. Do not add entries to `posts.json` unless specifically requested.

## Financial Data Management

All economic indicators are centralized in `json/financials-data.json`.

### Structure

```json
{
  "lastUpdated": "2026-01-08T20:30:00Z",
  "indices": [
    {
      "category": "Business Indicators",
      "agency": "FRED",
      "name": "10-yr Treasury Yield",
      "lastUpdated": "2025-12-10T14:00:00Z",
      "releaseDay": 0,
      "url": "https://fred.stlouisfed.org/series/DGS10",
      "march": "4.28",
      "april": "4.28",
      "may": "4.42",
      ...
      "explanation": "..."
    }
  ]
}
```

### Adding or Updating Indicators

**Monthly data fields:**
- Use lowercase month names: `january`, `february`, ..., `december`
- Store as strings with units (e.g., "4.28" for percentages, "$5,200" for prices)
- Can include "M" or "K" suffixes for large numbers (e.g., "4.00M" for millions)

**Required fields:**
- `name` - Display name for charts
- `category` - One of: Business Indicators, Consumer Indicators, Commodities, Housing Market, Trade & Tariffs, Employment Indicators, Prediction Markets
- `agency` - Data source (FRED, BLS, Census, Zillow, Kalshi, etc.)
- `explanation` - 2-3 sentence description for tooltips
- `lastUpdated` - ISO 8601 timestamp of last data refresh
- Monthly data fields with values

**Optional fields:**
- `releaseDay` - Typical release day of month (0 = varies)
- `url` - Link to source data
- `bps_probabilities` - For prediction markets (basis point odds)
- `game_title`, `game_time_iso` - For sports markets

### Calculating Month-over-Month Percentages

When publishing posts with financial data, calculate and verify MoM changes:

**Formula**: `((Current - Previous) / Previous) × 100`

**Verification steps:**
1. Identify current and previous month values from `financials-data.json`
2. Calculate the difference: Current - Previous
3. Divide by previous value: Difference / Previous
4. Multiply by 100 to get percentage
5. Round to one decimal place
6. Always double-check using a calculator before publishing

**Example:**
- November value: 79.2
- December value: 71.8
- Difference: 79.2 - 71.8 = 7.4
- Percentage: (7.4 / 79.2) × 100 = 9.34% → rounds to **9.3%**

**Critical:** Arithmetic errors in financial posts damage credibility. Verify all calculations before publishing.

### Chart Types

Charts are automatically selected based on indicator type:
- **Line charts** - Most economic indicators (default)
- **Bar charts** - Prediction markets (when `bps_probabilities` present)
- **Trade deficit charts** - When indicator has `imports` and `exports` fields

### Calculating Month-over-Month Percentages

When publishing posts with financial data, calculate and verify MoM changes:

**Formula**: `((Current - Previous) / Previous) × 100`

**Verification steps:**
1. Identify current and previous month values from `financials-data.json`
2. Calculate the difference: Current - Previous
3. Divide by previous value: Difference / Previous
4. Multiply by 100 to get percentage
5. Round to one decimal place
6. Always double-check using a calculator before publishing

**Example:**
- November value: 79.2
- December value: 71.8
- Difference: 79.2 - 71.8 = 7.4
- Percentage: (7.4 / 79.2) × 100 = 9.34% → rounds to **9.3%**

**Critical:** Arithmetic errors in financial posts damage credibility. Verify all calculations before publishing.

### Embedding Charts in Posts

Use the chart syntax in markdown. Charts render via `js/chart-renderer.js` which is loaded on `journal.html`:

```markdown
{{chart:Consumer Sentiment}}
```

The chart renderer will:
1. Replace the `{{chart:...}}` placeholder with a canvas element
2. Lazy-load Chart.js if not already loaded
3. Fetch indicator data from `financials-data.json`
4. Render the chart with IntersectionObserver (visible on scroll)

## Prediction Market Updates

### NFL Game Predictions

NFL prediction markets are stored in `json/financials-data.json` under the "Prediction Markets" category and displayed on `financials.html`.

**Typical workflow when updating NFL games:**

1. **Identify completed games:** Review current NFL games and check dates against current date
2. **Research new games:** 
   - Look up game date using web search if only teams are provided
   - Verify date is within 1-2 weeks (prediction markets only active for near-term games)
   - Primary source: Kalshi (https://kalshi.com/markets/kxnflgame)
   - Secondary source: Polymarket (https://polymarket.com/sports/nfl)

3. **Verify home/away format:**
   - Format is always `[AWAY_TEAM] @ [HOME_TEAM]`
   - The @ means "at" (away team visiting home team's stadium)
   - Example: "DAL @ LV" means Dallas visiting Las Vegas
   - Verify from market title and ESPN schedule

4. **Verify team abbreviations:**
   - Each team code maps to one team only (e.g., LV=Raiders NOT Texans)
   - Use consistent abbreviations throughout

5. **Verify odds from live markets (CRITICAL):**
   - Visit Kalshi market URL and record the "Yes" probability for each team
   - Cross-reference with Polymarket odds
   - Use odds exactly as they appear (e.g., "69¢" not "69%")
   - Do not use estimated or cached odds - verify immediately before updating

6. **Update JSON with template:**
   ```json
   {
     "category": "Prediction Markets",
     "agency": "Kalshi",
     "name": "[AWAY] @ [HOME]",
     "game_title": "[Away Full Name] @ [Home Full Name]",
     "game_time": "[Month Day, Year Time ET]",
     "game_time_iso": "[YYYY-MM-DDTHH:MM:SS-04:00]",
     "url": "[KALSHI_URL]",
     "polymarket_url": "[POLYMARKET_URL]",
     "[AWAY]_win_odds": "[ODDS]¢",
     "[HOME]_win_odds": "[ODDS]¢",
     "explanation": "NFL game prediction market showing the probability of the [Away] covering the spread against the [Home]. Odds reflect market expectations for game outcome based on team performance, injuries, and betting patterns."
   }
   ```

7. **Quality checks:**
   - Verify both URLs are functional and load correctly
   - Confirm odds match live market data
   - Verify game date is in future
   - Check home/away format is correct (AWAY @ HOME)
   - Verify team names in `game_title` match abbreviations in `name`
   - Validate JSON syntax is correct

**See `/docs/financial_fetch.md` for detailed NFL prediction update procedures.**

## Media Management

Media items are stored in `json/media.json` and displayed on `media.html`.

### Add Media Entry

```json
{
  "slug": "my-media-item",
  "title": "Media Title",
  "category": "music|film|book|podcast",
  "date": "2025-12-20",
  "link": "https://example.com",
  "image": "images/filename.webp"
}
```

**Slug format:** lowercase, hyphens, no spaces

**Image guidelines:**
- Use `.webp` format for modern browsers
- Store in `images/` directory
- Naming: `YYYY-MM-author-title.webp`

Posts can link to media items: `<a href="media.html#slug">link text</a>`

## Journal/Feed Management

Journal entries and posts are stored in `json/journal.json` and rendered on `journal.html`.

### Entry Types

**File-based entries** (markdown posts):
```json
{
  "date": "03/28/26",
  "entries": [
    {
      "title": "📉 Post Title",
      "file": "article/posts/2026-03-28-slug.md",
      "collapsed": true
    }
  ]
}
```

**Inline entries** (short text):
```json
{
  "date": "03/25/26",
  "entries": [
    {
      "title": "📱 Short Observation",
      "content": "Brief text or HTML content here."
    }
  ]
}
```

**Multiple entries per date block:**
```json
{
  "date": "03/25/26",
  "entries": [
    { "title": "First item", "content": "..." },
    { "title": "Second item", "file": "article/posts/file.md", "collapsed": true }
  ]
}
```

## Common Workflow: Data Update Post

When publishing a data update (e.g., monthly economic indicators):

1. **Update `financials-data.json`:**
   - Find indicator by name
   - Update `lastUpdated` timestamp
   - Add new month value (use previous data as reference for format)
   - Update root-level `lastUpdated` timestamp

2. **Create post referencing the data:**
   - File: `article/posts/YYYY-MM-DD-indicator-update.md`
   - Include context and analysis
   - Embed chart with `{{chart:Indicator Name}}`
   - Link to `financials.html` if applicable

3. **Add to journal.json:**
   - Use `MM/DD/YY` date format
   - Set `collapsed: true` for longer posts
   - Place at top of array for latest posts

4. **Example:**
   ```markdown
   # Consumer Sentiment Surges in December
   
   <i data-lucide="chart-line"></i>
   
   Latest University of Michigan consumer sentiment data shows strong confidence recovery...
   
   {{chart:Consumer Sentiment}}
   
   The surge reflects...
   ```

## Technical Notes

### Journal Feed Loader (`js/journal-feed.js`)

- Loads entries from `json/journal.json`
- Groups entries by date, sorted newest first
- Fetches and parses markdown files via `marked.js`
- Supports collapsible entries (`collapsed: true`)
- Inline entries render `content` field as HTML
- DOMPurify sanitization for user-facing HTML

### Legacy Posts Loader (`js/posts-loader.js`)

- Not loaded by any page. Do not use for new content.
- Previously loaded 8 posts initially, 10 at a time via "Load More"
- Used `json/posts.json` as data source

### Color Scheme

- Primary: `#2C5F5A` (teal)
- Accent: `#D4822A` (orange)
- Secondary: `#666` (gray)
- Support both light and dark modes via CSS variables

### CSS Classes for Content

- `.announcement-card` - Post card container
- `.card-expanded-content` - Full post content (hidden by default)
- `.card-title` - Post heading
- `.card-snippet` - Preview text
- `.chart-container` - Financial chart wrapper
- `.table-wrapper` - Responsive table wrapper

## File Locations

- **Posts (markdown):** `article/posts/*.md`
- **Journal index (active):** `json/journal.json` - renders on `journal.html`
- **Posts index (legacy):** `json/posts.json` - not wired to any page
- **Financial data:** `json/financials-data.json`
- **Media:** `json/media.json` + `images/`
- **Journal loader:** `js/journal-feed.js` - active script on `journal.html`
- **Chart renderer:** `js/chart-renderer.js` - handles `{{chart:...}}` syntax
- **Posts loader (legacy):** `js/posts-loader.js` - not loaded by any page
- **HTML pages:** `journal.html`, `financials.html`, `media.html`, etc.

## When to Use This Skill

- Creating new posts for Index, Media, Journal pages
- Updating monthly economic indicators
- Adding media posts
- Publishing news feed items
- Maintaining data freshness for the site
