# Agent Guidelines for Howdy, Stranger

## Build/Lint/Test Commands

**Build Commands:**
- `bun run js/build.js` - Build JavaScript bundles with minification and sourcemaps to `dist/` directory
- No traditional package.json build scripts - uses standalone Bun build configuration

**Testing:**
- No formal test runner configured
- SEO system includes test modules in `seo/tests/` directory
- Manual testing via browser console for functionality

**Linting:**
- No linting tools configured (no ESLint, Prettier, etc.)
- Code style maintained through manual review

## Architecture & Codebase Structure

**Project Type:** Static HTML website for independent economic commentary and news

**Key Directories:**
- `article/` - Article content and templates
- `css/` - Stylesheets (body.css, dark-mode.css, page-specific styles)
- `dist/` - Built JavaScript bundles (output from build process)
- `docs/` - Documentation (chart maintenance, media fetching, news fetching)
- `images/` - Static assets (logos, favicons, media)
- `js/` - JavaScript modules (navigation, charts, dark mode, feeds)
- `json/` - Data files
- `seo/` - Comprehensive SEO system with analytics, monitoring, structured data

**Subprojects/APIs:**
- **SEO System** (`seo/`): Modular system with analytics, monitoring, search console integration, content schema generation, mobile optimization, and build optimization
- **Chart System**: Financial charts using Chart.js for interactive data visualization
- **Content Management**: Post loading, journal feeds, media curation

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

**Naming Conventions:**
- kebab-case for file names (e.g., `dark-mode.js`, `financials-chart.js`)
- camelCase for JavaScript variables and functions
- CSS classes use descriptive names with hyphens

**Error Handling:**
- Try/catch blocks around async operations
- Console.error for error logging
- Graceful degradation for missing resources

**Imports:**
- Relative imports within the project
- CDN imports for external libraries (Chart.js, Font Awesome)
- Module imports for internal SEO system components
