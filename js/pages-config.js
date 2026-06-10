// Shared PAGES configuration for navigation across the site
const PAGES = [
  { name: 'Home', file: 'index.html', icon: 'logo-360x360.webp' },
  { name: 'Numbers', file: 'financials.html', desc: 'Economic indicators and market data', icon: 'read.webp' },
  { name: 'Media', file: 'media.html', desc: 'Books, films, and listening picks', icon: 'media.webp' },
  { name: 'Docs', file: 'journal.html', desc: 'Short-form analysis and observations', icon: 'announcements.webp' }
];

// Export to global scope for use in nav.js and swipe-nav.js
window.SitePages = PAGES;