# Site Investigation Report — Howdy, Stranger
**Date:** 2026-10-12  
**Scope:** Full site audit — performance, UX/accessibility, code quality, maintainability, SEO, security, content freshness  
**Validation result:** `npm run validate` passes (27 warnings about empty journal entries — see §5)

---

## Executive Summary

The site is well-structured and has thoughtful performance touches (skeleton loaders, deferred non-critical scripts, IndexedDB caching, IntersectionObserver lazy rendering). The most impactful problems are: a **JavaScript syntax error** in `financials.html` (stray `w` breaks the inline non-critical loader), **no security headers** in `vercel.json`, **inconsistent meta/favicon coverage** across pages, and a growing corpus of **27 empty journal entries** that produce 404 noise. Several architectural duplications (header/nav copy-pasted into every HTML file, duplicate dark-mode init code in `media.html`, stale AGENTS.md references) add maintenance burden. None of the problems are catastrophic but several are immediately fixable.

---

## 1. Critical Bugs

### 1.1 JavaScript Syntax Error in `financials.html`
**File:** `financials.html`, line ~258  
**Impact:** High — silently breaks the non-critical script loader  
**Finding:** The idle-callback IIFE that loads `world-cup.js`, `countdown.js`, `back-to-top.js`, and Vercel Insights has a stray character `w` immediately after the closing brace of `loadNonCriticalScripts`:

```js
      };w      // ← stray 'w' — invalid JavaScript
      
      if ('requestIdleCallback' in window) {
```

All four non-critical scripts fail to load in any browser that parses the inline script strictly. The `};w` is a statement-level expression that will throw a `ReferenceError` (or silently fail in some engines) before the `requestIdleCallback` branch is reached, so `world-cup.js`, `countdown.js`, `back-to-top.js`, and Vercel Insights never load in production.

**Fix:** Delete the `w` character.

---

## 2. Security

### 2.1 Missing Security Headers
**File:** `vercel.json`  
**Impact:** High  
**Finding:** `vercel.json` defines caching headers for images, CSS, JS, and HTML but has **no security headers at all**. The following standard headers are absent:

- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing
- `X-Frame-Options: SAMEORIGIN` — blocks clickjacking
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer leakage
- `Permissions-Policy` — disables unneeded browser APIs
- `Content-Security-Policy` — not strictly required here (static site), but even a loose policy (`default-src 'self' https:`) would reduce XSS surface

**Fix:** Add a `/:path*` header block in `vercel.json` with these four headers at minimum.

### 2.2 Overly Broad Cache-Control Conflict
**File:** `vercel.json`  
**Impact:** Medium  
**Finding:** The final headers rule `/:path*` sets `Cache-Control: no-cache, no-store, must-revalidate` which conflicts with the more specific rules above it (images get `immutable`). In Vercel's header-matching the more specific rules take precedence, so the conflict is mostly harmless today — but the catch-all will override any new path that doesn't match the explicit patterns, making the intent ambiguous. The `Pragma: no-cache` and `Expires: 0` headers on HTML files are HTTP/1.0-era artifacts that serve no purpose on a modern CDN and should be removed.

---

## 3. Performance

### 3.1 CSS Loading Pattern Inconsistency
**Files:** `index.html`, `journal.html`, `one-pager.html`, `media.html`, `financials.html`  
**Impact:** Medium  

- `index.html` uses `<link rel="preload" as="style" onload="this.rel='stylesheet'">` for **all** CSS including `theme.css` and `body.css`, which means those sheets are asynchronous. On a first paint, the user will briefly see unstyled content before the sheets load and apply.
- `financials.html` loads `theme.css`, `body.css`, and `nav.css` as **synchronous** `<link rel="stylesheet">` (correct for above-the-fold critical CSS) but then switches to preload/deferred for secondary sheets.
- `media.html` loads all CSS synchronously including heavy component sheets.
- `one-pager.html` loads everything synchronously with **no** version-bust query params on any stylesheet.

