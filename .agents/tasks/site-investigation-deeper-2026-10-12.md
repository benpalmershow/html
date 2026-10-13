# Deep Site Investigation — Howdy, Stranger
**Date:** 2026-10-12 (Pass 2)  
**Scope:** JS architecture, UX/accessibility, CSS consistency, automation, components, journal perf, SW, dead code

---

## Summary

This pass uncovered **22 actionable findings** across 7 categories. The highest-priority items are: (1) `console.log` calls left in production chart/filter code, (2) no `unhandledrejection` handler so silent promise failures go unreported, (3) the `update-nfl-odds.yml` workflow uses the deprecated `set-output` command (breaks silently on newer runner images), (4) `actions/checkout@v5` and `setup-python@v6` don't exist — the `fetch-earnings.yml` references non-existent action versions, (5) `world-cup.js` injects API data (team names, venues) into `innerHTML` without escaping, and (6) the `footer.html` component is wrapped in a full `<!DOCTYPE html>` document, meaning `innerHTML`-injected footer content on every page contains an illegal nested `<html>/<head>/<body>`, which is quietly stripped by browsers but is invalid markup.

---

## 1. JavaScript Architecture & Runtime Quality

### Finding JS-1 — `console.log` calls left in production
**File:** `js/filters.js` (lines 157–158), `js/charts.js` (lines ~63, 67, 72, 76, 77), `js/services.js` (line in `loadExternalModule`)  
**Impact:** Medium  
**Detail:** Seven `console.log` statements fire on every chart interaction and on every external module load. In `filters.js` two logs fire every time any chart button is clicked: `'Chart button clicked'` and `'Indicator name: ...'`. In `charts.js` four more fire per overlay toggle. These spam the console in production and signal unfinished debugging.  
**Fix:** Remove all `console.log` calls from production paths. Keep `console.warn`/`console.error` for real error conditions.

---

### Finding JS-2 — No `unhandledrejection` global handler
**File:** `components/error-handling.html`  
**Impact:** High  
**Detail:** The error-handling component listens for `window.addEventListener('error', ...)` (synchronous errors only). There is no `window.addEventListener('unhandledrejection', ...)`. Every failed async fetch in `one-pager.js`, `world-cup.js`, `13f-holdings.js`, and `charts.js` that isn't explicitly caught will fail silently in the browser. `world-cup.js` wraps its outer fetch in try/catch but the `renderMatchCards` call is not guarded. `13f-holdings.js` catch only covers the data fetch, not card initialization (`initializeFirmCards` can throw on malformed data with no catch). `one-pager.js`'s `initOnePager` has no top-level catch — if any `loadLatest*` rejects, the user sees a partial page with no feedback.  
**Fix:** Add `window.addEventListener('unhandledrejection', event => { ... })` to `error-handling.html`. Add a top-level `try/catch` wrapper to `initOnePager()`.

---

### Finding JS-3 — Handler setup called 4× per render cycle (redundant re-registration attempt)
**File:** `js/financials.js` (lines 77–80, 118–121, 143–146, 555–558)  
**Impact:** Low  
**Detail:** `setupInfoIconHandlers`, `setupChartIconHandlers`, `setupCategoryFilterHandlers`, and `setupExpandHandlers` are called in four separate code paths: inside `renderDashboard` for the 13F/Elections branches, in the batch render loop (`scheduleDeferredCategoryRender`), in `renderDashboard` itself, and again in `initializeDashboard`. The `boundIconHandlers` Set in `filters.js` prevents duplicate document-level listeners from actually multiplying — these subsequent calls are no-ops after the first — but the redundant calls create confusion about where handlers actually live and obscure whether new DOM is getting coverage.  
**Fix:** Call the four setup functions once in `initializeDashboard` only, since they use document-level delegation (not per-element listeners). Remove the repeated calls inside `renderDashboard` and `scheduleDeferredCategoryRender`.

---

