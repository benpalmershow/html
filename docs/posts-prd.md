# Posts Product Requirements Document

## Overview

Posts provide <b>concise, chart-driven updates</b> across the site. Each post is a markdown file with YAML frontmatter in `article/posts/`, registered in `json/posts.json`. Filenames follow `YYYY-MM-DD-slug.md`; ensure the slug in the filename matches the `file` path entry.

<b>Core Principles:</b> Short, informative, visual, and properly linked.

---

## Required Elements (ALL Posts)

Every post must be <b>concise and chart-driven</b> with:

1. **YAML Frontmatter** - Date in ISO 8601 with timezone (`Z`) to control ordering, even within the same day
   ```markdown
   ---
   date: 2025-11-22T10:50:00Z
   ---
   ```

2. **Icon + Title** - Lucide icon in first heading with `post-icon` class and descriptive title
   ```markdown
   ### <i data-lucide='icon-name' class='post-icon'></i> **Title**
   ```

3. **Description** - <b>1-2 sentences maximum</b>, narrative-driven (not dry analysis)

4. **Data/Sections** - <b>Essential information only</b>, minimal formatting

5. **Chart** - <b>MANDATORY</b> for all posts with any data/metrics (see Charts section)

6. **Navigation Link** - <b>REQUIRED</b> link to relevant page with proper anchor/filter

7. **Registration** - Entry in `json/posts.json` with correct date (ISO 8601 + `Z`) and file path; newest entries go first in the array
   ```json
   {
     "date": "2025-11-22T10:50:00Z",
     "file": "article/posts/2025-11-22-consumer-sentiment-final.md"
   }
   ```

---

## Formatting Standards

### Content Rules
- **Descriptions**: <b>1-2 sentences maximum</b>. Narrative-driven, not dry analysis. Avoid "Analysis of X" patterns.
- **Length**: <b>Keep posts under 150 words total</b> when possible. Focus on essential information only.
- **Emphasis**: Use `<b>` for bold, **not** emojis
- **Line breaks**: `<br><br>` for spacing between sections
- **Snippet**: First paragraph becomes the card snippet (aim ≤120 chars, no links). First image becomes the card preview.
- **Icons**: Use a Lucide icon in the first heading with `post-icon`. Quick defaults: `book-open` (analysis), `music` (music), `clapperboard` (film), `chart-line` (markets), `fuel` (energy/oil), `gavel` (legal), `trophy` (sports).

### Images (Media Posts)
- **Source**: Use cover URL directly from `media.json` entry for consistency
- **Standard**: `width: 60px; height: auto; float: left; margin-right: 10px;`
- **Music**: `border-radius: 50%; object-fit: cover; height: 60px; animation: spin 3s linear infinite`
- Always include `alt` text matching media title; no decorative-only images
- Wrap in anchor tags linking to `media.html#slug` for navigation


### Links
- **Media**: `media.html#slug-name`
- **News articles & Analysis**: `news.html?article=slug` (for full articles in `article/` folder)
- **Journal**: `journal.html#entry-slug`
- **Financials with category filter**: `financials.html?filter=Category%20Name` - <b>ALWAYS use filters for immediate visibility</b>
  - Examples: `financials.html?filter=Prediction%20Markets`, `financials.html?filter=Consumer%20Indicators`, `financials.html?filter=Employment%20Indicators`, `financials.html?filter=Housing%20Market`
- **Financials with anchor**: `financials.html#latest-13f-filings` - Links to specific section (e.g., 13F Holdings)
- **Tickers**: `https://finance.yahoo.com/quote/TICKER` with `target="_blank" rel="noopener"`
- **External**: Always include `target="_blank" rel="noopener"`
- Link text must be descriptive (avoid "here" or bare URLs)

<b>Navigation Links Best Practice:</b>
Every post MUST end with a navigation link that takes users directly to the relevant content. Use anchors and filters to ensure users see the specific information immediately without extra clicks.

Link text for articles should be: `[Read the full analysis](news.html?article=slug)`

**Financials Links Best Practice:**
Always use `?filter=Category%20Name` to activate category filtering on page load, making the relevant indicators immediately visible without user interaction. Replace spaces with `%20`. Common categories: Prediction Markets, Consumer Indicators, Employment Indicators, Business Indicators, Housing Market, Trade & Tariffs, Commodities.

### Multi-Topic Posts
<b>Keep multi-topic posts minimal</b>. Separate distinct sections with `---` and give each its own icon/title. <b>Each section MUST have a chart</b> for financial/data-driven content:

```markdown
### <i data-lucide='trophy' class='post-icon'></i> **Topic 1**

1-2 sentence description.

{{chart:Indicator Name 1}}

[View](link1)

---

### <i data-lucide='chart-line' class='post-icon'></i> **Topic 2**

1-2 sentence description with data.

{{chart:Indicator Name 2}}

[View](link2)
```

---

## Financial Data Posts

Include these sections for indicator releases:

### Template
```markdown
### <i data-lucide='chart-line' class='post-icon'></i> **Catchy Title**

1-2 sentence narrative opening.

- **Month**: Value (+X.X% MoM)

1-2 sentence context.

{{chart:Indicator Name}}

[View all indicators](financials.html?filter=Category)
```

