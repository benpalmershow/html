# Card Icon Implementation

Enhanced announcement cards on index.html to display lucide icons in the card header, aligned opposite the timestamp.

## Changes Made

### 1. JavaScript (posts-loader.js)
- Added `extractIconFromContent()` function to parse lucide icon names from markdown content
- Modified `renderPosts()` to extract the first icon from each post's HTML content
- Updated card structure to include header row with date and icon

### 2. CSS (index.css)
- Added `.card-header-row` flex layout with space-between alignment
- Styled `.card-icon` with:
  - Orange color (var(--color-secondary))
  - Proper sizing (1.25em)
  - Stroke-width of 2 for consistency
  - flex-shrink: 0 to prevent icon compression
- Updated `.announcement-card time` to prevent line wrapping

## Card Layout

**Before:**
```
[Date]
[Content...]
```

**After:**
```
[Date]                [Icon]
[Content...]
```

## Icon Extraction

The implementation searches for the first `data-lucide` attribute in the markdown-rendered content and uses that icon. This captures icons used in post headers like:

```markdown
### <i data-lucide='trophy' class='post-icon'></i> **Section Title**
```

## Visual Behavior

- Icons inherit the secondary brand color (orange #d4822a)
- Icons maintain consistent sizing across all cards
- Responsive design keeps icon and date on same line
- Icons don't interfere with click-to-expand card functionality

## Supported Icons

All 28 unique lucide icons used in posts are supported:
- Sports: trophy, award
- Financial: briefcase, ship, zap, bar-chart-3, trending-up, trending-down, file-text
- Housing: home, shopping-cart, users
- Construction: hammer, building-2, scroll
- Communication: newspaper, megaphone
- Legal: scale, bot, edit-3
- Policy: circle-off, check, help-circle, arrow-right
- Cultural: film, book
