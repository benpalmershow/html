// Journal Filter Bar Logic
// Handles categorization: All, media type filters, tags, and search
(function() {
    'use strict';

    const PILLARS = [
        { id: 'all', name: 'DOCS', icon: '<i data-lucide="notebook" class="filter-icon"></i>' }
    ];

    const MEDIA_FILTERS = [
        { id: 'movie', name: 'Movies', icon: '<i data-lucide="film" class="filter-icon"></i>', tags: ['movie', 'film'] },
        { id: 'book', name: 'Books', icon: '<i data-lucide="book" class="filter-icon"></i>', tags: ['book', 'books'] },
        { id: 'podcast', name: 'Podcasts', icon: '<i data-lucide="mic" class="filter-icon"></i>', tags: ['podcast'] },
        { id: 'song', name: 'Music', icon: '<i data-lucide="music" class="filter-icon"></i>', tags: ['song', 'music'] },
        { id: 'video', name: 'Videos', icon: '<i data-lucide="video" class="filter-icon"></i>', tags: ['video'] }
    ];

    const MEDIA_TAG_SETS = MEDIA_FILTERS.reduce((acc, filter) => {
        acc[filter.id] = new Set(filter.tags.map(normalizeTag));
        return acc;
    }, {});
    const MEDIA_IDS = new Set(MEDIA_FILTERS.map(filter => filter.id));

    let currentCategory = 'all';
    let currentTag = null;
    let currentTagKey = '';
    let currentSearchQuery = '';
    let searchTimer = null;
    let appReady = false;
    let categoryCounts = Object.create(null);
    let searchToggleBtn = null;

    function normalizeTag(tag) {
        return String(tag || '').trim().toLowerCase();
    }

    function getApp() {
        return window.journalApp || null;
    }

    function getEntryTags(entry) {
        const app = getApp();
        if (app && typeof app.getEntryTags === 'function') {
            return app.getEntryTags(entry) || [];
        }
        return Array.isArray(entry.tags) ? entry.tags.slice() : [];
    }

    function entryTagKeys(entry) {
        return getEntryTags(entry).map(normalizeTag).filter(Boolean);
    }

    function syncURL() {
        const url = new URL(window.location);
        if (currentCategory && currentCategory !== 'all') {
            url.searchParams.set('media', currentCategory);
        } else {
            url.searchParams.delete('media');
        }
        url.searchParams.delete('category');
        url.searchParams.delete('filter');
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
        const cat = params.get('media') || params.get('category') || params.get('filter');

        if (cat && (cat === 'all' || MEDIA_IDS.has(cat))) {
            currentCategory = cat;
        } else {
            currentCategory = 'all';
        }
        currentTag = null;
        currentTagKey = '';
        currentSearchQuery = '';
    }

    function updateActiveTagUI() {
        const bar = document.getElementById('activeFilterBar');
        const text = document.getElementById('activeTagText');
        if (!bar || !text) return;

        if (currentTag) {
            text.textContent = '#' + currentTag;
            bar.hidden = false;
        } else {
            bar.hidden = true;
        }

        document.querySelectorAll('.entry-tag-chip').forEach(chip => {
            chip.classList.toggle('active', normalizeTag(chip.dataset.tag) === currentTagKey);
        });
    }

    function computeCategoryCounts() {
        const app = getApp();
        const days = app && typeof app.getDays === 'function' ? app.getDays() : [];
        categoryCounts = { all: 0 };
        MEDIA_FILTERS.forEach(filter => { categoryCounts[filter.id] = 0; });

        days.forEach(day => {
            (day.entries || []).forEach(entry => {
                categoryCounts.all += 1;
                const tagSet = new Set(entryTagKeys(entry));
                MEDIA_FILTERS.forEach(filter => {
                    const matchSet = MEDIA_TAG_SETS[filter.id];
                    for (const tag of tagSet) {
                        if (matchSet.has(tag)) {
                            categoryCounts[filter.id] += 1;
                            break;
                        }
                    }
                });
            });
        });
    }

    function matchesCategory(entryTags, categoryId) {
        if (!categoryId || categoryId === 'all') return true;
        const matchSet = MEDIA_TAG_SETS[categoryId];
        if (!matchSet) return false;
        return entryTags.some(tag => matchSet.has(tag));
    }

    function buildHaystack(entry, tags, searchIndex) {
        const file = entry.file || '';
        const indexed = file && searchIndex[file] ? searchIndex[file] : '';
        return [
            entry.title || '',
            entry.content || '',
            file,
            tags.join(' '),
            indexed
        ].join(' ').toLowerCase();
    }

    function filterJournalEntries(options) {
        const opts = options || {};
        const app = getApp();
        if (!app || !appReady) return;

        const days = app.getDays ? app.getDays() : [];
        const searchIndex = app.getSearchIndex ? app.getSearchIndex() : (window.journalSearchIndex || {});
        const hasFilters = currentCategory !== 'all' || !!currentTagKey || !!currentSearchQuery;
        const query = currentSearchQuery.toLowerCase();
        const totalEntries = app.getTotalEntries ? app.getTotalEntries() : 0;

        if (!hasFilters) {
            app.renderDefault();
            app.setEmptyMessage('No entries found.');
            updateActiveTagUI();
            syncURL();
            updateSearchUI();
            return;
        }

        let matchingEntries = 0;
        const filteredDays = [];

        days.forEach(day => {
            const matchedEntries = (day.entries || []).filter(entry => {
                const tags = getEntryTags(entry);
                const tagKeys = tags.map(normalizeTag).filter(Boolean);
                if (!matchesCategory(tagKeys, currentCategory)) return false;
                if (currentTagKey && !tagKeys.includes(currentTagKey)) return false;
                if (query) {
                    const haystack = buildHaystack(entry, tags, searchIndex);
                    if (!haystack.includes(query)) return false;
                }
                matchingEntries += 1;
                return true;
            });
            if (matchedEntries.length) {
                filteredDays.push({ date: day.date, entries: matchedEntries });
            }
        });

        app.renderFiltered(filteredDays, {
            matchingEntries,
            totalEntries,
            scrollToFilters: !!opts.scrollToFilters
        });
        updateActiveTagUI();
        syncURL();
        updateSearchUI();
    }

    function createFilterBtn(id, icon, text, count) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'filter-btn' + (id === currentCategory ? ' active' : '');
        btn.dataset.category = id;
        const label = typeof count === 'number' ? `${text} (${count})` : text;
        btn.setAttribute('aria-label', label);
        btn.setAttribute('aria-pressed', id === currentCategory ? 'true' : 'false');
        btn.title = label;
        btn.innerHTML = `${icon}<span class="filter-text">${text}</span>`;
        return btn;
    }

    function updateFilterButtonStates() {
        const container = document.getElementById('filter-buttons');
        if (!container) return;
        container.querySelectorAll('.filter-btn[data-category]').forEach(btn => {
            const id = btn.dataset.category;
            if (id === 'search') {
                const active = isSearchOpen();
                btn.classList.toggle('active', active);
                btn.setAttribute('aria-pressed', active ? 'true' : 'false');
                btn.setAttribute('aria-expanded', active ? 'true' : 'false');
                return;
            }
            const active = id === currentCategory;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
    }

    function isSearchOpen() {
        const searchBar = document.getElementById('searchBar');
        return !!(searchBar && !searchBar.hidden);
    }

    function updateSearchUI() {
        const searchBar = document.getElementById('searchBar');
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');
        if (!searchBar || !searchInput || !clearSearchBtn) return;
        searchInput.value = currentSearchQuery;
        if (!currentSearchQuery && !isSearchOpen()) {
            searchBar.hidden = true;
        }
        clearSearchBtn.classList.toggle('is-visible', currentSearchQuery.length > 0);
        if (searchToggleBtn) {
            const open = isSearchOpen();
            searchToggleBtn.classList.toggle('active', open);
            searchToggleBtn.setAttribute('aria-pressed', open ? 'true' : 'false');
            searchToggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            searchToggleBtn.setAttribute('aria-controls', 'searchBar');
        }
    }

    function ensureSearchIndexLoaded() {
        if (window.loadJournalSearchIndex) {
            window.loadJournalSearchIndex().then(() => filterJournalEntries());
        }
    }

    function setupJournalFilters() {
        const filtersContainer = document.getElementById('journal-filters');
        if (!filtersContainer) return;

        const buttonsContainer = filtersContainer.querySelector('.filters');
        if (!buttonsContainer) return;

        computeCategoryCounts();
        buttonsContainer.innerHTML = '';

        PILLARS.forEach(pillar => {
            buttonsContainer.appendChild(createFilterBtn(pillar.id, pillar.icon, pillar.name, categoryCounts.all));
        });

        MEDIA_FILTERS.forEach(filter => {
            const count = categoryCounts[filter.id] || 0;
            if (count === 0) return;
            buttonsContainer.appendChild(createFilterBtn(filter.id, filter.icon, filter.name, count));
        });

        searchToggleBtn = createFilterBtn('search', '<i data-lucide="search" class="filter-icon"></i>', 'Search');
        searchToggleBtn.dataset.category = 'search';
        searchToggleBtn.setAttribute('aria-expanded', 'false');
        searchToggleBtn.setAttribute('aria-controls', 'searchBar');
        buttonsContainer.appendChild(searchToggleBtn);

        buttonsContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;

            const category = btn.dataset.category;
            if (category === 'search') return;

            currentCategory = category;
            currentTag = null;
            currentTagKey = '';
            currentSearchQuery = '';
            clearTimeout(searchTimer);

            const searchBar = document.getElementById('searchBar');
            const searchInput = document.getElementById('searchInput');
            const clearSearchBtn = document.getElementById('clearSearchBtn');
            if (searchBar) searchBar.hidden = true;
            if (searchInput) searchInput.value = '';
            if (clearSearchBtn) clearSearchBtn.classList.remove('is-visible');

            updateFilterButtonStates();
            updateSearchUI();
            filterJournalEntries();

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });

        const clearTagBtn = document.getElementById('clearActiveTagBtn');
        if (clearTagBtn) {
            clearTagBtn.addEventListener('click', function() {
                currentTag = null;
                currentTagKey = '';
                filterJournalEntries();
            });
        }

        const searchBar = document.getElementById('searchBar');
        const searchInput = document.getElementById('searchInput');
        const clearSearchBtn = document.getElementById('clearSearchBtn');

        if (searchBar && searchInput && clearSearchBtn) {
            if (currentSearchQuery) {
                searchBar.hidden = false;
                searchInput.value = currentSearchQuery;
                ensureSearchIndexLoaded();
            }

            searchToggleBtn.addEventListener('click', function() {
                const open = !isSearchOpen();
                if (!open) {
                    searchBar.hidden = true;
                    currentSearchQuery = '';
                    searchInput.value = '';
                } else {
                    searchBar.hidden = false;
                    searchInput.focus();
                    if (currentSearchQuery) ensureSearchIndexLoaded();
                }
                filterJournalEntries();
            });

            searchInput.addEventListener('input', function() {
                currentSearchQuery = this.value.trim();
                clearSearchBtn.classList.toggle('is-visible', currentSearchQuery.length > 0);
                clearTimeout(searchTimer);
                searchTimer = setTimeout(filterJournalEntries, 180);
                if (currentSearchQuery) ensureSearchIndexLoaded();
            });

            clearSearchBtn.addEventListener('click', function() {
                currentSearchQuery = '';
                searchInput.value = '';
                clearSearchBtn.classList.remove('is-visible');
                if (!isSearchOpen()) {
                    filterJournalEntries();
                    return;
                }
                searchInput.focus();
                filterJournalEntries();
            });

            searchInput.addEventListener('keydown', function(e) {
                if (e.isComposing) return;
                if (e.key === 'Escape') {
                    searchBar.hidden = true;
                    currentSearchQuery = '';
                    searchInput.value = '';
                    filterJournalEntries();
                }
            });
        }

        const feed = document.getElementById('feed');
        if (feed) {
            feed.addEventListener('click', function(e) {
                const chip = e.target.closest('.entry-tag-chip');
                if (!chip) return;

                e.preventDefault();
                e.stopPropagation();

                const tag = chip.dataset.tag || '';
                const tagKey = normalizeTag(tag);
                if (currentTagKey && currentTagKey === tagKey) {
                    currentTag = null;
                    currentTagKey = '';
                } else {
                    currentTag = tag;
                    currentTagKey = tagKey;
                }

                filterJournalEntries({ scrollToFilters: true });
            });
        }

        updateFilterButtonStates();
        updateSearchUI();
        filterJournalEntries();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    function initJournalFilters() {
        try {
            const app = getApp();
            if (!app) return;
            appReady = true;
            readURL();
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', setupJournalFilters, { once: true });
            } else {
                setupJournalFilters();
            }
        } catch (error) {
            console.error('Failed to initialize journal filters:', error);
        }
    }

    window.addEventListener('popstate', function() {
        if (!appReady) return;
        readURL();
        if (currentSearchQuery) ensureSearchIndexLoaded();
        updateFilterButtonStates();
        updateSearchUI();
        filterJournalEntries();
    });

    window.initJournalFilters = initJournalFilters;
    window.filterJournalEntries = filterJournalEntries;
})();
