# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is "The Ben Palmer Show" website (Howdy, Stranger) - a static HTML website focused on providing human-curated content including financial data visualization, news commentary, media recommendations, and journal entries.

## Common Commands

### Development Server
Since this is a static HTML site, use any local HTTP server:
```bash
# Python 3
python3 -m http.server 8000

# Node.js (if you have http-server installed)
npx http-server -p 8000

# PHP (if available)
php -S localhost:8000
```

### File Watching and Live Reload
For development with live reload:
```bash
# Install and use live-server (Node.js)
npx live-server --port=8000

# Or browser-sync
npx browser-sync start --server --files "*.html,css/*.css,js/*.js"
```

### Cache Busting
When making changes to CSS/JS, update version parameters:
```bash
# Find all versioned assets
grep -r "v=202" *.html css/*.css

# Update version strings in HTML files to current date
sed -i '' 's/v=[0-9]*/v=20241007/g' *.html
```

## Architecture Overview

### Core Structure
- **Static Site**: Pure HTML/CSS/JavaScript with no build process
- **Data-Driven**: JSON files drive dynamic content rendering
- **Component-Based**: Modular JavaScript components for different sections
- **Real-Time Integration**: Chart system designed for live data updates

### Page Architecture
```
├── index.html          # Landing page with hero and visitor hints
├── financials.html     # Economic indicators with interactive charts
├── news.html           # Curated news with category filtering
├── media.html          # Book/film/podcast recommendations
├── journal.html        # Personal commentary and insights
└── portfolio.html      # Investment-related content
```

### Data Layer
All dynamic content is stored in `/json/` directory:
- `financials-data.json` - Economic indicators data (source of truth)
- `posts.json` - News articles and commentary
- `media.json` - Curated media recommendations
- `journal.json` - Journal entries and personal insights

### JavaScript Components
- `nav.js` - Floating navigation system (auto-injected)
- `financials-chart.js` - Chart.js integration with real-time data management
- `dark-mode.js` - Theme switching functionality
- `posts-loader.js` - Dynamic content loading from JSON
- `media.js` - Media filtering and display logic

### CSS Organization
- `body.css` - Core styles and layout system
- `dark-mode.css` - Dark/light theme definitions
- Page-specific stylesheets: `financials.css`, `news.css`, `media.css`

## Financial Data System

### Data Synchronization Process
When updating `json/financials-data.json`:

1. **Update JSON First**: Add new monthly data to all relevant indicators
2. **Sync Chart Configurations**: Update `js/financials-chart.js` chart objects:
   - Add new month to `labels` array
   - Add corresponding value to `data` array
   - Verify historical data matches JSON exactly
3. **Maintain Precision**: Keep exact decimal precision from JSON (no rounding)
4. **Test Charts**: Verify each updated chart displays correctly

### Chart System Architecture
- `RealTimeChartManager` class handles live data updates
- Chart configurations map to external data sources (BLS, FRED, Census, etc.)
- Each indicator has specific update intervals based on release schedules
- Modal system displays charts with Chart.js integration

## Content Management

### Adding News Articles
1. Edit `json/posts.json` to add new entries
2. Use category badges: `ipo`, `earnings`, `policy`, `healthcare`, `legal`, `corrections`
3. Articles auto-load via `posts-loader.js`
4. Update `news.html` for any manual content

### Media Recommendations
1. Update `json/media.json` with new books/films/podcasts
2. Include title, creator, year, description, and category
3. System auto-generates filtering and display

### Navigation System
Navigation is auto-injected via `nav.js`:
- Floating design with backdrop blur
- Icon-based with emoji or image support
- Automatic active state detection
- Responsive and accessible

## Styling Guidelines

### CSS Custom Properties
Key variables defined in `body.css`:
```css
--text-primary: Main text color
--text-secondary: Secondary text color
--card-background: Card/container backgrounds
--shadow-color: Drop shadow color
--nav-height: Navigation bar height
```

### Dark Mode Integration
- All styles use CSS custom properties for theme switching
- `dark-mode.js` handles theme persistence and toggle functionality
- Theme colors automatically adjust across all components

## Performance Considerations

- **Preloading**: Critical resources (fonts, hero images) are preloaded
- **Caching**: Static assets use cache-control headers
- **Optimization**: WebP images with PNG fallbacks
- **Lazy Loading**: Non-critical content loads asynchronously
- **CDN**: External libraries loaded from CDN with integrity checks

## Development Workflow

### Making Changes
1. Edit HTML/CSS/JS files directly
2. Test in local server environment
3. Update version strings for cache busting if needed
4. Verify responsive design across devices

### Adding New Pages
1. Follow existing HTML structure with nav injection
2. Include required CSS files (`body.css`, `dark-mode.css`)
3. Add page entry to `navItems` array in `nav.js`
4. Create corresponding CSS file if needed

### Data Updates
- Financial data: Follow chart synchronization process
- News/media: Update JSON files directly
- Static content: Edit HTML files as needed

## Browser Compatibility

- Modern browsers with ES6+ support
- CSS Grid and Flexbox for layouts
- Backdrop-filter support for navigation blur
- Chart.js for data visualization compatibility