### MoM Percentages
Calculate and display month-over-month changes:
- Formula: `((Current - Previous) / Previous) × 100`
- Format: `Value (+X.X% MoM)` or `Value (-X.X% MoM)`
- Round to one decimal place and verify with a calculator before publishing

### Synopsis
- <b>1-2 sentences maximum</b> explaining what the data means
- Connect to broader economic theme or market context
- Avoid repeating raw data
- Focus on implications, not description

### Legal and Constitutional Topics

For posts covering legal disputes, constitutional questions, or court cases:

```markdown
### <i data-lucide='gavel' class='post-icon'></i> **Case Title: Core Question**

1-2 sentence narrative describing the case and core constitutional issue.

**The Legal Framework:**

Relevant constitutional text and legal principles. Cite specific amendments or statutes. Explain the legal doctrine at stake (e.g., unconstitutional conditions doctrine, takings clause).

**The Facts:**

What the case is about. Who is suing whom. What specific ordinance or policy is challenged.

**Why It Matters:**

Implications for precedent, policy nationwide, property rights, or government power.

**Resources:**

- [Case complaint/filing](link) - Primary source
- [Relevant statute or ordinance](link) - Text of challenged law
- [Foundational case law](reference) - Cite by case name and citation if link unavailable
```

**Guidelines for Legal Posts:**
- Always link to primary sources (complaints, ordinances, court filings)
- Include constitutional text or statute citations with exact wording
- Test all links to court documents and official sources before publishing
- If Supreme Court opinion links are unavailable, cite by case name, citation number, and year rather than including broken links
- Explain legal doctrines (nexus, proportionality, takings clause) in plain language

### 13F Filings Updates
For posts announcing new 13F filing data:

```markdown
### 13F Holdings Updates

**Latest 13F Filings Now Available:**

- **New Firms Added**: [List new firms]
- **Total Firms**: [Total count] investment management firms now tracked
- **Latest Filing Date**: [Most recent date]
- **Total Holdings**: [Total positions] across all firms

**Key Features:**
- Dynamic sorting by filing date (newest on top)
- Interactive charts showing portfolio composition
- ETF/Stock filtering capabilities
- Detailed holdings breakdown for each firm

**Data Highlights:**
- [Firm Name]: $[AUM] AUM, [holdings_count] holdings
- [Firm Name]: $[AUM] AUM, [holdings_count] holdings

**Technical Improvements:**
- [Brief description of technical changes]
- [Performance enhancements]
- [UI/UX improvements]

[View all 13F holdings](financials.html#latest-13f-filings)
```

---

## Ultra-Concise Post Templates

### Minimal Data Post (Under 100 words)
```markdown
### <i data-lucide='chart-line' class='post-icon'></i> **Indicator: Month Result**

[Indicator] rose to [value] in [month], up [X.X%] from [previous month]. Key trend continues.

**Month**: [value] ([+/-X.X% MoM])

{{chart:Indicator Name}}

[View all indicators](financials.html?filter=Category)
```

### Minimal Media Post (Under 50 words)
```markdown
### <i data-lucide='clapperboard' class='post-icon'></i> **Title**

<a href="media.html#slug"><img src="image_url" alt="Title" style="width: 60px; height: auto; float: left; margin-right: 10px;"></a>

One-sentence description.

[View in Media](media.html#slug)
```

### Two-Topic Post (Each under 60 words)
```markdown
### <i data-lucide='trophy' class='post-icon'></i> **Topic 1**

1-2 sentence summary with key data point.

{{chart:Indicator 1}}

[View](link1)

---

### <i data-lucide='chart-line' class='post-icon'></i> **Topic 2**

1-2 sentence summary with key data point.

{{chart:Indicator 2}}

[View](link2)
```

---

## Charts

### <b>MANDATORY CHART POLICY</b>

<b>ALL posts with ANY data, metrics, or indicators MUST include charts.</b> No exceptions.

Examples:
- Employment data (ADP, JOLTS, unemployment, etc.)
- Economic indicators (PMI, sentiment, housing, commodities)
- Market data (Treasury yields, inflation, GDP, etc.)
- Budget/fiscal data (tax revenue, deficit, debt levels)
- Any quantitative metric or indicator

Do not publish posts without charts for data-driven content.

### Implementation
Use template syntax only:
```markdown
{{chart:Indicator Name}}
```

**Requirements:**
- Indicator name must exactly match `name` field in `financials-data.json`
- Post must have YAML frontmatter with `date` field
- Place chart after data section and synopsis
- Place chart before final navigation link
- One chart per section in multi-topic posts

**Common chart pitfalls:** name mismatch with `financials-data.json`, missing chart in multi-topic sections, or chart placed after navigation link.

### Valid Chart Examples
- ✓ 10-Year Treasury Yield (9 months)
- ✓ Consumer Sentiment (6+ months showing decline)
- ✓ Manufacturing PMI (6+ months)
- ✓ Private Employment
- ✓ Job Openings
- ✓ Services PMI
---

## Examples

