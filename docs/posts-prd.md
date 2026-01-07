# Posts Product Requirements Document

## Overview

Posts provide a chronological feed of updates across the site. Each post is a markdown file with YAML frontmatter in `article/posts/`, registered in `json/posts.json`.

---

## Required Elements (ALL Posts)

Every post must have:

1. **YAML Frontmatter** - Date in ISO format
   ```markdown
   ---
   date: 2025-11-22T10:50:00
   ---
   ```

2. **Icon + Title** - Lucide icon and descriptive title
   ```markdown
   ### <i data-lucide='icon-name' class='post-icon'></i> **Title**
   ```

3. **Description** - 1-2 sentences, narrative-driven (not dry analysis)

4. **Data/Sections** - Relevant information with proper formatting

5. **Chart** - If post contains metrics, indicators, or quantitative data (see Charts section)

6. **Navigation Link** - Link to relevant page with proper anchor/filter

7. **Registration** - Entry in `json/posts.json` with correct date and file path
   ```json
   {
     "date": "2025-11-22T10:50:00",
     "file": "article/posts/2025-11-22-consumer-sentiment-final.md"
   }
   ```

---

## Formatting Standards

### Content Rules
- **Descriptions**: 2-3 sentences max. Narrative-driven, not dry analysis. Avoid "Analysis of X" patterns.
- **Emphasis**: Use `<b>` for bold, **not** emojis
- **Line breaks**: `<br><br>` for spacing between sections

### Images (Media Posts)
- **Source**: Use cover URL directly from `media.json` entry for consistency
- **Standard**: `width: 60px; height: auto; float: left; margin-right: 10px;`
- **Music**: `border-radius: 50%; object-fit: cover; height: 60px; animation: spin 3s linear infinite`
- Always include `alt` text matching media title
- Wrap in anchor tags linking to `media.html#slug` for navigation


### Links
- **Media**: `media.html#slug-name`
- **News articles & Analysis**: `news.html?article=slug` (for full articles in `article/` folder)
- **Journal**: `journal.html#entry-slug`
- **Financials with category filter**: `financials.html?filter=Category%20Name` - Activates the category filter when page loads
  - Examples: `financials.html?filter=Prediction%20Markets`, `financials.html?filter=Consumer%20Indicators`, `financials.html?filter=Employment%20Indicators`, `financials.html?filter=Housing%20Market`
- **Financials with anchor**: `financials.html#latest-13f-filings` - Links to specific section (e.g., 13F Holdings)
- **Tickers**: `https://finance.yahoo.com/quote/TICKER` with `target="_blank" rel="noopener"`
- **External**: Always include `target="_blank" rel="noopener"`

Link text for articles should be: `[Read the full analysis](news.html?article=slug)`

**Financials Links Best Practice:**
Always use `?filter=Category%20Name` to activate category filtering on page load, making the relevant indicators immediately visible without user interaction. Replace spaces with `%20`. Common categories: Prediction Markets, Consumer Indicators, Employment Indicators, Business Indicators, Housing Market, Trade & Tariffs, Commodities.

### Multi-Topic Posts
Separate distinct sections with `---` (horizontal rule) and give each its own icon/title. Include charts for each financial/data-driven section:

```markdown
### <i data-lucide='football' class='post-icon'></i> **Topic 1**

Description.

{{chart:Indicator Name 1}}

[View](link1)

---

###  **Topic 2**

Description with data if applicable.

{{chart:Indicator Name 2}}

[View](link2)
```

---

## Financial Data Posts

Include these sections for indicator releases:

### Template
```markdown
###  **Catchy Title**

1-2 sentence narrative opening.

- **Month**: Value (+X.X% MoM)

What the numbers mean in 1-2 sentences. Include broader context.

{{chart:Indicator Name}}

[View all indicators](financials.html?filter=Category)
```

### MoM Percentages
Calculate and display month-over-month changes:
- Formula: `((Current - Previous) / Previous) × 100`
- Format: `Value (+X.X% MoM)` or `Value (-X.X% MoM)`
- Round to one decimal place

