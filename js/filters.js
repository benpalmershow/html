// Filter and UI handler logic
// SOLID: SRP - each module has one responsibility
// DIP - modules receive dependencies via parameters instead of globals

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
    'Financial Markets': '<i data-lucide="bar-chart-2" class="filter-icon"></i>'
};

/* =========================================
   Filter Builder (SRP: creates filter UI elements)
   ========================================= */

const FilterBuilder = (function () {
    function createFilterElements(container, desktopContainer, SELECTORS, DATA_ATTRS, id, iconClass, text, isLatest = false) {
        const dropItem = document.createElement('button');
        dropItem.className = SELECTORS.DROPDOWN_ITEM.slice(1);
        if (id === 'all') dropItem.classList.add('active');
        setFilterAttributes(dropItem, DATA_ATTRS, id, isLatest);
        dropItem.innerHTML = `${iconClass}<span>${text}</span>`;
        container.appendChild(dropItem);

        const deskBtn = document.createElement('button');
        deskBtn.className = `${SELECTORS.FILTER_BTN.slice(1)} ${SELECTORS.DESKTOP_FILTER_BTN.slice(1)}`;
        if (id === 'all') deskBtn.classList.add('active');
        setFilterAttributes(deskBtn, DATA_ATTRS, id, isLatest);
        deskBtn.innerHTML = `${iconClass}<span>${text}</span>`;
        desktopContainer.appendChild(deskBtn);
    }

    function setFilterAttributes(element, DATA_ATTRS, id, isLatest) {
        if (isLatest) {
            element.dataset.sort = 'latest';
            element.setAttribute(DATA_ATTRS.IS_LATEST, 'true');
        } else {
            element.setAttribute(DATA_ATTRS.CATEGORY, id);
        }
    }

    return { createFilterElements };
})();

/* =========================================
   Filter Click Handler (SRP: filter state management)
   ========================================= */

function updateActiveElements(selector, predicate) {
    document.querySelectorAll(selector).forEach(el => {
        el.classList.remove('active');
        if (predicate(el)) el.classList.add('active');
    });
}

function handleFilterClick(element, source, SELECTORS, DATA_ATTRS) {
    const category = element.getAttribute(DATA_ATTRS.CATEGORY);
    const isLatest = element.getAttribute(DATA_ATTRS.IS_LATEST) === 'true';

    const dropdownSelector = `${SELECTORS.CATEGORY_DROPDOWN} ${SELECTORS.DROPDOWN_ITEM}`;
    updateActiveElements(dropdownSelector, (i) =>
        (isLatest && i.getAttribute(DATA_ATTRS.IS_LATEST) === 'true') || (!isLatest && i.getAttribute(DATA_ATTRS.CATEGORY) === category)
    );

    const desktopSelector = `${SELECTORS.DESKTOP_FILTERS} ${SELECTORS.FILTER_BTN}`;
    updateActiveElements(desktopSelector, (b) =>
        (isLatest && b.getAttribute(DATA_ATTRS.IS_LATEST) === 'true') || (!isLatest && b.getAttribute(DATA_ATTRS.CATEGORY) === category)
    );

    if (category === '13F Holdings') {
        document.getElementById('categories').style.display = 'none';
        document.getElementById('latest-13f-filings').style.display = 'block';
        if (typeof ensureLoad13F === 'function') ensureLoad13F();
        currentCategory = '13F Holdings';
        return;
    }

    document.getElementById('categories').style.display = 'block';
    const show13F = category === 'all' || isLatest;
    document.getElementById('latest-13f-filings').style.display = show13F ? 'block' : 'none';
    document.querySelectorAll('[data-category="13F Holdings"]').forEach(el => {
        el.style.display = show13F ? '' : 'none';
    });
    if (show13F && typeof ensureLoad13F === 'function') ensureLoad13F();

    if (isLatest) {
        renderDashboard('all', true);
    } else {
        currentCategory = category || 'all';
        renderDashboard(currentCategory, false);
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

function setupFilters(financialData, SELECTORS, DATA_ATTRS) {
    const categories = [...new Set(financialData.indices.map(item => item.category))];
    const categoryDropdown = document.getElementById('categoryDropdown');
    const desktopFilters = document.getElementById('desktopFilters');

    categoryDropdown.innerHTML = '';
    desktopFilters.innerHTML = '';

    FilterBuilder.createFilterElements(categoryDropdown, desktopFilters, SELECTORS, DATA_ATTRS,
        'all', '<i data-lucide="list" class="filter-icon"></i>', 'All');

    FilterBuilder.createFilterElements(categoryDropdown, desktopFilters, SELECTORS, DATA_ATTRS,
        'latest', '<i data-lucide="clock" class="filter-icon"></i>', 'Latest', true);

    categories.forEach(category => {
        const icon = categoryIcons[category] || '<i data-lucide="bar-chart-2" class="filter-icon"></i>';
        FilterBuilder.createFilterElements(categoryDropdown, desktopFilters, SELECTORS, DATA_ATTRS,
            category, icon, category);
    });

    FilterBuilder.createFilterElements(categoryDropdown, desktopFilters, SELECTORS, DATA_ATTRS,
        '13F Holdings', '<i data-lucide="building-2" class="filter-icon"></i>', '13F Holdings');

    setupDropdownToggle('categoryBtn', 'categoryDropdown');

    document.getElementById('categoryDropdown').addEventListener('click', function (e) {
        const btn = e.target.closest(SELECTORS.DROPDOWN_ITEM);
        if (btn) { handleFilterClick(btn, 'filter', SELECTORS, DATA_ATTRS); closeAllDropdowns(SELECTORS); }
    });

    desktopFilters.addEventListener('click', function (e) {
        const btn = e.target.closest(SELECTORS.FILTER_BTN);
        if (btn) handleFilterClick(btn, 'filter', SELECTORS, DATA_ATTRS);
    });

    document.addEventListener('click', function (e) {
        if (!e.target.closest('.filter-group') && !e.target.closest('.filter-dropdown')) {
            closeAllDropdowns(SELECTORS);
        }
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

/* =========================================
   Dropdown Toggle (SRP)
   ========================================= */

function setupDropdownToggle(btnId, dropdownId) {
    const btn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    const group = btn.closest('.filter-group');

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeAllDropdowns({ FILTER_DROPDOWN: '.filter-dropdown', FILTER_GROUP: '.filter-group' });
        dropdown.classList.add('open');
        group.classList.add('open');
    });
}

function closeAllDropdowns(SELECTORS) {
    document.querySelectorAll(SELECTORS.FILTER_DROPDOWN).forEach(el => el.classList.remove('open'));
    document.querySelectorAll(SELECTORS.FILTER_GROUP).forEach(el => el.classList.remove('open'));
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
}

function setupInfoIconHandlers(SELECTORS, DATA_ATTRS) {
    setupIconHandlers(SELECTORS.INFO_BTN, function () {
        const indicator = this.closest(SELECTORS.INDICATOR);
        const explanationDiv = indicator.querySelector('.explanation-text');
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
    if (closeBtn) closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') modal.style.display = 'none';
    });
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
    const filters = document.getElementById('filters');
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