### Finding JS-4 — `world-cup.js` injects unsanitized API data into `innerHTML`
**File:** `js/world-cup.js` (lines ~75–97, ~60–65)  
**Impact:** Medium (XSS risk if API data is compromised or spoofed)  
**Detail:** `match.teamA.name`, `match.teamB.name`, `match.venue`, `match.source`, and `match.teamA.crest` URL are interpolated directly into template literals used with `card.innerHTML`. The `extraInfo` array is built with unsanitized strings and then joined into HTML. The `escapeHtml` function exists in `html-utils.js` but is not used anywhere in `world-cup.js`. The `match.teamA.crest` value is injected directly as an `<img src="...">`, which could allow data URIs.  
**Fix:** Wrap all interpolated API strings with `HtmlUtils.escapeHtml()`. For `crest` URLs, validate the scheme is `https://` before injecting. Note: `world-cup.js` does not import `HtmlUtils` — it should be loaded before `world-cup.js` on `financials.html`.

---

### Finding JS-5 — `13f-holdings.js` injects unsanitized JSON data into `innerHTML`
**File:** `js/13f-holdings.js` (lines 107, 117, 126–127, 213–214)  
**Impact:** Medium  
**Detail:** `firmName` (from `firmShortNames`), `description` (from `firmData[firmIdx].description`), `h.ticker`, `h.name`, and `h.link` are all interpolated into `card.innerHTML = createFirmCardHTML(...)` with no escaping. `h.link` is used as an `href`, which could allow `javascript:` URIs if the JSON file were tampered with. The `description` field is injected raw — it currently contains HTML-like fragments.  
**Fix:** Escape `firmName`, `h.ticker`, `h.name` with `HtmlUtils.escapeHtml()`. Validate `h.link` URLs (strip `javascript:` scheme). `description` can remain HTML but should be passed through `HtmlUtils.sanitizeHtml()`.

---

### Finding JS-6 — `setupLazyIndicatorRendering` IntersectionObserver never disconnected
**File:** `js/financials.js` (lines 268–287)  
**Impact:** Low (minor memory leak on filter changes)  
**Detail:** `setupLazyIndicatorRendering` creates a new `IntersectionObserver` on every call to `renderDashboard`. Each call to `renderDashboard` (filter change, deferred batch render) creates another observer. While `observer.unobserve(category)` is called per entry, the observer objects themselves accumulate since there's no `observer.disconnect()` or reference cleanup. On a page where a user cycles through several filters, multiple observers co-exist observing nothing.  
**Fix:** Store the observer reference in a module-level variable. Call `observer.disconnect()` at the top of `renderDashboard` before creating a new one.

---

### Finding JS-7 — `component-loaders.js` `loadComponent` response not checked for `ok`
**File:** `js/component-loaders.js` (lines 5–13)  
**Impact:** Low  
**Detail:** `fetch(componentPath).then(response => response.text())` does not check `response.ok`. A 404 for any component will silently inject the server's error page HTML into the DOM. The `HtmlUtils.loadComponentToElement` function in `html-utils.js` also doesn't check `response.ok` before returning text. Only `loadComponentHtml` throws if `!response.ok`.  
**Fix:** In `component-loaders.js` `loadComponent`, add `if (!response.ok) throw new Error(...)` before calling `.text()`.

---

## 2. UX and Interaction Quality

### Finding UX-1 — No skip-to-content link on any page
**Files:** `index.html`, `financials.html`, `journal.html`, `media.html`, `one-pager.html`  
**Impact:** Medium (WCAG 2.4.1 — Level A)  
**Detail:** The `.skip-to-content` CSS class exists in `body.css` (line ~236) and the style is complete (positions off-screen, appears on focus). But none of the five HTML pages include the actual `<a class="skip-to-content" href="#main-content">Skip to content</a>` element in the `<body>`. `journal.html`, `financials.html`, and `media.html` all have `id="main-content"` on their `<main>` element — the link target is ready, the link itself is missing.  
**Fix:** Add `<a class="skip-to-content" href="#main-content">Skip to content</a>` as the first child of `<body>` on all 5 pages. `index.html` and `one-pager.html` need `id="main-content"` added to their `<main>` element first.

---

### Finding UX-2 — `aria-live="polite"` on feed but no status region for filter changes
**File:** `journal.html` (line 138), `js/journal-filters.js`  
**Impact:** Low  
**Detail:** The `#feed` div has `aria-live="polite"` which is correct for content loading. However, when a filter is applied and entries are hidden/shown, there is no announcement of how many results match. Screen reader users get no feedback that filtering occurred. `media.js` has the same gap — no count announcement after filter change.  
**Fix:** After `filterJournalEntries()` runs, set a sr-only live region's text to e.g. "Showing 12 entries in Economy". A single `<div role="status" class="sr-only" id="filter-status"></div>` element with `aria-live="polite"` suffices.

