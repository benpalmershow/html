// Journal Filter Bar Logic
// Handles category filtering for journal entries based on frontmatter categories
// Follows the same pattern as financials filters.js

(function() {
    'use strict';

    let currentCategory = 'all';

    // Category icons mapping
    const categoryIcons = {
        'business': '<i data-lucide="briefcase" class="filter-icon"></i>',
        'consumer': '<i data-lucide="shopping-cart" class="filter-icon"></i>',
        'corrections': '<i data-lucide="alert-triangle" class="filter-icon"></i>',
        'docs': '<i data-lucide="file-text" class="filter-icon"></i>',
        'earnings': '<i data-lucide="circle-dollar-sign" class="filter-icon"></i>',
        'economic': '<i data-lucide="trending-up" class="filter-icon"></i>',
        'employment': '<i data-lucide="users" class="filter-icon"></i>',
        'government': '<i data-lucide="landmark" class="filter-icon"></i>',
        'healthcare': '<i data-lucide="heart-pulse" class="filter-icon"></i>',
        'housing': '<i data-lucide="home" class="filter-icon"></i>',
        'ipo': '<i data-lucide="rocket" class="filter-icon"></i>',
        'journal': '<i data-lucide="book-open" class="filter-icon"></i>',
        'legal': '<i data-lucide="scale" class="filter-icon"></i>',
        'media': '<i data-lucide="play-circle" class="filter-icon"></i>',
        'poem': '<i data-lucide="feather" class="filter-icon"></i>',
        'policy': '<i data-lucide="scroll" class="filter-icon"></i>',
        'political': '<i data-lucide="vote" class="filter-icon"></i>',
        'prediction': '<i data-lucide="target" class="filter-icon"></i>',
        'trade': '<i data-lucide="ship" class="filter-icon"></i>'
    };

    // Extract unique categories from journal data
    function extractCategories(data) {
        const categories = new Set();
        data.forEach(day => {
            (day.entries || []).forEach(entry => {
                if (entry.category) {
                    categories.add(entry.category);
                }
            });
        });
        return Array.from(categories).sort();
    }

    // Create filter button
    function createFilterBtn(id, icon, text, isLatest = false) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `filter-btn ${id === 'all' ? 'active' : ''}`;
        btn.dataset.category = id;
        if (isLatest) btn.dataset.isLatest = 'true';
        btn.setAttribute('aria-label', `Filter by ${text}`);
        btn.innerHTML = `${icon}<span class="filter-text">${text}</span>`;
        return btn;
    }

    // Filter journal entries by category
    function filterJournalEntries(category) {
        currentCategory = category;

        // Get all day sections
        const daySections = document.querySelectorAll('.day');

        let totalEntries = 0;
        let matchingEntries = 0;

        daySections.forEach(daySection => {
            const entries = daySection.querySelectorAll('.entry');
            let hasVisibleEntries = false;

            entries.forEach(entry => {
                totalEntries++;
                const entryCategory = entry.dataset.category;
                const matchesCategory = category === 'all' || category === 'latest' || entryCategory === category;
                if (matchesCategory) matchingEntries++;
                entry.style.display = matchesCategory ? '' : 'none';
                if (matchesCategory) hasVisibleEntries = true;
            });

            // Hide entire day if no visible entries
            daySection.style.display = hasVisibleEntries ? '' : 'none';
        });

        // Update empty state
        const emptyEl = document.getElementById('empty');
        const loadMoreBtn = document.getElementById('load-more');
        const hasVisibleEntries = matchingEntries > 0;

        if (emptyEl) {
            emptyEl.style.display = hasVisibleEntries ? 'none' : 'block';
        }

        // Don't hide load more button when filtering - we need it to load more entries
        // Only hide it when all entries are actually loaded (when the button naturally disappears)
        if (loadMoreBtn && (category === 'all' || category === 'latest')) {
            loadMoreBtn.style.display = hasVisibleEntries ? '' : 'none';
        }

        // If no matching entries and load more button exists, keep loading until found or exhausted
        if (!hasVisibleEntries && loadMoreBtn && loadMoreBtn.style.display !== 'none' && category !== 'all' && category !== 'latest') {
            const loadUntilFound = () => {
                if (loadMoreBtn && loadMoreBtn.style.display !== 'none') {
                    loadMoreBtn.click();
                    setTimeout(() => {
                        // Check if we now have matching entries by re-running the filter check
                        const nowHasMatching = Array.from(document.querySelectorAll('.entry')).some(entry => {
                            const entryCategory = entry.dataset.category;
                            return entryCategory === category;
                        });
                        if (!nowHasMatching) {
                            loadUntilFound();
                        } else {
                            // Found entries, re-apply filter
                            filterJournalEntries(category);
                        }
                    }, 200);
                }
            };
            loadUntilFound();
        }
    }

    // Setup filter buttons
    function setupJournalFilters(data) {
        const filtersContainer = document.getElementById('journal-filters');
        if (!filtersContainer) return;

        const buttonsContainer = filtersContainer.querySelector('.filters');
        if (!buttonsContainer) return;

        buttonsContainer.innerHTML = '';

        const categories = extractCategories(data);

        // Create "All" button
        const allBtn = createFilterBtn('all', '<i data-lucide="list" class="filter-icon"></i>', 'All');
        buttonsContainer.appendChild(allBtn);

        // Create "Latest" button
        const latestBtn = createFilterBtn('latest', '<i data-lucide="clock" class="filter-icon"></i>', 'Latest', true);
        buttonsContainer.appendChild(latestBtn);

        // Create category buttons (exclude 'docs')
        categories.forEach(category => {
            if (category === 'docs') return; // Skip docs category
            const icon = categoryIcons[category] || '<i data-lucide="tag" class="filter-icon"></i>';
            const btn = createFilterBtn(category, icon, category.charAt(0).toUpperCase() + category.slice(1));
            buttonsContainer.appendChild(btn);
        });

        // Event delegation for filter clicks
        buttonsContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;

            buttonsContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.dataset.category;
            filterJournalEntries(category);
        });

        // Initialize Lucide icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Setup search functionality
    function setupSearch() {
        const searchToggle = document.getElementById('searchToggle');
        const filterBar = document.getElementById('journal-filters');
        const searchInput = document.getElementById('journalSearch');

        if (!searchToggle || !filterBar || !searchInput) return;

        searchToggle.addEventListener('click', () => {
            filterBar.classList.toggle('search-open');
            if (filterBar.classList.contains('search-open')) {
                searchInput.focus();
            }
        });

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();

            const daySections = document.querySelectorAll('.day');

            daySections.forEach(daySection => {
                const entries = daySection.querySelectorAll('.entry');
                let hasVisibleEntries = false;

                entries.forEach(entry => {
                    const title = entry.querySelector('.entry-title')?.textContent.toLowerCase() || '';
                    const content = entry.querySelector('.entry-content')?.textContent.toLowerCase() || '';
                    const entryCategory = entry.dataset.category || '';

                    const matchesSearch = query === '' || title.includes(query) || content.includes(query) || entryCategory.includes(query);
                    entry.style.display = matchesSearch ? '' : 'none';
                    if (matchesSearch) hasVisibleEntries = true;
                });

                daySection.style.display = hasVisibleEntries ? '' : 'none';
            });

            // Update empty state
            const emptyEl = document.getElementById('empty');
            const hasVisibleEntries = document.querySelectorAll('.day[style=""], .day:not([style])').length > 0;

            if (emptyEl) {
                emptyEl.style.display = hasVisibleEntries ? 'none' : 'block';
            }
        });

        // Close search on escape
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                filterBar.classList.remove('search-open');
                searchInput.value = '';
                filterJournalEntries(currentCategory);
            }
        });
    }

    // Initialize journal filters
    async function initJournalFilters() {
        try {
            const response = await fetch('json/journal.json');
            const journalData = await response.json();

            // Wait for DOM to be ready and journal entries to be rendered
            const waitForJournal = () => {
                const feed = document.getElementById('feed');
                if (feed && feed.children.length > 0) {
                    setupJournalFilters(journalData);
                    setupSearch();
                } else {
                    setTimeout(waitForJournal, 100);
                }
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', waitForJournal);
            } else {
                waitForJournal();
            }
        } catch (error) {
            console.error('Failed to load journal data for filters:', error);
        }
    }

    // Start initialization
    initJournalFilters();

})();