The pattern is inconsistent across pages. Critical CSS (theme, body, nav) should be synchronous `<link>` on all pages; secondary CSS (tables, alerts, footer, worldcup) should be preloaded/deferred.

### 3.2 `one-pager.html` — No Cache-Busting on Scripts or Styles
**File:** `one-pager.html`  
**Impact:** Medium  
**Finding:** All five `<script src>` tags and all CSS `<link>` tags in `one-pager.html` lack `?v=` version parameters. Every other page uses `?v=20260816` or similar. Vercel serves JS/CSS with `no-cache, max-age=0`, but the absence of a version param means browser-side disk cache can return stale files after deployments, because the URL never changes.

**Fix:** Add consistent `?v=` parameters matching the rest of the site.

### 3.3 `journal.json` Is 382 KB Uncompressed
**Impact:** Medium  
**Finding:** `json/journal.json` is 382 KB and grows with every post. The journal page fetches it in full on every load, then renders only the first 30 days. Vercel gzip/brotli compression will reduce this significantly, but with 277 days and 790 entries, parse time and memory allocation will become a noticeable cost on mobile.

**Recommendation:** Either paginate the JSON (separate files per month/quarter) or implement a lightweight summary index (title + date + id only) for the initial load, fetching full content on demand. The current "load more" mechanism already implies this pattern.

### 3.4 Duplicate Dark Mode Init in `media.html`
**File:** `media.html`  
**Impact:** Low  
**Finding:** `media.html` contains **two** inline theme-init scripts: one in the `<head>` (the full `prefers-color-scheme` + `localStorage` check) and a second simplified one at the bottom of `<head>` (`try{if(localStorage.getItem('darkMode')==='1')document.documentElement.classList.add('dark-mode');}catch(e){}`). The second one partially overwrites the first but misses the `prefers-color-scheme` system preference and the `theme-init` class. It should be removed.

### 3.5 QR Code Loaded from External API in `one-pager.html`
**File:** `one-pager.html`  
**Impact:** Low  
**Finding:** The print footer fetches a QR code from `api.qrserver.com` on every page load. This adds an external HTTP request and a third-party dependency to a printable page. If that service is unavailable, the QR code is broken.

**Recommendation:** Generate the QR code once and store it as a local asset.

---

## 4. Accessibility

### 4.1 `<main>` Missing `skip-to-content` Link
**Files:** All pages  
**Impact:** High  
**Finding:** None of the pages have a skip navigation link. Screen reader and keyboard users must tab through the full header navigation on every page load to reach `<main id="main-content">`. `main` does have `tabindex="-1"` on `financials.html` and `journal.html` (correct, enables focus on hash navigation), but there is no visible/focusable "Skip to main content" link before the header.

**Fix:** Add `<a href="#main-content" class="skip-link">Skip to main content</a>` as the first child of `<body>` on each page.

### 4.2 Chart Modal — Focus Trap Has a Race Condition
**File:** `js/filters.js`, `showChartModal()`  
**Impact:** Medium  
**Finding:** `showChartModal` calls `firstFocusable?.focus()` inside a `setTimeout(..., 0)`. The focus trap logic (`trapFocus`) is added to the modal before the timeout fires, so the sequence is correct. However the `focusable` NodeList is computed before the chart content has loaded (chart rendering is async), which means `firstFocusable` may point to a button that becomes disabled or removed during chart load. The trap should be re-evaluated after the chart promise resolves.

### 4.3 Accordion Toggle in `journal.html` Uses `role="button"` on a `<div>`
**File:** `journal.html` inline script, `buildEntry()`  
**Impact:** Medium  
**Finding:** `headEl.setAttribute('role', 'button')` is set on a `<div>`. While `tabindex="0"` and keyboard event listeners are also added (Enter/Space), using a native `<button>` element would be preferable — it gains focus, keyboard activation, and accessibility semantics without JS intervention, and doesn't require the manual `role` + `tabindex` dance.

