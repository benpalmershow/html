// Filter and UI handler logic - Simple filter bar (like news.html)
// SOLID: SRP - each module has one responsibility

let currentCategory = 'all';

const categoryIcons = {
    'Employment Indicators': '<i data-lucide="users" class="filter-icon"></i>',
    'Housing Market': '<i data-lucide="home" class="filter-icon"></i>',
    'Business Indicators': '<i data-lucide="briefcase" class="filter-icon"></i>',
    'Consumer Indicators': '<i data-lucide="shopping-cart" class="filter-icon"></i>',
    'Trade & Tariffs': '<i data-lucide="ship" class="filter-icon"></i>',
    'Government': '<i data-lucide="landmark" class="filter-icon"></i>',
    'Commodities': '<i data-lucide="package" class="filter-icon"></i>',
    'Prediction Markets': '<i data-lucide="trending-up" class="filter-icon"></i>',
    'Financial Markets': '<i data-lucide="bar-chart-2" class="filter-icon"></i>',
    'World Cup': '<i data-lucide="volleyball" class="filter-icon"></i>'
};

/* =========================================
   Filter Click Handler (SRP: filter state management)
   ========================================= */

function updateActiveElements(selector, predicate) {
    document.querySelectorAll(selector).forEach(el => {
        el.classList.remove('active');
        if (predicate(el)) el.classList.add('active');
    });
}

function handleFilterClick(element, category, isLatest = false) {
    if (category === '13F Holdings') {
        document.getElementById('categories').style.display = 'none';
        document.getElementById('latest-13f-filings').style.display = 'block';
        if (typeof ensureLoad13F === 'function') ensureLoad13F();
        currentCategory = '13F Holdings';
    } else if (category === 'World Cup') {
        document.getElementById('categories').style.display = 'none';
        document.getElementById('latest-13f-filings').style.display = 'none';
        document.querySelectorAll('[data-category="13F Holdings"]').forEach(el => {
            el.style.display = 'none';
        });
        document.querySelectorAll('.category').forEach(el => {
            if (el.dataset.category === 'World Cup') {
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
        if (typeof loadWorldCupMatches === 'function') {
            loadWorldCupMatches();
        }
        currentCategory = 'World Cup';
    } else {
        document.getElementById('categories').style.display = 'block';
        const show13F = category === 'all' || isLatest;
        document.getElementById('latest-13f-filings').style.display = show13F ? 'block' : 'none';
        document.querySelectorAll('[data-category="13F Holdings"]').forEach(el => {
            el.style.display = show13F ? '' : 'none';
        });
        document.querySelectorAll('.category').forEach(el => {
            if (category === 'all') {
                el.style.display = 'block';
            } else if (el.dataset.category === category) {
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
        if (show13F && typeof ensureLoad13F === 'function') ensureLoad13F();

        currentCategory = category || 'all';
    }

    syncFilterToURL(category, isLatest);
}

function syncFilterToURL(category, isLatest) {
    const url = new URL(window.location);
    if (isLatest) {
        url.searchParams.set('filter', 'latest');
    } else if (category === '13F Holdings') {
        url.searchParams.set('filter', '13F Holdings');
    } else {
        url.searchParams.set('filter', category || 'all');
    }
    url.searchParams.delete('indicator');
    history.replaceState(null, '', url);
}

/* =========================================
   Main Filter Setup (delegates to focused modules)
   ========================================= */

function setupFilters(financialData) {
     const categories = [...new Set(financialData.indices.map(item => item.category))];
     const filtersContainer = document.getElementById('essay-filters');

     if (!filtersContainer) return;

     // Check if there's a nested .filters element for buttons, otherwise use the container
     const buttonsContainer = filtersContainer.querySelector('.filters') || filtersContainer;
     buttonsContainer.querySelectorAll('.filter-btn').forEach(btn => btn.remove());

     const createFilterBtn = (id, icon, text, isLatest = false) => {
         const btn = document.createElement('button');
         btn.type = 'button';
         btn.className = `filter-btn ${id === 'all' ? 'active' : ''}`;
         btn.dataset.category = id;
         if (isLatest) btn.dataset.isLatest = 'true';
         btn.innerHTML = `${icon}<span class="filter-text">${text}</span>`;
         return btn;
     };

     // Create buttons
     const allBtn = createFilterBtn('all', '<i data-lucide="list" class="filter-icon"></i>', 'All');
     buttonsContainer.appendChild(allBtn);

     const latestBtn = createFilterBtn('latest', '<i data-lucide="clock" class="filter-icon"></i>', 'Latest', true);
     buttonsContainer.appendChild(latestBtn);

     categories.forEach(category => {
         const icon = categoryIcons[category] || '<i data-lucide="bar-chart-2" class="filter-icon"></i>';
         const btn = createFilterBtn(category, icon, category);
         buttonsContainer.appendChild(btn);
     });

     const th13fBtn = createFilterBtn('13F Holdings', '<i data-lucide="building-2" class="filter-icon"></i>', '13F Holdings');
     buttonsContainer.appendChild(th13fBtn);

     // Add World Cup filter button with inline SVG
     const worldCupBtn = createFilterBtn('World Cup', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" data-lucide="volleyball" class="lucide lucide-volleyball filter-icon"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M12 18v-6"></path><path d="M8 15l4 3 4-3"></path></svg>', 'World Cup');
     buttonsContainer.appendChild(worldCupBtn);

     // Use event delegation on the buttons container
     buttonsContainer.addEventListener('click', function (e) {
         const btn = e.target.closest('.filter-btn');
         if (!btn) return;

         buttonsContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
         btn.classList.add('active');

         const category = btn.dataset.category;
         const isLatest = btn.dataset.isLatest === 'true';

         handleFilterClick(btn, category, isLatest);

         if (isLatest) {
             renderDashboard('all', true);
         } else if (category !== 'World Cup') {
             renderDashboard(category, false);
         }
     });

     if (typeof lucide !== 'undefined') lucide.createIcons();
 }

/* =========================================
   Icon Handlers (SRP: UI interactions)
   ========================================= */

function setupIconHandlers(selector, handler) {
    document.querySelectorAll(selector).forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            handler.call(this);
        });
    });

    // Also add event delegation for icons that might be inside buttons
    document.addEventListener('click', function (e) {
        const icon = e.target.closest(selector);
        if (icon) {
            e.preventDefault();
            e.stopPropagation();
            handler.call(icon);
        }
    });
}

function setupInfoIconHandlers(SELECTORS, DATA_ATTRS) {
    setupIconHandlers(SELECTORS.INFO_BTN, function () {
        const indicator = this.closest(SELECTORS.INDICATOR);
        if (!indicator) return;

        const explanationDiv = indicator.querySelector('.explanation-text');
        if (!explanationDiv) return;

        const explanation = this.getAttribute(DATA_ATTRS.EXPLANATION);

        if (explanationDiv.style.display === 'none') {
            explanationDiv.textContent = explanation;
            explanationDiv.style.display = 'block';
            this.classList.add('active');
        } else {
            explanationDiv.style.display = 'none';
            this.classList.remove('active');
        }
    });
}

function setupChartIconHandlers(SELECTORS, DATA_ATTRS) {
    setupIconHandlers(SELECTORS.CHART_BTN, function () {
        const indicator = this.closest(SELECTORS.INDICATOR);
        const indicatorName = indicator.getAttribute(DATA_ATTRS.INDICATOR_NAME);
        toggleChartOverlay(indicator, indicatorName);
    });
}

function setupExpandHandlers(SELECTORS) {
    setupIconHandlers(SELECTORS.EXPAND_TOGGLE, function () {
        const indicator = this.closest(SELECTORS.INDICATOR);
        indicator.classList.toggle('expanded');
    });
}

/* =========================================
   Modal & Search (SRP: separated concerns)
   ========================================= */

function setupModalHandlers() {
    const modal = document.getElementById('chartModal');
    if (!modal || modal.dataset.handlersBound === 'true') return;
    modal.dataset.handlersBound = 'true';

    const closeBtn = document.getElementById('closeChartModal');
    if (closeBtn) closeBtn.addEventListener('click', () => { hideChartModal(modal); });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) hideChartModal(modal);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') hideChartModal(modal);
    });
}

