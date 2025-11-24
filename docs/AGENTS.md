# Agent Guidelines for Howdy, Stranger

## Build/Lint/Test Commands

**Build Commands:**
- No automated build process - static HTML/CSS/JS site
- No traditional package.json build scripts

**Testing:**
- No formal test runner configured
- Manual testing via browser console for functionality

**Linting:**
- No linting tools configured (no ESLint, Prettier, etc.)
- Code style maintained through manual review

## Architecture & Codebase Structure

**Project Type:** Static HTML website for independent economic commentary and news

**Key Directories:**
- `article/` - Markdown and HTML article content files
- `css/` - Stylesheets (body.css, nav.css, index.css, news.css, financials.css, media.css, journal-tweets.css)
- `docs/` - Documentation
- `images/` - Static image assets (logos, favicons, webp images)
- `js/` - JavaScript modules (nav, posts-loader, socials, financials, journal-feed, media, news, portfolio, countdown, animations, bfcache-compat, speed-insights, news-preview)
- `json/` - Data files (posts, articles, media, journal, portfolio, financials-data)

**Subprojects/APIs:**
- **Content Management**: Post loading via posts-loader.js, journal feeds, media curation, portfolio management
- **Dynamic Pages**: Financial data, news aggregation, media feeds, portfolio display, countdown timers

**No databases** - static site with JSON data files

## Code Style Guidelines

**JavaScript:**
- ES6+ modules with import/export syntax
- Async/await for asynchronous operations
- DOM manipulation with modern APIs
- Event listeners and dynamic content loading
- Console logging for debugging (no formal logging framework)

**HTML:**
- Semantic HTML5 structure
- Accessibility features (ARIA labels, alt text, proper heading hierarchy)
- SEO-optimized meta tags and structured data (JSON-LD)
- Responsive design with viewport meta tags

**CSS:**
- CSS custom properties (variables) for theming
- Flexbox and CSS Grid for layouts
- Media queries for responsive design
- CSS animations and transitions
- Dark mode support with CSS variables
- Always ensure new features work in both light and dark modes
- Avoid color contrast issues: prevent light text on light backgrounds and dark text on dark backgrounds by using theme-aware CSS variables
- Text colors should be black in light mode and white in dark mode

**Naming Conventions:**
- kebab-case for file names (e.g., `posts-loader.js`, `journal-tweets.css`)
- camelCase for JavaScript variables and functions
- CSS classes use descriptive names with hyphens

**Error Handling:**
- Try/catch blocks around async operations
- Console.error for error logging
- Graceful degradation for missing resources

**Imports:**
- Relative imports within the project
- CDN imports for external libraries (Chart.js, marked.js, Font Awesome, lucide)
- Deferred and async loading for non-critical scripts

## Content Update Guidelines

**Posts in posts.json:**
- When creating new posts, include the latest updates from financials-data.json or other relevant data sources (e.g., prediction markets, news).
- Use the most recently updated monthly numbers.
- Use current month data available in JSON files; avoid missing recent monthly updates that have been saved.
