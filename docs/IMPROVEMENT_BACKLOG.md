# Site Improvement Backlog
_Audited: June 3, 2026_

---

## Critical — breaks things / hurts performance

1. **Tailwind Play CDN on `portfolio.html`**
   - 350KB+ blocking JS downloaded and parsed on every load just for utility classes
   - Replace with Tailwind CLI output or plain CSS rules
   - Decision needed: keep Tailwind on portfolio or drop it?

2. **Async `head-meta` loading via fetch (financials, media, journal, news, portfolio)**
   - `viewport` and `charset` meta tags arrive *after* first paint
   - Browser commits to layout before viewport meta is available
   - Fix: inline these tags directly in each `<head>`

3. **Duplicate `PAGES` array in `swipe-nav.js`**
   - `nav.js` and `swipe-nav.js` each maintain their own copy
   - Adding a page to `nav.js` silently breaks swipe navigation
   - Fix: export/share a single source of truth

4. **`journal.html` footer not loading**
   - Footer fetch script is missing on this page
   - Fix: add the same footer loader block used on other pages

5. **Dark mode persistence script is outside `<head>`**
   - Currently placed before `<body>` but after `</head>`
   - Browser may have already started painting before it runs — causes flash
   - Fix: move inside `<head>` as last child

---

## Accessibility — real usability gaps

6. **Missing skip links on media, journal, portfolio**
   - Three pages have no "skip to main content" link
   - Fix: add `<a href="#main-content" class="skip-to-content">Skip to main content</a>` as first child of `<body>`

7. **`aria-current="false"` is invalid**
   - Set on non-active nav links in the rendered nav HTML
   - The attribute should be omitted entirely when not active
   - Fix: remove the attribute or only set it when value is `"page"`

8. **`<nav>` has no `aria-label`**
   - Screenreaders announce it as just "navigation" with no context
   - Fix: add `aria-label="Main"` to `#main-nav`

9. **Chart modal on `financials.html` has no ARIA**
   - Missing `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, and focus trap
   - Fix: add full dialog ARIA pattern and focus management

---

## Code quality / maintainability

10. **`formatTimeAgo` copy-pasted 4 times in `one-pager.js`**
    - Identical function repeated throughout the file
    - Fix: move to `utils.js` and call from there

11. **Duplicate CSS blocks**
    - `.search-wrapper` defined twice across CSS files
    - `source-toggle-btn` styles defined twice
    - Conflicting `prefers-reduced-motion` blocks
    - Fix: consolidate into a single canonical definition per rule

12. **Lucide initialization has infinite retry risk**
    - `initializeLucideIcons` calls itself via `setTimeout` indefinitely if CDN never loads
    - Fix: add a max retry count (e.g. 10 attempts) before giving up

13. **Three different analytics loading patterns across pages**
    - Some inline, some via component fetch, some deferred
    - Fix: standardize in the shared `analytics.html` component

---

## Quick wins — low effort, real improvement

14. **`window.pageYOffset` is deprecated**
    - Used in scroll handlers; some places already use `window.scrollY`
    - Fix: replace all `window.pageYOffset` with `window.scrollY`

15. **`page-left-accent` defined twice in `page-branding.css`**
    - Fix: remove the duplicate block

16. **`--transition-fast` token overridden in `media.css`**
    - Clobbers the global theme token value
    - Fix: use a local variable name or remove the override

---

## Completed

- [x] Nav: logo promoted out of nav-list, wordmark added
- [x] Nav: dark mode toggle wired up and rendered
- [x] Nav: visible icon labels replace hidden `::after` tooltips
- [x] Nav: active state uses orange ring + dot indicator
- [x] Nav: dark mode persists via localStorage across pages
- [x] Nav: `aria-current="page"` on active links
