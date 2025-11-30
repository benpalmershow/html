# Article Layout CSS Improvements

## Summary

Created a comprehensive `css/article.css` file that consolidates all article styling and eliminates the need for inline styles across all 33 article files.

## Changes Made

### 1. New CSS File Created
**File:** `css/article.css`

This file contains:
- Unified article wrapper styling (`.article-wrapper`)
- Complete typography system for articles
- Metadata header styling
- Back button and navigation elements
- Stock info boxes and guidance boxes
- Responsive design for mobile/tablet
- Proper spacing, colors, and transitions

### 2. HTML File Updated
**File:** `news.html`

Added stylesheet link:
```html
<link rel="stylesheet" href="css/article.css?v=20251117">
```

### 3. All Article Files Updated (33 files)

Replaced inline styles:
```html
<!-- Before -->
<div style="max-width: 680px; margin: 0 auto; padding: 0 20px;">

<!-- After -->
<div class="article-wrapper">
```

**Updated articles:**
- aaup-rubio.md
- airo-ipo.md
- barrett_v_us.md
- big-beautiful-bill.md
- boston-public-market.md
- bullish-ipo.md
- ceqa-reforms.md
- chiles-v-salazar.md
- circle-ipo.md
- corrections-hood-twlo.md
- fiber-supplement.md
- figma-ipo.md
- healthcare-costs.md
- liberal-housing-policy.md
- local-bounti-q2-2025.md
- military-drones.md
- navan-ipo.md
- okta-q2-2026.md
- oregon-kei-trucks-sb1213.md
- oversight-committee-report.md
- peloton-stock.md
- reddit-q2-2025-earnings.md
- robinhood-q2-2025.md
- scotus-nov-2025.md
- scotus-oct-2025.md
- sustainable-abundance.md
- trump-v-casa.md
- trump-v-vos-sauer.md
- trump-v-vos-selections.md
- trump-v-vos-selections-tmp.md
- trump-v-vos-update.md
- urban_crime_2020.md
- us-investment-reshoring.md

## CSS Features Added

### Article Wrapper
- `max-width: 680px` for optimal readability
- `margin: 0 auto` for center alignment
- Responsive padding (20px desktop → 12px mobile)

### Typography
- H1-H6 with proper sizing and spacing
- Paragraph spacing with 1.7 line height
- List styling with proper indentation
- Link colors with hover effects
- Strong and emphasis text styling

### Components
- **Metadata Header:** Date, ticker, category display
- **Stock Info Boxes:** Company financial information
- **Guidance Boxes:** Important callouts with left border accent
- **Blockquotes:** Styled with left border and secondary colors
- **Code Blocks:** Dark background with proper contrast
- **Tables:** Striped rows with hover states
- **Images:** Max-width 100% with border radius

### Responsive Design
- **768px and below:** Adjusted typography, reduced padding, flexible metadata
- **480px and below:** Mobile-optimized with smaller fonts, minimal padding

### Navigation
- Back button with hover effects
- Button hints with responsive sizing
- Proper touch targets for mobile

## Benefits

1. **Cleaner HTML:** No inline styles cluttering markup
2. **Maintainability:** All article styling in one place
3. **Consistency:** Uniform styling across all articles
4. **Responsiveness:** Mobile-optimized design
5. **Performance:** Single CSS file loads once
6. **Flexibility:** Easy to update global article styles

## CSS Classes Used

- `.article-content` - Main article container
- `.article-wrapper` - Content width limiter
- `.article-meta-header` - Metadata section
- `.article-date` - Date styling
- `.article-ticker` - Stock ticker styling
- `.back-button` - Navigation button
- `.button-hint` - Button hint text
- `.read-full-article-btn` - CTA button
- `.stock-info` - Company info boxes
- `.guidance-box` - Important callouts

## Variables Used (from body.css)

- `--bg-primary`, `--bg-secondary`, `--bg-tertiary` - Background colors
- `--text-primary`, `--text-secondary` - Text colors
- `--color-primary`, `--color-secondary` - Accent colors
- `--border-color` - Border styling
- `--logo-orange`, `--logo-teal` - Brand colors