function showChartModal(modal) {
    const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    setTimeout(() => firstFocusable?.focus(), 0);

    const trapFocus = (e) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey && document.activeElement === firstFocusable) {
            e.preventDefault();
            lastFocusable?.focus();
        } else if (!e.shiftKey && document.activeElement === lastFocusable) {
            e.preventDefault();
            firstFocusable?.focus();
        }
    };
    modal._trapFocusHandler = trapFocus;
    modal.addEventListener('keydown', trapFocus);
}

function hideChartModal(modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    if (modal._trapFocusHandler) {
        modal.removeEventListener('keydown', modal._trapFocusHandler);
    }
}

function toggleCollapse(sectionId) {
    const content = document.getElementById(sectionId + '-content');
    const toggle = document.getElementById(sectionId + '-toggle');
    content?.classList.toggle('collapsed');
    toggle?.classList.toggle('collapsed');
    if (toggle) toggle.textContent = content?.classList.contains('collapsed') ? '▲' : '▼';
}

function setupSearch() {
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

function setupStickyObserver() {
    const filters = document.getElementById('essay-filters');
    if (!filters) return;

    const observer = new IntersectionObserver(
        ([entry]) => { filters.classList.toggle('stuck', !entry.isIntersecting); },
        { threshold: 1.0, rootMargin: '-1px 0px 0px 0px' }
    );

    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.marginBottom = '-1px';
    filters.parentNode.insertBefore(sentinel, filters);
    observer.observe(sentinel);
}
