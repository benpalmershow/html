# Validation Report — Finding 9: Regenerate RSS Feed

## Summary

RSS feed was stale (lastBuildDate: Sat, 30 May 2026). Feed regenerated with current timestamp.

**Root cause discovered:** `json/articles.json` did not exist. The `generate-rss.js` script requires it as an index of essay articles from `article/*.md`. Created `scripts/build-articles-json.js` to generate this file from markdown frontmatter, then ran `npm run generate:rss`.

---

## Commands Run

### 1. Build articles.json (prerequisite)
```
node scripts/build-articles-json.js
```
Output:
- Skipping (missing title or date): cache-energy.md
- Skipping (missing title or date): fy2026-appropriations.md
- Skipping (missing title or date): madison-purse-power.md
- Skipping (missing title or date): no-kings-religion.md
- Skipping (missing title or date): san-francisco-upf-complaint.md
- Skipping (missing title or date): snap-noncitizens-massachusetts.md
- Written 48 articles to json/articles.json

### 2. npm run generate:rss
```
✅ RSS feed generated: news-feed.xml
✅ News sitemap generated: news-sitemap.xml
📰 Essays (articles.json): 48
📝 Journal markdown entries: 303
📊 Combined RSS items: 351
```

### 3. npm run validate
```
[3:31:12 PM] Site validation passed.
```

Warnings (pre-existing, not errors — journal entries with no file/content/link):
- json/journal.json 09/19/26 entry 3 has no file, content, or link
- json/journal.json 09/19/26 entry 4 has no file, content, or link
- json/journal.json 07/25/26 entry 0 has no file, content, or link
- json/journal.json 06/10/26 entry 0 has no file, content, or link
- json/journal.json 04/24/26 entry 2 has no file, content, or link
- json/journal.json 04/22/26 entry 0 has no file, content, or link
- json/journal.json 04/11/26 entry 0 has no file, content, or link
- json/journal.json 04/11/26 entry 4 has no file, content, or link
- json/journal.json 04/11/26 entry 5 has no file, content, or link
- json/journal.json 04/10/26 entry 2 has no file, content, or link
- json/journal.json 04/10/26 entry 3 has no file, content, or link
- json/journal.json 04/07/26 entry 2 has no file, content, or link
- json/journal.json 04/07/26 entry 3 has no file, content, or link
- json/journal.json 04/07/26 entry 6 has no file, content, or link
- json/journal.json 04/05/26 entry 2 has no file, content, or link
- json/journal.json 04/02/26 entry 2 has no file, content, or link
- json/journal.json 04/02/26 entry 3 has no file, content, or link
- json/journal.json 03/31/26 entry 1 has no file, content, or link
- json/journal.json 03/26/26 entry 0 has no file, content, or link
- json/journal.json 03/23/26 entry 7 has no file, content, or link
- json/journal.json 03/23/26 entry 8 has no file, content, or link
- json/journal.json 03/23/26 entry 9 has no file, content, or link
- json/journal.json 03/21/26 entry 4 has no file, content, or link
- json/journal.json 03/21/26 entry 5 has no file, content, or link
- json/journal.json 03/21/26 entry 12 has no file, content, or link
- json/journal.json 03/21/26 entry 14 has no file, content, or link
- json/journal.json 03/21/26 entry 16 has no file, content, or link

### 4. Focused JSON checks
```
financials-data.json OK
journal.json OK
```

---

## Result

**PASS** — Validation passed. RSS feed and news sitemap regenerated. Both JSON files are valid. The 27 journal warnings are pre-existing and do not block validation.

## Files Changed
- `news-feed.xml` — regenerated (updated lastBuildDate + full item set)
- `news-sitemap.xml` — regenerated
- `json/articles.json` — created (48 essay entries indexed from article/*.md)
- `scripts/build-articles-json.js` — created (helper to rebuild articles.json)
