// Search functionality - standalone for use across pages
// SRP: Single responsibility - handle search/filter operations

function setupIndicatorSearch() {
    const searchInput = document.getElementById('indicatorSearch');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        const query = this.value.trim().toLowerCase();
        debounceTimer = setTimeout(() => {
            const indicators = document.querySelectorAll('.indicator');
            const categories = document.querySelectorAll('.category');

            if (!query) {
                indicators.forEach(el => el.style.display = '');
                categories.forEach(el => el.style.display = '');
                return;
            }

            indicators.forEach(indicator => {
                const name = (indicator.getAttribute('data-indicator-name') || '').toLowerCase();
                const agency = (indicator.querySelector('.indicator-agency')?.textContent || '').toLowerCase();
                indicator.style.display = (name.includes(query) || agency.includes(query)) ? '' : 'none';
            });

            categories.forEach(cat => {
                const visibleIndicators = cat.querySelectorAll('.indicator:not([style*="display: none"])');
                cat.style.display = visibleIndicators.length > 0 ? '' : 'none';
            });
        }, 200);
    });
}

function setupMediaSearch() {
    const searchInput = document.getElementById('indicatorSearch');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        const query = this.value.trim().toLowerCase();
        debounceTimer = setTimeout(() => {
            const cards = document.querySelectorAll('.media-card');
            const featuredSection = document.querySelector('.featured-latest-section');

            if (!query) {
                cards.forEach(card => card.style.display = '');
                if (featuredSection) featuredSection.style.display = '';
                return;
            }

            let anyVisible = false;
            cards.forEach(card => {
                const titleEl = card.querySelector('.media-title, h2, h3');
                const title = (titleEl?.textContent || '').toLowerCase();
                const alt = (card.querySelector('img')?.alt || '').toLowerCase();
                const genre = (card.getAttribute('data-genre') || '').toLowerCase();
                const show = title.includes(query) || alt.includes(query) || genre.includes(query);
                card.style.display = show ? '' : 'none';
                if (show) anyVisible = true;
            });

            if (featuredSection) {
                featuredSection.style.display = anyVisible ? 'none' : '';
            }
        }, 200);
    });
}

function setupEssaySearch() {
    const searchInput = document.getElementById('indicatorSearch');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        const query = this.value.trim().toLowerCase();
        debounceTimer = setTimeout(() => {
            const essayCards = document.querySelectorAll('.essay-card');

            if (!query) {
                essayCards.forEach(card => card.style.display = '');
                return;
            }

            essayCards.forEach(card => {
                const titleEl = card.querySelector('.essay-card-title');
                const summaryEl = card.querySelector('.essay-card-summary');
                const title = (titleEl?.textContent || '').toLowerCase();
                const summary = (summaryEl?.textContent || '').toLowerCase();
                card.style.display = (title.includes(query) || summary.includes(query)) ? '' : 'none';
            });
        }, 200);
    });
}

function setupJournalSearch() {
    const searchInput = document.getElementById('indicatorSearch');
    if (!searchInput) return;

    const journalFeed = document.getElementById('journal-feed');
    const essayReader = document.getElementById('essay-reader-container');

    let debounceTimer;
    searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        const query = this.value.trim().toLowerCase();
        debounceTimer = setTimeout(() => {
            const journalEntries = journalFeed ? journalFeed.querySelectorAll('.journal-entry, .entry') : [];
            const essayCards = essayReader ? essayReader.querySelectorAll('.essay-card') : [];
            const allItems = [...journalEntries, ...essayCards];

            if (!query) {
                allItems.forEach(item => item.style.display = '');
                return;
            }

            allItems.forEach(item => {
                const titleEl = item.querySelector('.entry-title, .journal-entry-title, .essay-card-title');
                const contentEl = item.querySelector('.entry-content, .journal-entry-content, .essay-card-summary');
                const title = (titleEl?.textContent || '').toLowerCase();
                const content = (contentEl?.textContent || '').toLowerCase();
                item.style.display = (title.includes(query) || content.includes(query)) ? '' : 'none';
            });
        }, 200);
    });
}

function setupLatestItemsSearch() {
    const searchInput = document.getElementById('indicatorSearch');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        const query = this.value.trim().toLowerCase();
        debounceTimer = setTimeout(() => {
            const allItems = document.querySelectorAll('.compact-list li, .section-card li');

            if (!query) {
                allItems.forEach(item => item.style.display = '');
                return;
            }

            allItems.forEach(item => {
                const text = item.textContent.toLowerCase();
                item.style.display = text.includes(query) ? '' : 'none';
            });
        }, 200);
    });
}

function setupPortfolioSearch() {
    const searchInput = document.getElementById('indicatorSearch');
    if (!searchInput) return;

    let debounceTimer;
    searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        const query = this.value.trim().toLowerCase();
        debounceTimer = setTimeout(() => {
            const rows = document.querySelectorAll('#portfolio-comparison-table tbody tr');
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        }, 200);
    });
}

// Auto-detect page type by URL
function initSearchForPage() {
    const searchInput = document.getElementById('indicatorSearch');
    if (!searchInput) return;

    const path = window.location.pathname;
    let pageType = '';

    if (path.endsWith('financials.html') || path.endsWith('/')) pageType = 'financials';
    else if (path.endsWith('portfolio.html')) pageType = 'portfolio';
    else if (path.endsWith('media.html')) pageType = 'media';
    else if (path.endsWith('news.html')) pageType = 'essays';
    else if (path.endsWith('journal.html')) pageType = 'journal';
    else if (path.endsWith('one-pager.html')) pageType = 'latest';
    else if (path === '' || path.endsWith('index.html')) pageType = 'latest';
    else pageType = 'financials';

    switch (pageType) {
        case 'portfolio': setupPortfolioSearch(); break;
        case 'financials': setupIndicatorSearch(); break;
        case 'media': setupMediaSearch(); break;
        case 'essays': setupEssaySearch(); break;
        case 'journal': setupJournalSearch(); break;
        case 'latest': setupLatestItemsSearch(); break;
        default: setupIndicatorSearch();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchForPage);
} else {
    initSearchForPage();
}