---

### Finding UX-3 — `one-pager.html` uses `<nav>` not `<header>` + ARIA label inconsistency
**File:** `one-pager.html` (line ~40)  
**Impact:** Low  
**Detail:** All other pages use `<header class="page-header" role="banner">` for the site navigation bar. `one-pager.html` uses `<nav class="site-nav" id="main-nav" aria-label="Main">` with a nested `.nav-container`. This means `one-pager.html` has no `<header role="banner">` landmark, breaking landmark navigation consistency. The nav label "Main" is also less descriptive than "Site navigation" used on other pages.  
**Fix:** Refactor `one-pager.html` nav to match the `<header class="page-header">` pattern. Since this page's nav uses a different CSS class (`site-nav`/`nav-container` vs `page-header`/`header-nav`), consider whether to align it with the shared nav CSS or document the intentional divergence.

---

### Finding UX-4 — Filter bar has no `aria-live` or role=status for loading/empty states
**File:** `js/financials.js` `handleEmptyState`, `js/media.js`  
**Impact:** Low  
**Detail:** When no indicators match a filter on financials.html, `handleEmptyState` injects `<div class="empty-state">` into `#indicator-categories` but this container has no `aria-live` attribute — screen readers won't announce the empty state. Same for media.html's filter empty state.  
**Fix:** Add `aria-live="polite"` to `#indicator-categories` on `financials.html` and to `#media-cards-container` on `media.html`.

---

## 3. CSS and Visual Consistency

### Finding CSS-1 — Undefined CSS variables used in `body.css` dark-mode block
**File:** `css/body.css` (lines 216–221)  
**Impact:** Low (visual regression in edge case)  
**Detail:** The `@media (prefers-color-scheme: dark)` block for `html:not(.theme-init)` filter buttons references `--color-dark-bg-secondary`, `--color-dark-text-secondary`, and `--color-dark-bg-primary`. None of these variables are defined anywhere in `theme.css` or any other CSS file. They fall back to the hardcoded hex values in the `var()` calls (`#374151`, `#d1d5db`, `#1f2937`), so visually it works, but this is fragile — the fallback values don't match the actual dark mode palette (`--bg-secondary: #161b22`, `--text-secondary: #e2e8f0`).  
**Fix:** Replace the undefined variable references with the actual theme tokens: `var(--bg-secondary)`, `var(--text-secondary)`, `var(--bg-primary)`.

---

### Finding CSS-2 — Z-index values not coordinated across files
**Files:** `css/nav.css` (5000), `css/theme.css` (5001 for `.site-header`), `css/body.css` (9999 for `.skip-to-content`), `css/media.css` (10000, 10001 for lightbox), `css/sun-track.css` (5002), `css/media-overlay.css` (100)  
**Impact:** Low  
**Detail:** Z-index values are defined ad hoc in six separate files with no shared scale. Values jump from 100 (chart overlay) to 5000 (nav) to 9999 (skip link) to 10001 (media lightbox). The `.skip-to-content` at z-index 9999 would be covered by the media lightbox at 10001 if both were visible simultaneously — not a real scenario but indicative of unplanned stacking. A `--z-overlay` variable is defined only locally in `media.css` (line 44) and isn't part of the global theme.  
**Fix:** Add a z-index scale to `theme.css`: `--z-base: 1`, `--z-sticky: 100`, `--z-dropdown: 200`, `--z-overlay: 5000`, `--z-modal: 9000`, `--z-toast: 9500`, `--z-skiplink: 9999`. Replace all hardcoded z-index values site-wide.

---

