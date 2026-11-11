// Journal Filter Bar Logic
// Handles 2-tier categorization: Macro Pillars and Cross-Cutting Tags
(function() {
    'use strict';

    // 5 Core Editorial Pillars
    const PILLARS = [
        { id: 'all', name: 'All', icon: '<i data-lucide="list" class="filter-icon"></i>' },
        { id: 'economy', name: 'Economy', icon: '<i data-lucide="trending-up" class="filter-icon"></i>' },
        { id: 'policy', name: 'Policy', icon: '<i data-lucide="landmark" class="filter-icon"></i>' },
        { id: 'trade', name: 'Trade', icon: '<i data-lucide="ship" class="filter-icon"></i>' },
        { id: 'society', name: 'Society', icon: '<i data-lucide="users" class="filter-icon"></i>' },
        { id: 'dispatches', name: 'Dispatches', icon: '<i data-lucide="book-open" class="filter-icon"></i>' }
    ];

    let currentCategory = 'all';
    let currentTag = null;
    let currentSearchQuery = '';

    function syncURL() {
        const url = new URL(window.location);
        if (currentCategory && currentCategory !== 'all') {
            url.searchParams.set('category', currentCategory);
        } else {
            url.searchParams.delete('category');
        }
        if (currentTag) {
            url.searchParams.set('tag', currentTag);
        } else {
            url.searchParams.delete('tag');
        }
        if (currentSearchQuery) {
            url.searchParams.set('search', currentSearchQuery);
        } else {
            url.searchParams.delete('search');
        }
        window.history.replaceState({}, '', url);
    }

    function readURL() {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('category') || params.get('filter');
        const tag = params.get('tag');
        const search = params.get('search');

        if (cat && PILLARS.some(p => p.id === cat)) {
            currentCategory = cat;
        }
        if (tag) {
            currentTag = tag;
        }
        if (search) {
            currentSearchQuery = search;
        }
    }

    function updateActiveTagUI() {
        const bar = document.getElementById('activeFilterBar');
        const text = document.getElementById('activeTagText');
        if (!bar || !text) return;

        if (currentTag) {
            text.textContent = '#' + currentTag;
            bar.style.display = 'flex';
        } else {
            bar.style.display = 'none';
        }

        document.querySelectorAll('.entry-tag-chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.tag === currentTag);
        });
    }

    function filterJournalEntries() {
        const daySections = document.querySelectorAll('.day');
        let totalEntries = 0;
        let matchingEntries = 0;

        daySections.forEach(daySection => {
            const entries = daySection.querySelectorAll('.entry');
            let hasVisibleEntries = false;

            entries.forEach(entry => {
                totalEntries++;
                const entryCategory = entry.dataset.category || '';
                const entryTags = (entry.dataset.tags || '').split(',').filter(Boolean);
                const title = entry.querySelector('.entry-title')?.textContent.toLowerCase() || '';
                const content = entry.querySelector('.entry-content')?.textContent.toLowerCase() || '';

                // 1. Pillar match
                const matchesCategory = currentCategory === 'all' || entryCategory === currentCategory;

                // 2. Tag match
                const matchesTag = !currentTag || entryTags.includes(currentTag);

                // 3. Search match
                let matchesSearch = true;
                if (currentSearchQuery) {
                    const query = currentSearchQuery.toLowerCase();
                    matchesSearch = title.includes(query) || content.includes(query);
                }

                const isMatch = matchesCategory && matchesTag && matchesSearch;
                entry.style.display = isMatch ? '' : 'none';
                if (isMatch) {
                    matchingEntries++;
                    hasVisibleEntries = true;
                }
            });

            daySection.style.display = hasVisibleEntries ? '' : 'none';
        });

        // Update empty state and search results count
        const emptyEl = document.getElementById('empty');
        const loadMoreBtn = document.getElementById('load-more');
        const hasVisibleEntries = matchingEntries > 0;

        if (emptyEl) {
            if (currentCategory !== 'all' || currentTag || currentSearchQuery) {
                emptyEl.textContent = `No entries found matching your criteria (${totalEntries} total entries)`;
            } else {
                emptyEl.textContent = 'No entries found.';
            }
            emptyEl.style.display = hasVisibleEntries ? 'none' : 'block';
        }

        if (loadMoreBtn && currentCategory === 'all' && !currentTag && !currentSearchQuery) {
            loadMoreBtn.style.display = hasVisibleEntries ? '' : 'none';
        }

        // Auto load more if filtering and more entries exist.
        // Keep loading until all entries are exhausted so matches spread
        // across paginated days are all visible, not just those in the first batch.
        const isFiltered = currentCategory !== 'all' || currentTag || currentSearchQuery;
        if (isFiltered && loadMoreBtn && loadMoreBtn.style.display !== 'none') {
            const loadUntilExhausted = () => {
                if (loadMoreBtn && loadMoreBtn.style.display !== 'none') {
                    loadMoreBtn.click();
                    setTimeout(() => {
                        filterJournalEntries();
                    }, 150);
                }
            };
            loadUntilExhausted();
        }

        updateActiveTagUI();
        syncURL();
    }

    function createFilterBtn(id, icon, text) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `filter-btn ${id === currentCategory ? 'active' : ''}`;
        btn.dataset.category = id;
        btn.setAttribute('aria-label', `Filter by ${text}`);
        btn.innerHTML = `${icon}<span class="filter-text">${text}</span>`;
        return btn;
    }

    function setupJournalFilters() {
        const filtersContainer = document.getElementById('journal-filters');
        if (!filtersContainer) return;

        const buttonsContainer = filtersContainer.querySelector('.filters');
        if (!buttonsContainer) return;

        buttonsContainer.innerHTML = '';

        PILLARS.forEach(pillar => {
            const btn = createFilterBtn(pillar.id, pillar.icon, pillar.name);
            buttonsContainer.appendChild(btn);
        });

        // Add search button to filter bar (separate from PILLARS)
        const searchToggleBtn = createFilterBtn('search', '<i data-lucide="search" class="filter-icon"></i>', 'Search');
        searchToggleBtn.dataset.category = 'search';
        buttonsContainer.appendChild(searchToggleBtn);

        // Primary pillar button click
        buttonsContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;

            const category = btn.dataset.category;

            // Handle search button separately
            if (category === 'search') {
                return; // Search button has its own handler
            }

            buttonsContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentCategory = category;

            filterJournalEntries();

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });

        // Active tag dismiss button
        const clearTagBtn = document.getElementById('clearActiveTagBtn');
        if (clearTagBtn) {
            clearTagBtn.addEventListener('click', function() {
                currentTag = null;
                filterJournalEntries();
            });
        }

        // Search input setup
        const searchBar = document.getElementById('searchBar');
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');

        if (searchBar && searchInput && clearSearchBtn) {
            // Show search bar if there's a search query in URL
            if (currentSearchQuery) {
                searchBar.style.display = 'flex';
                searchInput.value = currentSearchQuery;
                clearSearchBtn.classList.add('is-visible');
                searchToggleBtn.classList.add('active');
            }

            // Search toggle button click
            searchToggleBtn.addEventListener('click', function() {
                const isSearchActive = searchBar.style.display === 'flex';
                if (isSearchActive) {
                    searchBar.style.display = 'none';
                    currentSearchQuery = '';
                    searchInput.value = '';
                    clearSearchBtn.classList.remove('is-visible');
                    searchToggleBtn.classList.remove('active');
                } else {
                    searchBar.style.display = 'flex';
                    searchInput.focus();
                    searchToggleBtn.classList.add('active');
                }
                filterJournalEntries();
            });

            // Search input typing
            searchInput.addEventListener('input', function() {
                currentSearchQuery = this.value.trim();
                clearSearchBtn.classList.toggle('is-visible', currentSearchQuery.length > 0);
                filterJournalEntries();
            });

            // Clear search button
            clearSearchBtn.addEventListener('click', function() {
                currentSearchQuery = '';
                searchInput.value = '';
                clearSearchBtn.classList.remove('is-visible');
                searchToggleBtn.classList.remove('active');
                filterJournalEntries();
            });

            // Search on Enter key
            searchInput.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    searchBar.style.display = 'none';
                    currentSearchQuery = '';
                    searchInput.value = '';
                    clearSearchBtn.classList.remove('is-visible');
                    searchToggleBtn.classList.remove('active');
                    filterJournalEntries();
                }
            });
        }

        // Feed tag chips click listener (delegated)
        const feed = document.getElementById('feed');
        if (feed) {
            feed.addEventListener('click', function(e) {
                const chip = e.target.closest('.entry-tag-chip');
                if (!chip) return;

                e.preventDefault();
                e.stopPropagation();

                const tag = chip.dataset.tag;
                if (currentTag === tag) {
                    currentTag = null; // Toggle off if clicked again
                } else {
                    currentTag = tag;
                }

                filterJournalEntries();

                // Smooth scroll to top of feed
                const filtersEl = document.getElementById('journal-filters');
                if (filtersEl) {
                    filtersEl.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }

        filterJournalEntries();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }


    async function initJournalFilters() {
        try {
            readURL();
            
            // Set up filters immediately like media.js and filters.js do
            // Don't wait for content - just ensure the DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setupJournalFilters();
                });
            } else {
                setupJournalFilters();
            }
        } catch (error) {
            console.error('Failed to initialize journal filters:', error);
        }
    }

    initJournalFilters();

    window.filterJournalEntries = filterJournalEntries;
})();
