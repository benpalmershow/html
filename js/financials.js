// Financials Dashboard Module - Main entry point and core logic
// SOLID: DIP - uses Services.dataService instead of direct fetch
// SRP - initialization, rendering, and navigation are separated

/* =========================================
   Constants & Configuration (SRP)
   ========================================= */

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const SELECTORS = {
    FILTER_BTN: '.filter-btn',
    CATEGORY_DROPDOWN: '#financials-filters',
    DESKTOP_FILTERS: '#financials-filters',
    FILTER_DROPDOWN: '.filters',
    FILTER_GROUP: '.filters',
    CHART_BTN: '.chart-btn',
    INFO_BTN: '.info-btn',
    EXPAND_TOGGLE: '.expand-toggle',
    INDICATOR: '.indicator',
    CHART_OVERLAY: '.chart-overlay',
    CATEGORIES: '#categories',
    INDICATOR_CATEGORIES: '#indicator-categories'
};

const DATA_ATTRS = {
    CATEGORY: 'data-category',
    IS_LATEST: 'data-isLatest',
    INDICATOR_NAME: 'data-indicator-name',
    EXPLANATION: 'data-explanation'
};

/* =========================================
   Dashboard State (SRP: state management)
   ========================================= */

const DashboardState = (function () {
    let financialData = null;
    let has13FLoaded = false;

    return {
        getData: () => financialData,
        setData: (data) => { financialData = data; window.financialData = data; },
        is13FLoaded: () => has13FLoaded,
        mark13FLoaded: () => { has13FLoaded = true; }
    };
})();

/* =========================================
   Dashboard Renderer (SRP: rendering only)
   ========================================= */

function scrollToIndicatorByName(indicatorName) {
    if (!indicatorName) return;

    const cards = Array.from(document.querySelectorAll(SELECTORS.INDICATOR));
    const target = cards.find(card => card.getAttribute(DATA_ATTRS.INDICATOR_NAME) === indicatorName);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.classList.add('indicator-deep-link');
    setTimeout(() => target.classList.remove('indicator-deep-link'), 1800);
}

function renderDashboard(filterCategory = 'all', sortByLatest = false) {
    const financialData = DashboardState.getData();
    const indicatorContainer = document.getElementById('indicator-categories');
    let categories = [...new Set(financialData.indices.map(item => item.category))];

    let html = '';

    if (sortByLatest) {
        html += renderLatestUpdatesView(financialData);
    } else {
        html += renderCategoryView(financialData, categories, filterCategory);
    }

    indicatorContainer.innerHTML = html;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    setupInfoIconHandlers(SELECTORS, DATA_ATTRS);
    setupChartIconHandlers(SELECTORS, DATA_ATTRS);
    setupExpandHandlers(SELECTORS);

    if (typeof updateAllCountdowns === 'function') updateAllCountdowns();
    if (typeof renderSparklines === 'function') renderSparklines();

    handleEmptyState(indicatorContainer, filterCategory);
    makeCardsFocusable(document.getElementById('categories'));
}

function renderLatestUpdatesView(financialData) {
    const allIndicators = financialData.indices.slice();
    allIndicators.sort((a, b) => {
        const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;

        if (dateA > 0 && dateB > 0) return dateB - dateA;
        if (dateA > 0) return -1;
        if (dateB > 0) return 1;

        const aInfo = getLatestMonthForIndicator(a);
        const bInfo = getLatestMonthForIndicator(b);
        if (aInfo.daysOld !== bInfo.daysOld) return aInfo.daysOld - bInfo.daysOld;
        return a.name.localeCompare(b.name);
    });

    return `
        <div class="category" data-category="latest-updates">
            <h2 class="category-title">
                <span class="category-icon"><i data-lucide="clock"></i></span>
                <span class="category-name">Latest Updates</span>
            </h2>
            <div class="indicators-grid">
                ${allIndicators.map(indicator => createIndicatorCard(indicator, MONTHS, MONTH_LABELS, DATA_ATTRS)).join('')}
            </div>
        </div>
    `;
}

function renderCategoryView(financialData, categories, filterCategory) {
    let html = '';

    categories.forEach(category => {
        if (filterCategory !== 'all' && category !== filterCategory) return;

        let categoryIndicators = financialData.indices.filter(item => item.category === category);

        categoryIndicators.sort((a, b) => {
            const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
            const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;

            if (dateA > 0 && dateB > 0) return dateB - dateA;
            if (dateA > 0) return -1;
            if (dateB > 0) return 1;
            return a.name.localeCompare(b.name);
        });

        const icon = categoryIcons[category] || '<i data-lucide="bar-chart-2"></i>';

        html += `
            <div class="category" data-category="${category}">
                <h2 class="category-title">
                    <span class="category-icon">${icon}</span>
                    <span class="category-name">${category}</span>
                </h2>
                <div class="indicators-grid">
                    ${categoryIndicators.map(indicator => createIndicatorCard(indicator, MONTHS, MONTH_LABELS, DATA_ATTRS)).join('')}
                </div>
            </div>
        `;
    });

    return html;
}

