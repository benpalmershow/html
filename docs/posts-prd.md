# Posts Product Requirements Document

## Overview

Posts provide <b>concise, chart-driven updates</b> across the site. Each post is a markdown file with YAML frontmatter in `article/posts/`, registered in `json/posts.json`. Filenames follow `YYYY-MM-DD-slug.md`.

<b>Core Principles:</b> Short, informative, visual, and properly linked.

---

## Required Elements (ALL Posts)

1. **YAML Frontmatter** - Date in ISO 8601 with timezone (`Z`)
2. **Icon + Title** - Lucide icon in first heading with `post-icon` class
3. **Description** - <b>1-2 sentences maximum</b>, narrative-driven
4. **Chart** - <b>MANDATORY</b> for all posts with data/metrics using `{{chart:Indicator Name}}`
5. **Navigation Link** - <b>REQUIRED</b> link to relevant page with proper anchor/filter
6. **Registration** - Entry in `json/posts.json` with correct date and file path; newest entries go first

---

## Formatting Standards

- **Length**: <b>Keep posts under 150 words total</b>
- **Emphasis**: Use `<b>` for bold, **not** emojis
- **Links**: Use proper filters/anchors (`financials.html?filter=Category%20Name`, `media.html#slug`)

---

## Post Templates

### Latest Updates Summary
```markdown
### <i data-lucide='activity' class='post-icon'></i> **Latest Economic Indicators Update**

Key economic indicators show [brief summary of overall trend].

{{chart:Most Recent Indicator 1}}

[Indicator 1] [key insight/trend].

{{chart:Most Recent Indicator 2}}

[Indicator 2] [key insight/trend].

[View all latest indicators](financials.html?filter=Latest%20Updates)
```

### Financial Indicator Release
```markdown
### <i data-lucide='chart-line' class='post-icon'></i> **Indicator: Month Result**

[Indicator] rose to [value] in [month], up [X.X%] from [previous month].

**Month**: [value] ([+/-X.X% MoM)

{{chart:Indicator Name}}

[View all indicators](financials.html?filter=Category)
```

### Media Content
```markdown
### <i data-lucide='clapperboard' class='post-icon'></i> **Title**

<a href="media.html#slug"><img src="image_url" alt="Title" style="width: 60px; height: auto; float: left; margin-right: 10px;"></a>

One-sentence description.

[View in Media](media.html#slug)
```

---

## Charts

<b>ALL posts with ANY data, metrics, or indicators MUST include charts.</b> No exceptions.

Use template syntax: `{{chart:Indicator Name}}`

**Requirements:**
- Indicator name must exactly match `name` field in `financials-data.json`
- Place chart after data section and before navigation link

---

## Publishing Checklist

- [ ] YAML frontmatter with ISO date
- [ ] Lucide icon with `post-icon` class
- [ ] Description: <b>1-2 sentences maximum</b>
- [ ] <b>Post under 150 words total</b>
- [ ] Chart with template syntax `{{chart:Name}}` (if data-driven)
- [ ] <b>MANDATORY navigation link</b> with proper anchor/filter
- [ ] Post registered in json/posts.json (newest first)
- [ ] No emojis (use Lucide icons instead)
- [ ] Chart indicator names exactly match `financials-data.json`
- [ ] No em dashes (—) in prose; use hyphens (-) instead

---

## Common Pitfalls

- Missing `Z` timezone in dates
- Chart name typos vs. `financials-data.json`
- Navigation link missing filter or anchor
- Posts without charts for data-driven content
- Slug mismatch between filename and `file` path
