# Fix Report - Batch 2

## Finding 5 — Add ?v= cache-busting params to one-pager.html
**Done.** Added `?v=20261012` to all five local script references in one-pager.html (`services.js`, `html-utils.js`, `utils.js`, `one-pager.js`, `search.js`). CSS `<link>` tags already had `?v=` params; no change needed there. External CDN URLs (jsdelivr Lucide) skipped as specified.

## Finding 6 — Remove duplicate dark mode init in media.html
**Done.** Removed the second/simpler theme-init `<script>` block at the bottom of `<head>` in media.html (`try{if(localStorage.getItem('darkMode')==='1')...}`). The first, fuller block with the `prefers-color-scheme` check is preserved.

## Finding 7 — Replace external QR code API with local asset in one-pager.html
**Done.**
- Downloaded `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=https://howdystranger.net` to `images/qr-howdystranger.png` (80x80 PNG, 320 bytes).
- Replaced the `api.qrserver.com` `<img>` element (which was using `size=128x128` with a more complex URL) with `<img src="images/qr-howdystranger.png" alt="QR code for howdystranger.net" class="footer-qr-image" width="80" height="80">`.

## Finding 10 — Add meta/OG tags to one-pager.html
**Done.** Inserted after `<title>` in one-pager.html:
- `<meta name="description">` with the weekly briefing description
- `<link rel="canonical" href="https://howdystranger.net/one-pager.html">`
- `og:title`, `og:description`, `og:url`, `og:type`, `og:image` (using `https://howdystranger.net/images/logo-1200x630.webp?v=1` from index.html)
- Favicon links copied from index.html: `favicon.ico`, `favicon-32x32.webp`, `apple-touch-icon.webp`, `site.webmanifest`

## Finding 11 — Fix robots.txt — remove missing news-sitemap.xml reference
**Skipped — not needed.** `/news-sitemap.xml` exists on disk, so the `Sitemap: https://howdystranger.net/news-sitemap.xml` line in robots.txt is valid. No change made.