### 4.4 `<img>` Logo in `one-pager.html` `<h1>` Has Descriptive `alt`
**File:** `one-pager.html`  
**Impact:** Low  
**Finding:** The `<h1>` contains `<img src="images/logo-360x360.webp" alt="Howdy, Stranger logo">` followed by the text "Weekly Update". Screen readers will announce "Howdy, Stranger logo Weekly Update" as the page heading. The logo inside the heading is decorative given the heading text — its `alt` should be `""`.

### 4.5 Footer Component Has Full HTML Skeleton
**File:** `components/footer.html`  
**Impact:** Low  
**Finding:** The footer component includes a full `<!DOCTYPE html><html><head>...` wrapper. When injected via `innerHTML`, the browser strips this markup and everything parses fine — but it's technically malformed fragment injection and introduces noise in parsing. The component should just contain the `<footer>` element.

---

## 5. Content & Data Quality

### 5.1 27 Journal Entries Have No Content
**File:** `json/journal.json`  
**Impact:** Medium  
**Finding:** `npm run validate` reports 27 entries across dates spanning 2026-03-21 to 2026-09-19 that have a `title` but no `file`, `content`, or `link`. These render as click-targets with no toggle or body — titles that lead nowhere. Most are emoji-titled items that look like they were stubbed but never fleshed out.

**Recommendation:** Either add at least a `link` or `content` field to each, or remove the stubs if they are drafts that were committed by mistake.

### 5.2 RSS Feed `lastBuildDate` Is Stale
**File:** `news-feed.xml`  
**Impact:** Medium  
**Finding:** The RSS feed `<lastBuildDate>` shows `Sat, 30 May 2026 00:23:58 GMT`. The most recent journal entry is `10/12/26`, roughly 4.5 months newer. RSS readers use `lastBuildDate` to decide whether to fetch the full feed — a stale date causes aggregators to skip the feed update.

**Fix:** Run `npm run generate:rss` after content updates, or integrate it into the publishing workflow.

### 5.3 Stale Financial Indicators
**File:** `json/financials-data.json`  
**Impact:** Medium  
**Finding:** Two indicators have not been updated in over 5 months as of 2026-10-12:

| Indicator | Last Updated | Days Stale |
|---|---|---|
| Shipping Container Rate (China-US 40ft) | 2026-03-20 | 205 days |
| Waymo Trips per Week | 2026-05-05 | 160 days |

Three more are 61-68 days behind (Manufacturing PMI, Job Cuts Report, Small Business Optimism Index). These appear as stale cards and undermine the "real-time data" claim in the page meta description.

### 5.4 Footer Copyright Year Shows 2025
**File:** `components/footer.html`  
**Impact:** Low  
**Finding:** `&copy; 2025 Howdy Stranger.` should be `2026` (or `2025–2026`).

### 5.5 `sitemap.xml` Lacks Article URLs
**File:** `sitemap.xml`  
**Impact:** Low  
**Finding:** The sitemap only lists 5 top-level page URLs. The `article/` directory (referenced in RSS feed items like `article/posts/2026-05-25-president-popular-constitution.md`) is not crawlable because none of the article markdown files appear as HTML URLs that Google could index. If long-form articles are meant to be discoverable, they either need dedicated HTML pages or their content needs to be inline in the journal entries with stable anchors.

---

## 6. SEO

### 6.1 `one-pager.html` Has No Meta Tags
**File:** `one-pager.html`  
**Impact:** Medium  
**Finding:** `one-pager.html` has no `<meta name="description">`, no Open Graph tags, no canonical URL, and no favicon links. If this page is shared or indexed, it will render with no social preview and possibly the wrong title. The page title is "Weekly Update - Howdy, Stranger" which is functional but generic.

### 6.2 `robots.txt` References a Non-Existent Sitemap
**File:** `robots.txt`  
**Impact:** Low  
**Finding:** `robots.txt` references `https://howdystranger.net/news-sitemap.xml` (a Google News-style sitemap). No such file exists in the repo. This causes a 404 on every Googlebot crawl cycle and may generate Search Console errors.