### Finding CSS-3 — `footer.html` is a full HTML document, not a fragment
**File:** `components/footer.html`  
**Impact:** Medium (invalid markup)  
**Detail:** `footer.html` starts with `<!DOCTYPE html><html lang="en"><head>...</head><body>`. When `component-loaders.js` and inline footer fetch scripts do `element.innerHTML = html`, browsers strip the `<!DOCTYPE>`, `<html>`, `<head>`, and `<body>` tags (they're invalid in that position) and inject only the inner content — so it works visually. However, the markup is invalid, tools like accessibility scanners and SEO validators will flag it, and `HtmlUtils.loadComponentToElement` sets `element.innerHTML = html` which silently discards the full-document wrapper. The other component files (`analytics.html`, `error-handling.html`, `head-meta.html`) are proper fragments.  
**Fix:** Strip the `<!DOCTYPE html><html>...<body>` wrapper from `footer.html`. Keep only the `<footer id="social-footer">...</footer>` content.

---

### Finding CSS-4 — `bg-primary-rgb` missing from dark-mode overrides
**File:** `css/theme.css` (dark mode blocks)  
**Impact:** Low  
**Detail:** `--bg-primary-rgb` is defined as `253, 246, 232` in the light mode `:root` but is not overridden in either the `html.dark-mode` or `@media (prefers-color-scheme: dark) html:not(.theme-init)` blocks. `--bg-secondary-rgb` is also not overridden. These are used in `rgba(var(--bg-primary-rgb), 0.92)` (nav background) and `rgba(var(--bg-secondary-rgb), ...)` (chart overlays in `financials.css` and `components.css`). In dark mode, the nav background and overlays use the light-mode warm cream RGB values, resulting in slightly wrong transparency colors (visible if you use the rgba-based background).  
**Fix:** Add `--bg-primary-rgb: 15, 20, 25` and `--bg-secondary-rgb: 22, 27, 34` to both dark-mode CSS blocks in `theme.css`.

---

## 4. Data Freshness & Automation Gaps

### Finding AUTO-1 — `update-nfl-odds.yml` uses deprecated `set-output` command
**File:** `.github/workflows/update-nfl-odds.yml` (line 33)  
**Impact:** High  
**Detail:** Line 33 uses `echo "::set-output name=week::$(date +%V)"` — the `set-output` workflow command was [deprecated in GitHub Actions in 2022](https://github.blog/changelog/2022-10-11-github-actions-deprecating-save-state-and-set-output-commands/) and errors on the current runner images. The correct form is `echo "week=$(date +%V)" >> "$GITHUB_OUTPUT"`. This likely causes the NFL odds automation to fail silently at the week-detection step.  
**Fix:** Replace `echo "::set-output name=week::$(date +%V)"` with `echo "week=$(date +%V)" >> "$GITHUB_OUTPUT"`. Also remove the deprecated `id: week` output reference pattern and update `${{ steps.week.outputs.week }}` accordingly.

---

### Finding AUTO-2 — `fetch-earnings.yml` references non-existent action versions
**File:** `.github/workflows/fetch-earnings.yml` (lines ~4, 6)  
**Impact:** High  
**Detail:** This workflow uses `actions/checkout@v5` and `actions/setup-python@v6`. As of this audit, `actions/checkout` is at v4 (v5 does not exist) and `actions/setup-python` is at v5 (v6 does not exist). GitHub will fail to resolve these actions, meaning earnings data is never automatically fetched. The other workflows use `@v4`/`@v5` respectively (correct). This is likely a copy-paste error from a draft.  
**Fix:** Change `actions/checkout@v5` → `actions/checkout@v4` and `actions/setup-python@v6` → `actions/setup-python@v5`.

---

### Finding AUTO-3 — World Cup workflow runs every 10 minutes year-round
**File:** `.github/workflows/fetch-world-cup.yml`  
**Impact:** Low (wasteful CI spend)  
**Detail:** The cron is `*/10 * * * *` — 144 runs per day, 4,320 per month — consuming GitHub Actions minutes even when the tournament is not active. The FIFA World Cup runs approximately 4 weeks every 4 years; the 2026 edition will run June–July 2026. Outside that window all 144 daily runs will produce no data changes (the script just fetches, finds nothing new, and exits). No date-range guard is in place.  
**Fix:** Either narrow the cron to the tournament window (June 1 – July 20), or add a date-range check at the start of `fetch_world_cup.py` that exits early when outside the tournament period. The `workflow_dispatch` trigger preserves manual override.

---

### Finding AUTO-4 — `update-nfl-odds.yml` missing `permissions: contents: write`
**File:** `.github/workflows/update-nfl-odds.yml`  
**Impact:** Medium  
**Detail:** The workflow commits and pushes changes (`git push`) but has no `permissions:` block. All other workflows that write to the repo (`fetch-world-cup.yml`, `fetch-fred.yml`, `fetch-fec.yml`, etc.) explicitly declare `permissions: contents: write`. Without this, the workflow relies on the repository's default token permissions, which may be read-only on repos with restricted defaults. If push fails, the workflow exits without error and odds silently go stale.  
**Fix:** Add `permissions:\n  contents: write` to `update-nfl-odds.yml`.

---

## 5. Component Architecture

### Finding COMP-1 — Nav copy-pasted across 5 pages with divergent markup
**Files:** `index.html`, `financials.html`, `journal.html`, `media.html` use `<header class="page-header">` + `<ul class="header-nav">`. `one-pager.html` uses `<nav class="site-nav">` + `<div class="nav-container">` + `<ul class="nav-list">` with completely different CSS classes and a duplicate dark-mode toggle initialization script.  
**Impact:** Medium (maintenance burden, divergence risk)  
**Detail:** Each page duplicates ~20 lines of nav HTML. The four "standard" pages are consistent with each other, but `one-pager.html` has drifted significantly — it uses different class names, different icon sizes (36×36 vs 16×16), `loading="eager"` on all nav icons, and a custom inline dark-mode toggle handler instead of `dark-mode-toggle.js`. Any nav change (new link, icon swap, accessibility fix) must be made in 5 places.  
**Feasibility assessment:** Extracting nav to `components/header.html` is straightforward — the 4 standard pages already share identical markup. The only complication is `aria-current="page"` which requires the active link to be set per-page. This can be solved via a one-line inline script after the component loads: `document.querySelector('.header-nav-link[href="journal.html"]')?.classList.add('active', 'aria-current')`. The complexity is low and the payoff is high.  
**Fix:** Create `components/header.html` with the standard nav markup. Inject it the same way the footer is injected. Add a `data-active-page` attribute on each page's `<body>` to drive the active-link script.

---

### Finding COMP-2 — Footer social icons loaded from CDN `cdn.jsdelivr.net/gh/...` (raw GitHub)
**File:** `components/footer.html` (lines 14, 19, 24, 29, 34, 39)  
**Impact:** Medium  
**Detail:** All 6 social icon `<img>` tags load SVGs from `https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/...`. The `gh/` CDN path serves raw files directly from a GitHub repository, which does not have cache headers as reliable as the npm path (`npm/simple-icons/...`). More importantly, these are external requests that add 6 HTTP round-trips to every page load (footer appears on all 5 pages), block the Service Worker's external domain whitelist (these domains aren't in `sw.js`'s `EXTERNAL_DOMAINS`), and won't cache offline. SVG icons this small (~400 bytes each) should be inlined.  
**Fix:** Inline the 6 SVG icons directly in `footer.html`. They are small, static, and change infrequently. This eliminates 6 external requests per page, works offline, and removes a CDN dependency from a critical UI element.

---

## 6. Journal.json Size & Rendering Performance

### Finding PERF-1 — `journal.json` at 382 KB, 10,224 lines — growing file with no pagination
**Files:** `json/journal.json`, `journal.html`  
**Impact:** Medium (growing concern)  
**Detail:** `journal.json` is currently 381,766 bytes (~373 KB uncompressed). The rendering in `journal.html` uses `allDays.slice(renderIndex, renderIndex + 30)` for progressive rendering, which is good. But the entire file is fetched on first load before any rendering occurs. At current growth rate (daily entries), this will exceed 500 KB within several months. The `Services.dataService` adds a cache-busting `?_t=` timestamp to every fetch, so the browser's HTTP cache is bypassed and the full file is re-fetched on every page load.  
**Detail on cache-bust:** `fetchJSON` in `services.js` appends `?_t=Date.now()` when `!options.bustCache` — but the naming is inverted. The default path (no `bustCache` option set) appends the timestamp and bypasses cache. Only callers that explicitly pass `bustCache: true` skip the timestamp. This means `journal.json`, `financials-data.json`, and every other JSON file is re-fetched in full on every page load, even when Vercel has set proper cache headers.  
**Fix (short term):** In `services.js` `fetchJSON`, invert the cache-bust logic: only append `?_t=` when `options.bustCache === true`, not by default. This immediately lets the browser cache JSON responses.  
**Fix (long term):** Consider a `journal-index.json` with only `{ date, entries: [{ title, category, time }] }` (no `content`, no `file` paths) for the initial load. Full entry content is already fetched lazily via `fetch(entry.file)` for accordion entries.

---

## 7. Service Worker & Offline Behavior

### Finding SW-1 — CSS, fonts, and key JSON files are not cached
**File:** `sw.js`  
**Impact:** Medium  
**Detail:** The service worker caches JS and HTML files (with network-first strategy) and external images from whitelisted CDN domains. It does not cache:
- `css/theme.css`, `css/body.css`, `css/nav.css` (critical CSS — without these, an offline load is unstyled)
- `json/financials-data.json`, `json/media.json`, `json/journal.json` (core data — offline renders nothing)
- Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) — not in the external domain whitelist
- `components/footer.html`, `components/header.html` — fetched at runtime, not cached

The `EXTERNAL_DOMAINS` list contains many `ia*.us.archive.org` subdomains (Internet Archive) for book covers but misses the Google Fonts CDN entirely, so any page loaded offline shows fallback system fonts.  
**Fix:** Add a precache step in the `install` event for the critical shell: `theme.css`, `body.css`, `nav.css`, `json/journal.json`, `json/media.json`, `components/footer.html`. Add `fonts.googleapis.com` and `fonts.gstatic.com` to `EXTERNAL_DOMAINS` and cache their responses. The cache name should be versioned so updates invalidate stale precache.

---

## 8. Dead Code & Debug Artifacts

### Finding DEAD-1 — No `TODO`/`FIXME` comments found
**Files:** All `js/*.js`  
**Impact:** N/A (positive finding)  
**Detail:** `grep -r 'TODO|FIXME|HACK|XXX'` returned no results. Clean codebase.

---

### Finding DEAD-2 — `getOptimizedImageUrl` function in `sw.js` is dead code
**File:** `sw.js` (last 3 lines)  
**Impact:** Low  
**Detail:** The function `getOptimizedImageUrl(originalUrl) { return originalUrl; }` at the bottom of `sw.js` is defined but never called anywhere (not within `sw.js`, not from any page). It's a stub that was presumably added as a placeholder for a future image optimization proxy.  
**Fix:** Remove the dead function. If image optimization is a future goal, document it in a comment or issue instead.

---

## Prioritized Fix List

| # | Finding | Impact | Effort |
|---|---------|--------|--------|
| 1 | AUTO-2: `fetch-earnings.yml` non-existent action versions | High | XS |
| 2 | AUTO-1: NFL odds workflow `set-output` deprecated | High | XS |
| 3 | AUTO-4: NFL odds missing `permissions: contents: write` | Medium | XS |
| 4 | JS-2: No `unhandledrejection` handler | High | S |
| 5 | UX-1: Missing skip-to-content link on all pages | Medium | S |
| 6 | JS-4: XSS risk in world-cup.js innerHTML | Medium | S |
| 7 | JS-5: XSS risk in 13f-holdings.js innerHTML | Medium | S |
| 8 | CSS-3: footer.html full document wrapper | Medium | XS |
| 9 | JS-1: console.log in production chart/filter code | Medium | XS |
| 10 | CSS-4: bg-primary-rgb not overridden in dark mode | Low | XS |
| 11 | PERF-1: cache-bust logic inverted in services.js | Medium | S |
| 12 | CSS-1: Undefined dark-mode CSS variables in body.css | Low | XS |
| 13 | JS-7: component-loaders doesn't check response.ok | Low | XS |
| 14 | COMP-2: Footer social icons via CDN (6 external requests) | Medium | S |
| 15 | SW-1: CSS/fonts/JSON not cached offline | Medium | M |
| 16 | AUTO-3: World Cup workflow runs 144×/day off-season | Low | S |
| 17 | JS-3: Handler setup called 4× per render cycle | Low | S |
| 18 | UX-2: No filter-result live region for screen readers | Low | S |
| 19 | UX-3: one-pager.html nav markup diverges | Low | M |
| 20 | JS-6: Lazy render IntersectionObserver accumulates | Low | S |
| 21 | CSS-2: Ad hoc z-index values across 6 files | Low | M |
| 22 | COMP-1: Nav copy-pasted 5×, one-pager has drifted | Medium | M |
| 23 | DEAD-2: Dead `getOptimizedImageUrl` in sw.js | Low | XS |
| 24 | UX-4: Empty states not announced via aria-live | Low | S |
