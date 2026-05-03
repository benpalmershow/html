// Search functionality - standalone for use across pages
// This module provides search functionality for filtering content
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

            // Hide featured section if no results anywhere
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

    let debounceTimer;
    searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        const query = this.value.trim().toLowerCase();
        debounceTimer = setTimeout(() => {
            const entries = document.querySelectorAll('.journal-entry, .entry');

            if (!query) {
                entries.forEach(entry => entry.style.display = '');
                return;
            }

            entries.forEach(entry => {
                const titleEl = entry.querySelector('.entry-title, .journal-entry-title');
                const contentEl = entry.querySelector('.entry-content, .journal-entry-content');
                const title = (titleEl?.textContent || '').toLowerCase();
                const content = (contentEl?.textContent || '').toLowerCase();
                entry.style.display = (title.includes(query) || content.includes(query)) ? '' : 'none';
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

// Auto-detect page type and initialize appropriate search
function initSearchForPage() {
    const searchInput = document.getElementById('indicatorSearch');
    if (!searchInput) return;

    // Portfolio page
    if (document.getElementById('portfolio-comparison-table')) {
        setupPortfolioSearch();
        return;
    }

    // Financials page (indicators with categories)
    if (document.querySelector('.category .indicator')) {
        setupIndicatorSearch();
        return;
    }

    // Media page
    if (document.querySelector('.media-card')) {
        setupMediaSearch();
        return;
    }

    // Essays/News page (essay cards)
    if (document.querySelector('.essay-card')) {
        setupEssaySearch();
        return;
    }

    // Journal page (journal entries)
    if (document.querySelector('.journal-entry, .entry')) {
        setupJournalSearch();
        return;
    }

    // Index or One-pager (latest items lists)
    if (document.querySelector('#latest-journal, #latest-essays, #latest-media, #latest-financials')) {
        setupLatestItemsSearch();
        return;
    }

    // Fallback to indicator search (no-op if no indicators)
    setupIndicatorSearch();
}

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearchForPage);
} else {
    initSearchForPage();
}