**Fix:** Either create `news-sitemap.xml` or remove the reference from `robots.txt`.

### 6.3 `dateModified` in Structured Data Is Hardcoded
**Files:** `financials.html` (2026-07-13), `journal.html` (2026-09-17)  
**Impact:** Low  
**Finding:** The JSON-LD `WebPage` schema on both pages has a static `dateModified`. Google uses this field to assess freshness; a stale value can suppress the freshness boost that current content would otherwise earn.

**Fix:** Either omit `dateModified` or have the JSON data's `lastUpdated` field drive it dynamically at render time.

---

## 7. Code Quality & Maintainability

### 7.1 Header/Nav Copy-Pasted Into Every HTML File
**Files:** `index.html`, `financials.html`, `journal.html`, `media.html`, `one-pager.html`  
**Impact:** High (maintainability)  
**Finding:** The page header (logo, nav links, dark mode toggle button, and the SVG paths inside it) is duplicated verbatim across all five pages. `one-pager.html` uses a slightly different `<nav class="site-nav">` wrapper instead of `<header class="page-header">`, and references `images/announcements.webp` instead of `images/announcements-60x60.webp`. Any nav change requires editing 5 files.

The `components/` system exists and is already used for the footer — the header should be refactored into a `components/header.html` using the same `HtmlUtils.loadComponentToElement` pattern.

### 7.2 `js/pages-config.js` and `js/nav.js` Referenced in AGENTS.md But Don't Exist
**File:** `AGENTS.md`  
**Impact:** Medium (documentation drift)  
**Finding:** AGENTS.md says "js/pages-config.js defines canonical site navigation; js/nav.js renders nav from it and adds 'new content' badges." Neither file exists in `js/`. The nav is hardcoded in HTML. This misleads future agents and developers about the actual architecture.

**Fix:** Update AGENTS.md to reflect reality, or build the described modules if nav badges are a desired feature.

### 7.3 `search.js` Is a No-Op Placeholder
**File:** `js/search.js`  
**Impact:** Medium  
**Finding:** `js/search.js` exports a no-op `initSearch()` function and exists only "for validation." It's loaded by `one-pager.html` via `<script src="js/search.js" defer>`. Since it uses `export`, it's an ES module — but it's loaded without `type="module"`, so the export is silently ignored. The validate script checks that it exists. Search on `one-pager.html` is actually handled by the inline script in `one-pager.js`, not `search.js`.

**Fix:** Either implement `search.js` properly or remove the reference from `one-pager.html` and from validation.

### 7.4 `financials copy.html` / `js/financials-copy.js` / `css/financials-copy.css` Are Committed Scratch Files
**Files:** `financials copy.html`, `js/financials-copy.js`, `css/financials-copy.css`  
**Impact:** Medium  
**Finding:** A copy of the financials page with a space in the filename is in the repo root alongside production files. Vercel will serve this at `/financials%20copy` which is a live URL. These files appear to be experimental scratch copies and should be deleted.

### 7.5 `json/journal.json.bak` and `json/nfl-games.yml` Are Unintentional Artifacts
**Files:** `json/journal.json.bak`, `json/nfl-games.yml`  
**Impact:** Low  
**Finding:** `journal.json.bak` is a backup file served by Vercel (accessible at `/json/journal.json.bak`). `nfl-games.yml` is a YAML file in the JSON directory — the validate script ignores it but it's an inconsistency. Both should be removed from the repo (or added to `.vercelignore`/`.gitignore`).

