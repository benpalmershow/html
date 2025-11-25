# Posts Product Requirements Document

## Overview

Posts provide a chronological feed of updates across the site. Each post is a markdown file with YAML frontmatter in `article/posts/`, registered in `json/posts.json`.

**Structure:**
```json
{
  "date": "2025-11-22T10:50:00",
  "file": "article/posts/2025-11-22-consumer-sentiment-final.md"
}
```

---

## Post Format

### Frontmatter
```markdown
---
date: 2025-11-22T10:50:00
---
```

### Content Structure
```markdown
### <i data-lucide='icon-name' class='post-icon'></i> **Bold Title**

1-2 sentence description capturing the story/narrative.

[Optional sections with data/links]

[View details](link)
```

---

## Icons by Category

Always include a relevant Lucide icon at start with `class='post-icon'`:

- **Business Indicators**: `bar-chart-3`, `trending-up`, `trending-down`
- **Consumer Indicators**: `shopping-cart`, `users`, `wallet`
- **Housing Market**: `home`, `building`
- **Trade & Tariffs**: `ship`, `package`
- **Employment**: `users`, `briefcase`
- **News**: `newspaper`
- **Media**: `film` (movies), `book` (books), `music` (music)
- **Sports**: `football`, `trophy`
- **Technology**: `cpu`, `zap`
- **Legal**: `gavel`
- **Prediction Markets**: `bar-chart-3`, `trending-up`

---

## Formatting Standards

### Content Rules
- **Descriptions**: 2-3 sentences max. Narrative-driven, not dry analysis. Avoid "Analysis of X" patterns.
- **Emphasis**: Use `<b>` for bold, **not** emojis
- **Line breaks**: `<br><br>` for spacing between sections
- **Bullet points**: Use `•` for lists

### Images (Media Posts)
- **Source**: Use cover URL directly from `media.json` entry for consistency
- **Standard**: `width: 60px; height: auto; float: left; margin-right: 10px;`
- **Music**: `border-radius: 50%; object-fit: cover; height: 60px; animation: spin 3s linear infinite`
- Always include `alt` text matching media title
- Wrap in anchor tags linking to `media.html#slug` for navigation


### Links
- **Media**: `media.html#slug-name`
- **News articles**: `news.html?article=slug`
- **Journal**: `journal.html#entry-slug`
- **Filters**: `financials.html?filter=Category%20Name`
- **Tickers**: `https://finance.yahoo.com/quote/TICKER` with `target="_blank" rel="noopener"`
- **External**: Always include `target="_blank" rel="noopener"`

### Multi-Topic Posts
Separate distinct sections with `---` (horizontal rule) and give each its own icon/title:

```markdown
### <i data-lucide='football' class='post-icon'></i> **Topic 1**

Description.

[View](link1)

---

### <i data-lucide='home' class='post-icon'></i> **Topic 2**

Description with data if applicable.

[View](link2)
```

---

## Financial Data Posts

Include these sections for indicator releases:

### Template
```markdown
### <i data-lucide='icon' class='post-icon'></i> **Catchy Title**

1-2 sentence narrative opening.

**Latest Data:**
• **Metric 1**: October Value (+X.X% MoM)
• **Metric 2**: September Value (-X.X% MoM)

**Synopsis**: What the numbers mean in 1-2 sentences. Include broader context.

**Latest Revisions**: Any adjustments to prior months, or "All figures stable."

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

### Latest Revisions
- Document any adjustments to prior-month figures
- Specify month and direction (up/down) with magnitude
- If none: "All figures stable"

---

## Charts

### When to Include
Include charts for single-indicator posts with 6+ months of historical data showing meaningful trends.

### Implementation
Use template syntax only:
```markdown
{{chart:Indicator Name}}
```

**Requirements:**
- Indicator name must exactly match `name` field in `financials-data.json`
- Post must have YAML frontmatter with `date` field
- Place chart after Synopsis and Latest Revisions
- Place chart before final navigation link

### Valid Chart Examples
- ✓ 10-Year Treasury Yield (9 months)
- ✓ Consumer Sentiment (6+ months showing decline)
- ✓ Manufacturing PMI (6+ months)
- ✗ Housing Update (multiple unrelated metrics)
- ✗ Prediction Markets (real-time, changes daily)

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
### <i data-lucide='film' class='post-icon'></i> **Holy Spider**

<a href="media.html#holy-spider"><img src="https://..." alt="Holy Spider" style="width: 60px; height: auto; float: left; margin-right: 10px;"></a>

A female journalist investigates a serial killer in Iran. Based on true events, this crime thriller exposes vigilante justice dangers in a theocratic society.

[View in Media](media.html#holy-spider)
```

### Music
```markdown
### <i data-lucide='music' class='post-icon'></i> **A Father's Song by Allen Stone**

<a href="media.html#a-fathers-song"><img src="https://..." alt="A Father's Song" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; float: left; margin-right: 10px; animation: spin 3s linear infinite;"></a>

A touching ballad about fatherhood and family bonds.

[Listen Now](media.html#a-fathers-song)
```

### Multi-Topic (Sports + Housing)
```markdown
### <i data-lucide='football' class='post-icon'></i> **Bills @ Texans Thursday Night**

Bills favored at 72¢ over Texans at 28¢. Game time: Nov 20, 8:15 PM ET.

---

### <i data-lucide='home' class='post-icon'></i> **Existing Home Sales Flat**

Existing home sales held steady at 4.10M in October (+0.0% MoM). Market continues sideways movement with modest inventory levels.

[View housing indicators](financials.html?filter=Housing%20Market)
```

---

## Checklist Before Publishing

- [ ] Icon matches content category
- [ ] Title is clear and specific
- [ ] Description is 2-3 sentences, narrative-driven
- [ ] All links work and point to correct locations
- [ ] Media posts include cover images with proper styling
- [ ] Financial posts include MoM % calculations
- [ ] Charts use template syntax `{{chart:Name}}`
- [ ] Chart indicator name exactly matches financials-data.json
- [ ] No emojis (use Lucide icons instead)
- [ ] Post registered in json/posts.json with correct date/file
- [ ] HTML is valid and properly formatted
- [ ] Tested on mobile

---

## Common Patterns to Follow

✓ **DO:**
- Write engaging, story-driven descriptions
- Link to specific positions on pages (#anchors, ?article=, ?filter=)
- Include cover images for all media
- Use template syntax for charts: `{{chart:Name}}`
- Keep professional, direct tone
- Consolidate related updates in single posts with distinct sections

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
