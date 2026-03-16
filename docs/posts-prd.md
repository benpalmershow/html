# Posts Product Requirements Document

## Overview

Posts provide concise, visual updates across the site. Each post is a markdown file with YAML frontmatter in `article/posts/`, registered in `json/posts.json`. Filenames follow `YYYY-MM-DD-slug.md`.

**Core Principles:** Short, informative, visual, and properly linked.

---

## Required Elements (ALL Posts)

1. **YAML Frontmatter** - Date in ISO 8601 with timezone (`Z`) and `category`
2. **Icon** - Lucide icon (can be anywhere in content with `post-icon` or `card-icon` class)
3. **Content** - Use `<p>` tags for paragraphs to enable proper snippet extraction
4. **Navigation Link** - Link to relevant page with proper anchor/filter
5. **Registration** - Entry in `json/posts.json` with correct date and file path; newest entries go first

---

## Formatting Standards

- **Length**: Keep posts under 150 words total
- **Emphasis**: Use `<b>` for bold, **not** emojis
- **Paragraphs**: Use `<p>` tags - do not use only `<br><br>` for paragraphs
- **Links**: Use proper filters/anchors (`financials.html?filter=Category%20Name`, `media.html#slug`)

---

## Post Templates

### Economic/Financial Indicator
```markdown
---
category: financials
---

<i data-lucide='trending-up' class='post-icon'></i> <b>Indicator Name</b>

<p>Key insight about the indicator value and trend.</p>

▸ **Latest**: [value] ([+/-X.X%] MoM)

{{chart:Indicator Name}}

<a href="financials.html?filter=Category"><b>View all indicators</b></a>
```

### Policy/News Update
```markdown
---
category: policy
---

<i data-lucide='users' class='post-icon'></i> <b>Title</b>

<p>Brief description of the news or update.</p>

▸ Point one
▸ Point two

<a href="financials.html"><b>View related</b></a>
```

### Media Content
```markdown
---
category: media
---

<i data-lucide='clapperboard' class='post-icon'></i> <a href="media.html#slug"><img src="image_url" alt="Title" style="width: 60px; height: auto; float: left; margin-right: 10px;"></a> <b>Title</b>

<p>One-sentence description.</p>

<a href="media.html#slug"><b>View in Media</b></a>
```

---

## Charts (Optional)

For posts with data/metrics, use: `{{chart:Indicator Name}}`

- Indicator name must exactly match `name` field in `financials-data.json`
- Charts are optional but recommended for data-driven content

---

## Publishing Checklist

- [ ] YAML frontmatter with ISO date (with `Z`) and category
- [ ] Lucide icon with `post-icon` or `card-icon` class
- [ ] Content uses `<p>` tags for paragraphs
- [ ] Post under 150 words total
- [ ] Navigation link with proper anchor/filter
- [ ] Post registered in json/posts.json (newest first)
- [ ] No emojis (use Lucide icons instead)
- [ ] No em dashes (—) in prose; use hyphens (-) instead

---

## Common Pitfalls

- Missing `Z` timezone in dates
- Chart name typos vs. `financials-data.json`
- Navigation link missing filter or anchor
- Slug mismatch between filename and `file` path
- Using `<br><br>` instead of `<p>` tags (breaks snippet extraction)