### 7.6 Component Loader Inefficiency — 4 Sequential Fetches on `financials.html`
**File:** `js/component-loaders.js`  
**Impact:** Low  
**Finding:** `component-loaders.js` makes **4 sequential fetches** at startup for `footer.html`, `error-handling.html`, `scripts-unified.html`, and `analytics.html`. These are fired without `Promise.all`, so they run one-after-another in the event loop (they're actually independent and could be parallelized). The analytics component also re-initializes `gtag` even though `gtag` is already set up inline — if `components/analytics.html` is loaded after an interaction, `gtag('js', new Date())` fires twice with a stale timestamp.

### 7.7 `journal.html` Markdown Renderer Is Duplicated
**Files:** `journal.html` (inline script), `js/html-utils.js`  
**Impact:** Medium  
**Finding:** `journal.html` contains a large (~400-line) inline IIFE with its own `parseMarkdown`, `parseInline`, `escapeHtml`, `escapeAttr`, `slugify`, and `normalizeImages` functions. `js/html-utils.js` has an `ensureHtmlSanitizer` and `parseFrontmatter` already. A `js/journal-feed.js` is referenced in AGENTS.md as the intended render module, but the actual work is in the inline script. The inline approach makes the HTML file hard to maintain and bypasses the shared sanitization in `html-utils.js`.

**Recommendation:** Extract the inline journal render logic into `js/journal-feed.js`, import `HtmlUtils.escapeHtml` and `HtmlUtils.parseFrontmatter`, and load it as a `<script defer>`.

### 7.8 `js/one-pager.js` — `LIMITS` Are All Set to `Infinity`
**File:** `js/one-pager.js`  
**Impact:** Low  
**Finding:** The `LIMITS` constant (`journal: Infinity, essays: Infinity, media: Infinity, financials: Infinity, worldCup: Infinity`) exists but is never applied — the one-pager renders all items from every data source. If the data grows, this page will become slow to render and very long to read.

---

## 8. Service Worker

### 8.1 SW Cache Name Is Still `media-cache-v3` Despite General Use
**File:** `sw.js`  
**Impact:** Low  
**Finding:** The service worker caches both JS/HTML (for offline fallback) and external media images, but its name `media-cache-v3` implies it only handles media. The name is cosmetic but misleading for debugging. More practically, CSS files are not intercepted by the SW even for fallback — a user who loads the page offline after previously visiting will get JS fallback but no stylesheet fallback.

### 8.2 SW `fetch` handler bypasses non-image external assets
**File:** `sw.js`  
**Impact:** Low  
**Finding:** The SW early-returns for anything that isn't `.js`, `.html`, or an image on the whitelist. External fonts, Font Awesome CSS, and the Lucide CDN JS are never cached. Offline behavior is thus partial — the page loads but fonts and icons are missing.

---

## 9. Prioritized Recommendation Summary

| Priority | Issue | File(s) | Effort |
|---|---|---|---|
| 🔴 Critical | Stray `w` JS syntax error | `financials.html` | 1 min |
| 🔴 Critical | No security headers | `vercel.json` | 15 min |
| 🟠 High | Skip-to-content link missing | All HTML | 30 min |
| 🟠 High | Nav copy-pasted 5× | All HTML | 2-3 hr |
| 🟠 High | RSS `lastBuildDate` stale | `news-feed.xml` | run `npm run generate:rss` |
| 🟡 Medium | AGENTS.md references nonexistent files | `AGENTS.md` | 15 min |
| 🟡 Medium | 27 empty journal entries | `json/journal.json` | content work |
| 🟡 Medium | `one-pager.html` no meta/OG tags | `one-pager.html` | 20 min |
| 🟡 Medium | `robots.txt` references missing `news-sitemap.xml` | `robots.txt`, sitemap | 30 min |
| 🟡 Medium | Duplicate markdown renderer in `journal.html` | `journal.html` | 1-2 hr |
| 🟡 Medium | Scratch files in repo root | `financials copy.html` etc. | 5 min |
| 🟢 Low | Footer copyright year | `components/footer.html` | 1 min |
| 🟢 Low | Duplicate dark mode init | `media.html` | 5 min |
| 🟢 Low | `.bak` and `.yml` artifacts in `json/` | `json/` | 5 min |
| 🟢 Low | Static `dateModified` in JSON-LD | `financials.html`, `journal.html` | 30 min |
| 🟢 Low | Stale indicators (Shipping Rate, Waymo) | `json/financials-data.json` | content work |
| 🟢 Low | QR code from external API | `one-pager.html` | 15 min |
