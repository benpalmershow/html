# Codebase Maintainability Report

**Updated:** November 15, 2026

## Current architecture

- Static HTML/CSS/JS site with JSON as the runtime data source. No application build step.
- `journal.html` renders `json/journal.json`; `article.html?slug=<slug>` renders markdown from `article/` using `json/article-index.json`.
- `scripts/build-article-index.js` builds the article manifest, writes markdown frontmatter tags to `json/journal-tags.json`, removes duplicated tags from file-backed journal entries, and writes `json/journal-search.json` for client-side search.
- `scripts/generate-rss.js` builds `news-feed.xml`, `news-sitemap.xml`, and `sitemap.xml` from the same sources.
- `scripts/validate-site.js` is the main guardrail for JSON validity, journal schema, local references, and feed/index consistency.

## Journal data rules

- Date blocks use `MM/DD/YY`, are unique, and are sorted newest-first.
- Categories are limited to `economy`, `policy`, `trade`, `society`, `dispatches`.
- Types are limited to `note`, `essay`, `data`, `curation`, `dispatch`, `verse`.
- Every entry has a `subcategory` and at most 5 `tags`.
- `time` is optional but recommended; use `h:mm AM/PM`.
- For file-backed entries, tags are canonical in markdown frontmatter. `json/journal-tags.json` is the generated runtime map, and `json/journal.json` does not duplicate tags.

## Validation coverage

`npm run validate` currently checks:

- JSON syntax across the repository.
- Journal date format, duplicate date blocks, and newest-first ordering.
- Canonical categories and known types.
- Tag count for inline entries, tag-map consistency, and rejection of duplicated file-backed tags.
- Local file references in HTML/CSS.
- Article index, feed, and sitemap consistency.

## Known follow-ups

- Same-day duplicate titles are reported as warnings because some are intentional pairings (inline note plus longform essay).
- Duplicate titles across dates are reported as warnings; recurring labels such as "Latest Numbers" are expected.
- Journal search uses a generated plain-text index for file-backed entries, loaded lazily on first search.
- Search input is debounced; filtered auto-load is capped as a safety valve.

## Commands

```bash
npm run generate:content   # sync tags, rebuild article index, search index, RSS, sitemaps
npm run validate           # schema and consistency checks
python3 -m http.server 8000
```