### Synopsis
- 1-2 sentences explaining what the data means
- Connect to broader economic theme or market context
- Avoid repeating raw data

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

---

## Charts

### When to Include

**MANDATORY for all updates.** Every post section that references data, metrics, or indicators must include a chart.

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

### Valid Chart Examples
- ✓ 10-Year Treasury Yield (9 months)
- ✓ Consumer Sentiment (6+ months showing decline)
- ✓ Manufacturing PMI (6+ months)
- ✓ Private Employment
- ✓ Job Openings
- ✓ Services PMI
---

## Examples

### Financial Indicator
```markdown
### <i data-lucide='shopping-cart' class='post-icon'></i> **Consumer Sentiment: Final November Data**

Consumer Sentiment final reading for November released at 51, slightly higher than the preliminary 50.3 reported 14 days ago.

**Preliminary (Nov 7):** 50.3  
**Final (Nov 22):** 51  
**Revision:** +0.7 points

Despite the modest upward revision, the index remains weak, down from 53.6 in October, signaling persistent consumer pessimism amid economic uncertainty.

{{chart:Consumer Sentiment}}

[View all consumer indicators](financials.html?filter=Consumer%20Indicators)
```

### Media (Film)
```markdown
### **Holy Spider**

<a href="media.html#holy-spider"><img src="https://..." alt="Holy Spider" style="width: 60px; height: auto; float: left; margin-right: 10px;"></a>

A female journalist investigates a serial killer in Iran. Based on true events, this crime thriller exposes vigilante justice dangers in a theocratic society.

[View in Media](media.html#holy-spider)
```

### Music
```markdown
###  **A Father's Song by Allen Stone**

<a href="media.html#a-fathers-song"><img src="https://..." alt="A Father's Song" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; float: left; margin-right: 10px; animation: spin 3s linear infinite;"></a>

A touching ballad about fatherhood and family bonds.

[Listen Now](media.html#a-fathers-song)
```

### Multi-Topic (Sports + Housing)
```markdown
### **Bills @ Texans Thursday Night**

Bills favored at 72¢ over Texans at 28¢. Game time: Nov 20, 8:15 PM ET.

---

### **Existing Home Sales Flat**

Existing home sales held steady at 4.10M in October (+0.0% MoM). Market continues sideways movement with modest inventory levels.

[View housing indicators](financials.html?filter=Housing%20Market)
```

---

## Checklist Before Publishing

### Required Elements
- [ ] YAML frontmatter with ISO date
- [ ] Lucide icon with `post-icon` class
- [ ] Clear, specific title
- [ ] Description: 1-2 sentences, narrative-driven (not "Analysis of X")
- [ ] Relevant data/sections with proper formatting
- [ ] Chart with template syntax `{{chart:Name}}` (if data-driven)
- [ ] Navigation link with proper anchor/filter
- [ ] Post registered in json/posts.json

### Content Quality
- [ ] No emojis (use Lucide icons instead)
- [ ] All links tested and working (no 404s, redirects, or inaccessible URLs)
- [ ] HTML is valid and properly formatted
- [ ] Tested on mobile
- [ ] No em dashes (—) in prose; use hyphens (-) instead
- [ ] Avoid "It's not X, it's Y" inversion pattern

### Type-Specific Requirements

**Financial/Economic Posts:**
- [ ] Chart indicator name exactly matches `name` field in financials-data.json
- [ ] MoM % calculations included
- [ ] Synopsis explains what numbers mean

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

---

## Common Patterns to Follow

✓ **DO:**
- Write engaging, story-driven descriptions
- Link to specific positions on pages (#anchors, ?article=, ?filter=)
- Include cover images for all media
- Use template syntax for charts: `{{chart:Name}}`
- Keep professional, direct tone
- Consolidate related updates in single posts with distinct sections
- For 13F updates: include firm counts, AUM totals, filing dates, and technical improvements

❌ **DON'T:**
- Use dry, academic descriptions
- Link to generic pages without anchors
- Omit cover images for media content
- Mix multiple topics without visual separation
- Use informal language or excessive exclamation points
- Use manual canvas HTML for charts (template syntax only)

---

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for historical updates and improvements.
