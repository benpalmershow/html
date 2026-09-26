# Badge Component System

Reusable MoM (Month-over-Month) badges for displaying economic indicator changes in posts and announcement cards.

## Overview

The badge system reuses existing indicator styling from financials.html:

1. **posts-loader.js** - Template parser for `{{badge:...}}` syntax
2. **CSS** - Auto-injected on page load (sourced from financials.html styling)
3. **No new dependencies** - uses existing indicators.js patterns

## Usage

### In Markdown Posts

Use the template syntax: `{{badge:Indicator Name}}`

```markdown
**Industrial Production Index**: 102.3 {{badge:Industrial Production Index}} {{chart:Industrial Production Index}}

**Used Vehicle Value Index**: 210 {{badge:Used Vehicle Value Index}} {{chart:Used Vehicle Value Index}}
```

The badge automatically:
- Fetches indicator data from `financials-data.json`
- Calculates Month-over-Month percentage change
- Applies CSS classes (`change-positive`, `change-negative`, `change-neutral`)
- Formats the percentage with +/- sign

### In JavaScript (indicators.js)

For indicator card buttons, use `buildChangeMetricButton()`:

```javascript
const momInfo = formatChangeIndicator(momChange.percentChange);
const momTitle = "Month-over-Month (MoM) change calculated from available data.";
changeIndicators += buildChangeMetricButton('MoM', momInfo, momTitle);
```

## Badge Styling

### CSS Classes

- `.mom-badge` - Base badge styling
- `.change-positive` - Green gradient for positive changes
- `.change-negative` - Red gradient for negative changes
- `.change-neutral` - Gray gradient for zero/no change

### Visual Properties

- **Size**: 0.78rem font, 2px padding top/bottom, 6px padding left/right
- **Colors**: CSS variables `--text-primary`, green (16, 185, 129), red (239, 68, 68), gray (107, 114, 128)
- **Effects**: Gradient backgrounds, inset box-shadow for depth, subtle border

## Files

- `js/posts-loader.js` - Template parser (processBadges function) and style injection (injectBadgeStyles)
- `article/posts/*.md` - Posts using `{{badge:Label|Change%}}` syntax
- `js/indicators.js` - Original change metric styling (source reference)

## Adding Badges to New Posts

1. Posts automatically get badge CSS injected via posts-loader.js
2. **Use template syntax in markdown**: `{{badge:Label|Change%}}`
3. Works on any page that uses posts-loader.js

## Examples

### Template Format

```
{{badge:Industrial Production Index}}    → Fetches data, calculates MoM
{{badge:10-yr Treasury Yield}}           → Dynamic percentage from JSON
{{badge:Case-Shiller National Home Price Index}}  → Auto-calculated change
```

### In Posts

```markdown
<i data-lucide="briefcase"></i> **Industrial Production Index**: 102.3 {{badge:Industrial Production Index}} {{chart:Industrial Production Index}}

<i data-lucide="home"></i> **30-yr Mortgage Rate**: 6.07% {{badge:30-yr Mortgage Rate}} {{chart:30-yr Mortgage Rate}}
```

The badge values populate automatically from `financials-data.json` - same data source as charts.

## Technical Details

### Badge Processing Pipeline

1. Post markdown is fetched
2. `{{badge:Indicator Name}}` templates are found in `processBadges()`
3. `financials-data.json` is fetched and cached
4. Latest and previous month values are extracted
5. Month-over-Month percentage is calculated: `((Current - Previous) / Previous) × 100`
6. CSS class is determined (positive/negative/neutral)
7. Formatted HTML span is inserted
8. Badge styles are auto-injected on page load

### Change Calculation

```javascript
const current = latestMonthValue;
const previous = previousMonthValue;
const change = ((current - previous) / previous) * 100;
const cssClass = change > 0 ? 'change-positive' : change < 0 ? 'change-negative' : 'change-neutral';
const formatted = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
```

## Browser Compatibility

Works on all modern browsers with CSS gradient support (IE11+ with fallbacks).
