// Journal Filter Bar Logic
// Handles 3-tier categorization: Macro Pillars, Subcategories, and Cross-Cutting Tags
(function() {
    'use strict';

    // 5 Core Editorial Pillars
    const PILLARS = [
        { id: 'all', name: 'All', icon: '<i data-lucide="list" class="filter-icon"></i>' },
        { id: 'latest', name: 'Latest', icon: '<i data-lucide="clock" class="filter-icon"></i>', isLatest: true },
        { id: 'economy', name: 'Economy & Markets', icon: '<i data-lucide="trending-up" class="filter-icon"></i>' },
        { id: 'policy', name: 'State & Law', icon: '<i data-lucide="landmark" class="filter-icon"></i>' },
        { id: 'trade', name: 'Trade & Industry', icon: '<i data-lucide="ship" class="filter-icon"></i>' },
        { id: 'society', name: 'Living & Society', icon: '<i data-lucide="users" class="filter-icon"></i>' },
        { id: 'dispatches', name: 'Dispatches & Culture', icon: '<i data-lucide="book-open" class="filter-icon"></i>' }
    ];

    // Curated Subcategories per Pillar
    const SUBCATEGORIES = {
        'economy': [
            { id: 'all', name: 'All' },
            { id: 'indicators', name: 'Indicators' },
            { id: 'markets', name: 'Markets' },
            { id: 'corporate', name: 'Corporate & 13F' },
            { id: 'labor', name: 'Labor' }
        ],
        'policy': [
            { id: 'all', name: 'All' },
            { id: 'fiscal', name: 'Fiscal & Debt' },
            { id: 'legal', name: 'Legal & Courts' },
            { id: 'politics', name: 'Politics' },
            { id: 'regulatory', name: 'Regulatory' }
        ],
        'trade': [
            { id: 'all', name: 'All' },
            { id: 'tariffs', name: 'Tariffs' },
            { id: 'supply-chains', name: 'Supply Chains' },
            { id: 'manufacturing', name: 'Manufacturing' },
            { id: 'energy', name: 'Energy' }
        ],
        'society': [
            { id: 'all', name: 'All' },
            { id: 'housing', name: 'Housing' },
            { id: 'healthcare', name: 'Healthcare' },
            { id: 'digital-life', name: 'Digital Life' }
        ],
        'dispatches': [
            { id: 'all', name: 'All' },
            { id: 'personal', name: 'Personal' },
            { id: 'curation', name: 'Media Curation' },
            { id: 'verse', name: 'Verse' },
            { id: 'critique', name: 'Critique' }
        ]
    };

    let currentCategory = 'all';
    let currentSubcategory = 'all';
    let currentTag = null;
    let currentSearch = '';

    function syncURL() {
        const url = new URL(window.location);
        if (currentCategory && currentCategory !== 'all') {
            url.searchParams.set('category', currentCategory);
        } else {
            url.searchParams.delete('category');
        }
        if (currentSubcategory && currentSubcategory !== 'all') {
            url.searchParams.set('sub', currentSubcategory);
        } else {
            url.searchParams.delete('sub');
        }
        if (currentTag) {
            url.searchParams.set('tag', currentTag);
        } else {
            url.searchParams.delete('tag');
        }
        window.history.replaceState({}, '', url);
    }

    function readURL() {
        const params = new URLSearchParams(window.location.search);
        const cat = params.get('category') || params.get('filter');
        const sub = params.get('sub');
        const tag = params.get('tag');

        if (cat && (cat === 'latest' || SUBCATEGORIES[cat])) {
            currentCategory = cat;
        }
        if (sub) {
            currentSubcategory = sub;
        }
        if (tag) {
            currentTag = tag;
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

    function updateSubcategoryUI() {
        const subBar = document.getElementById('subFilterBar');
        const subContainer = document.getElementById('subFilterButtons');
        if (!subBar || !subContainer) return;

        if (currentCategory === 'all' || currentCategory === 'latest' || !SUBCATEGORIES[currentCategory]) {
            subBar.style.display = 'none';
            subContainer.innerHTML = '';
            currentSubcategory = 'all';
            return;
        }

        const subcats = SUBCATEGORIES[currentCategory];
        subContainer.innerHTML = '';

        subcats.forEach(sub => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `sub-filter-btn ${currentSubcategory === sub.id ? 'active' : ''}`;
            btn.dataset.sub = sub.id;
            btn.textContent = sub.name;
            subContainer.appendChild(btn);
        });

        subBar.style.display = 'flex';
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
                const entrySubcategory = entry.dataset.subcategory || '';
                const entryTags = (entry.dataset.tags || '').split(' ').filter(Boolean);
                const title = entry.querySelector('.entry-title')?.textContent.toLowerCase() || '';
                const content = entry.querySelector('.entry-content')?.textContent.toLowerCase() || '';

                // 1. Pillar match
                const matchesCategory = currentCategory === 'all' || currentCategory === 'latest' || entryCategory === currentCategory;

                // 2. Subcategory match
                const matchesSubcategory = currentSubcategory === 'all' || entrySubcategory === currentSubcategory;

                // 3. Tag match
                const matchesTag = !currentTag || entryTags.includes(currentTag);

                // 4. Search match
                let matchesSearch = true;
                if (currentSearch) {
                    const q = currentSearch.toLowerCase().trim();
                    if (q.startsWith('#')) {
                        const tagQuery = q.slice(1);
                        matchesSearch = entryTags.some(t => t.toLowerCase().includes(tagQuery));
                    } else {
                        matchesSearch = title.includes(q) ||
                                        content.includes(q) ||
                                        entryCategory.includes(q) ||
                                        entrySubcategory.includes(q) ||
                                        entryTags.some(t => t.toLowerCase().includes(q));
                    }
                }

                const isMatch = matchesCategory && matchesSubcategory && matchesTag && matchesSearch;
                entry.style.display = isMatch ? '' : 'none';
                if (isMatch) {
                    matchingEntries++;
                    hasVisibleEntries = true;
                }
            });

            daySection.style.display = hasVisibleEntries ? '' : 'none';
        });

        // Update empty state
        const emptyEl = document.getElementById('empty');
        const loadMoreBtn = document.getElementById('load-more');
        const hasVisibleEntries = matchingEntries > 0;

        if (emptyEl) {
            emptyEl.style.display = hasVisibleEntries ? 'none' : 'block';
        }

        if (loadMoreBtn && (currentCategory === 'all' || currentCategory === 'latest') && !currentTag && !currentSearch) {
            loadMoreBtn.style.display = hasVisibleEntries ? '' : 'none';
        }

        // Auto load more if no matches in current view and more entries exist
        const isFiltered = currentCategory !== 'all' || currentSubcategory !== 'all' || currentTag || currentSearch;
        if (!hasVisibleEntries && loadMoreBtn && loadMoreBtn.style.display !== 'none' && isFiltered) {
            const loadUntilFound = () => {
                if (loadMoreBtn && loadMoreBtn.style.display !== 'none') {
                    loadMoreBtn.click();
                    setTimeout(() => {
                        filterJournalEntries();
                    }, 150);
                }
            };
            loadUntilFound();
        }

        updateActiveTagUI();
        syncURL();
    }

    function createFilterBtn(id, icon, text, isLatest = false) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `filter-btn ${id === currentCategory ? 'active' : ''}`;
        btn.dataset.category = id;
        if (isLatest) btn.dataset.isLatest = 'true';
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
            const btn = createFilterBtn(pillar.id, pillar.icon, pillar.name, !!pillar.isLatest);
            buttonsContainer.appendChild(btn);
        });

        // Primary pillar button click
        buttonsContainer.addEventListener('click', function(e) {
            const btn = e.target.closest('.filter-btn');
            if (!btn) return;

            buttonsContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            currentCategory = btn.dataset.category;
            currentSubcategory = 'all';

            updateSubcategoryUI();
            filterJournalEntries();

            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        });

        // Subcategory strip button click
        const subContainer = document.getElementById('subFilterButtons');
        if (subContainer) {
            subContainer.addEventListener('click', function(e) {
                const btn = e.target.closest('.sub-filter-btn');
                if (!btn) return;

                subContainer.querySelectorAll('.sub-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                currentSubcategory = btn.dataset.sub;
                filterJournalEntries();
            });
        }

        // Active tag dismiss button
        const clearTagBtn = document.getElementById('clearActiveTagBtn');
        if (clearTagBtn) {
            clearTagBtn.addEventListener('click', function() {
                currentTag = null;
                filterJournalEntries();
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

        updateSubcategoryUI();
        filterJournalEntries();

        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

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
            currentSearch = e.target.value.trim();
            filterJournalEntries();
        });

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                filterBar.classList.remove('search-open');
                searchInput.value = '';
                currentSearch = '';
                filterJournalEntries();
            }
        });
    }

    async function initJournalFilters() {
        try {
            readURL();

            const waitForJournal = () => {
                const feed = document.getElementById('feed');
                if (feed && feed.children.length > 0) {
                    setupJournalFilters();
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
            console.error('Failed to initialize journal filters:', error);
        }
    }

    initJournalFilters();

})();