function handleEmptyState(container, filterCategory) {
    const visibleCategories = container.querySelectorAll('.category');
    if (visibleCategories.length === 0 && filterCategory !== 'all') {
        container.innerHTML = '<div class="empty-state"><i data-lucide="search-x"></i><p>No indicators in this category.</p></div>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

function makeCardsFocusable(container) {
    container.querySelectorAll('.indicator').forEach(card => {
        card.setAttribute('tabindex', '0');
    });
}

/* =========================================
   Data Fetching (DIP: uses Services.dataService)
   ========================================= */

async function fetchFinancialData() {
    try {
        const data = await Services.dataService.fetchAnyJSON(['json/financials-data.json']);
        DashboardState.setData(data);
        initializeDashboard();
    } catch (error) {
        console.error('Could not load financial data from any path:', error);
        document.getElementById('categories').innerHTML =
            '<div class="error">Error loading financial data. Please try again later.</div>';
    }
}

/* =========================================
   Dashboard Initialization (SRP: orchestrates setup)
   ========================================= */

function initializeDashboard() {
    const financialData = DashboardState.getData();

    document.getElementById('lastUpdated').textContent = `Last Updated: ${formatDate(financialData.lastUpdated, 'full')}`;
    setupFilters(financialData);
    setupFilterBarSearchToggle();

    const urlParams = new URLSearchParams(window.location.search);
    const initialFilter = urlParams.get('filter') || 'latest';
    const indicatorParam = urlParams.get('indicator');
    const isLatest = initialFilter.toLowerCase() === 'latest';

    if (window.location.hash === '#latest-13f-filings-anchor' || initialFilter === '13F Holdings') {
        setActiveFilter('13F Holdings');
        ensureLoad13F();
    } else if (initialFilter === 'World Cup') {
        setActiveFilter('World Cup');
    } else {
        const cat = isLatest ? 'latest' : initialFilter;
        setActiveFilter(cat);
        renderDashboard(isLatest ? 'all' : initialFilter, isLatest);
        if (indicatorParam) scrollToIndicatorByName(indicatorParam);
        ensureLoad13F();
    }

    if (typeof loadWorldCupMatches === 'function') loadWorldCupMatches();
    if (typeof setupIndicatorSearch === 'function') setupIndicatorSearch();
    if (typeof setupStickyObserver === 'function') setupStickyObserver();
    setupModalHandlers();
    setupKeyboardNavigation();
}

/** Single source of truth for which filter is active.
 *  Sets data-filter on #categories and marks the correct button active. */
function setActiveFilter(category) {
    const categoriesEl = document.getElementById('categories');
    categoriesEl.dataset.filter = category;
    currentCategory = category;

    document.querySelectorAll('.filter-btn').forEach(btn => {
        const isActive = category === 'latest'
            ? btn.dataset.isLatest === 'true'
            : btn.dataset.category === category;
        btn.classList.toggle('active', isActive);
    });

    syncFilterToURL(category, category === 'latest');
}

/* =========================================
   13F Lazy Loading (SRP)
   ========================================= */

function ensureLoad13F() {
    if (DashboardState.is13FLoaded()) return;
    DashboardState.mark13FLoaded();
    if (typeof load13FData === 'function') load13FData();
}

/* =========================================
   Keyboard Navigation (SRP)
   ========================================= */

function setupKeyboardNavigation() {
    document.addEventListener('keydown', function (e) {
        const focused = document.activeElement;
        if (!focused || !focused.classList.contains('indicator')) return;

        const cards = Array.from(document.querySelectorAll('.indicator[tabindex="0"]:not([style*="display: none"])'));
        const idx = cards.indexOf(focused);
        if (idx === -1) return;

        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            next = cards[idx + 1];
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            next = cards[idx - 1];
        } else if (e.key === 'Enter') {
            const chartBtn = focused.querySelector('.chart-btn');
            if (chartBtn) chartBtn.click();
            e.preventDefault();
            return;
        }

        if (next) {
            e.preventDefault();
            next.focus();
            next.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    });
}

/* =========================================
   Entry Point
   ========================================= */

document.addEventListener('DOMContentLoaded', function () {
    fetchFinancialData();
    if (window.location.hash === '#latest-13f-filings-anchor') {
        ensureLoad13F();
    }
    if (typeof lucide !== 'undefined') lucide.createIcons();
});