### Financial Indicator (Concise Example)
```markdown
### <i data-lucide='shopping-cart' class='post-icon'></i> **Consumer Sentiment: Final November Data**

Consumer sentiment final reading for November rose to 51, up from preliminary 50.3 but still below October's 53.6.

**Preliminary (Nov 7):** 50.3  
**Final (Nov 22):** 51  
**Revision:** +0.7 points

{{chart:Consumer Sentiment}}

[View all consumer indicators](financials.html?filter=Consumer%20Indicators)
```

### Media (Film - Ultra-Concise)
```markdown
### <i data-lucide='clapperboard' class='post-icon'></i> **Holy Spider**

<a href="media.html#holy-spider"><img src="https://..." alt="Holy Spider" style="width: 60px; height: auto; float: left; margin-right: 10px;"></a>

Female journalist investigates serial killer in Iran. Based on true events.

[View in Media](media.html#holy-spider)
```

### Music (Ultra-Concise)
```markdown
### <i data-lucide='music' class='post-icon'></i> **A Father's Song by Allen Stone**

<a href="media.html#a-fathers-song"><img src="https://..." alt="A Father's Song" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; float: left; margin-right: 10px; animation: spin 3s linear infinite;"></a>

Touching ballad about fatherhood and family bonds.

[Listen Now](media.html#a-fathers-song)
```

### Multi-Topic (Sports + Housing - Concise)
```markdown
### <i data-lucide='trophy' class='post-icon'></i> **Bills @ Texans Thursday Night**

Bills favored at 72¢ over Texans at 28¢. Game time: Nov 20, 8:15 PM ET.

---

### <i data-lucide='home' class='post-icon'></i> **Existing Home Sales Flat**

Existing home sales held steady at 4.10M in October (+0.0% MoM). Market continues sideways.

{{chart:Existing Home Sales}}

[View housing indicators](financials.html?filter=Housing%20Market)
```

---

## Checklist Before Publishing

### Required Elements
- [ ] YAML frontmatter with ISO date
- [ ] Lucide icon with `post-icon` class
- [ ] Clear, specific title
- [ ] Description: <b>1-2 sentences maximum</b>, narrative-driven (not "Analysis of X")
- [ ] <b>Post under 150 words total</b> when possible
- [ ] Chart with template syntax `{{chart:Name}}` (if data-driven)
- [ ] <b>MANDATORY navigation link</b> with proper anchor/filter
- [ ] Post registered in json/posts.json
- [ ] Filename matches slug and `file` entry; entry placed at top of `posts.json` array (newest first)
- [ ] First paragraph usable as snippet (≤120 chars, no links); first image intentional for preview

### Content Quality
- [ ] No emojis (use Lucide icons instead)
- [ ] All links tested and working (no 404s, redirects, or inaccessible URLs)
- [ ] HTML is valid and properly formatted
- [ ] Tested on mobile
- [ ] No em dashes (—) in prose; use hyphens (-) instead
- [ ] Avoid "It's not X, it's Y" inversion pattern
- [ ] Alt text present and descriptive for every image; link text descriptive (no “here”)
- [ ] Chart indicator names exactly match `financials-data.json`

### Type-Specific Requirements

**Financial/Economic Posts:**
- [ ] Chart indicator name exactly matches `name` field in financials-data.json
- [ ] MoM % calculations included
- [ ] Synopsis explains what numbers mean
- [ ] MoM math double-checked with calculator; rounded to one decimal place

**Media Posts:**
- [ ] Cover images included with correct styling
- [ ] Images float left with `margin-right: 10px`
- [ ] Images wrapped in anchor tags to media.html#slug

**Legal Posts:**
- [ ] Resources section with primary sources (complaints, ordinances)
- [ ] Constitutional text or statute citations with exact wording
- [ ] Legal doctrines (nexus, proportionality) explained in plain language
- [ ] Primary source links verified before publishing

**13F Posts:**
- [ ] Firm counts and AUM totals included
- [ ] Filing dates included
- [ ] Technical improvements described

### Common Pitfalls
- Missing `Z` timezone in dates (frontmatter or posts.json)
- Slug mismatch between filename and `file` path
- Chart name typos vs. `financials-data.json`
- Snippet too long or includes links
- Navigation link missing filter or anchor

---

## Common Patterns to Follow

✓ **DO:**
- Write <b>ultra-concise, story-driven descriptions</b> (1-2 sentences max)
- <b>Always include charts</b> for data-driven content
- Link to <b>specific positions</b> on pages (#anchors, ?article=, ?filter=)
- Include cover images for all media
- Use template syntax for charts: `{{chart:Name}}`
- Keep professional, direct tone
- <b>Keep posts under 150 words</b> when possible
- For 13F updates: include firm counts, AUM totals, filing dates, and technical improvements

❌ **DON'T:**
- Write long, verbose descriptions
- Use dry, academic language
- Link to generic pages without anchors
- <b>Omit charts for data-driven content</b>
- Omit cover images for media content
- Mix multiple topics without visual separation
- Use informal language or excessive exclamation points
- Use manual canvas HTML for charts (template syntax only)
- <b>Exceed 150 words per post</b>

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for historical updates and improvements.
