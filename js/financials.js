// Financials Dashboard Module - Main entry point and core logic

// Date constants
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// DOM selectors
const SELECTORS = {
    DROPDOWN_ITEM: '.dropdown-item',
    FILTER_BTN: '.filter-btn',
    DESKTOP_FILTER_BTN: '.desktop-filter-btn',
    CATEGORY_DROPDOWN: '#categoryDropdown',
    DESKTOP_FILTERS: '#desktopFilters',
    FILTER_DROPDOWN: '.filter-dropdown',
    FILTER_GROUP: '.filter-group',
    CHART_BTN: '.chart-btn',
    INFO_BTN: '.info-btn',
    EXPAND_TOGGLE: '.expand-toggle',
    INDICATOR: '.indicator',
    CHART_OVERLAY: '.chart-overlay',
    CATEGORIES: '#categories',
    LATEST_13F: '#latest-13f-filings'
};

// Data attributes
const DATA_ATTRS = {
    CATEGORY: 'data-category',
    IS_LATEST: 'data-isLatest',
    INDICATOR_NAME: 'data-indicator-name',
    EXPLANATION: 'data-explanation'
};

let financialData = null;

// Fetch financial data and initialize dashboard
async function fetchFinancialData() {
    const paths = [
        '/json/financials-data.json',
    ];

    try {
        const fetchPromises = paths.map(async path => {
            const response = await fetch(path, {
                headers: { 'Accept': 'application/json' },
                cache: 'no-cache'
            });
            if (!response.ok) throw new Error(`Failed to fetch from ${path}`);
            return response.json();
        });

        financialData = await Promise.any(fetchPromises);
        window.financialData = financialData; // Expose to global scope for chart functions
        initializeDashboard();
    } catch (error) {
        console.error('Could not load financial data from any path:', error);
        document.getElementById('categories').innerHTML =
            '<div class="error">Error loading financial data. Please try again later.</div>';
    }
}

// Render dashboard with indicators
function renderDashboard(filterCategory = 'all', sortByLatest = false) {
    const categoriesContainer = document.getElementById('categories');
    let categories = [...new Set(financialData.indices.map(item => item.category))];

    let html = '';

    if (sortByLatest) {
        // Sort all indicators by latest data and display in single "Latest Updates" section
        const allIndicators = financialData.indices.slice();
        allIndicators.sort((a, b) => {
            const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
            const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;

            // Both have lastUpdated - sort by timestamp
            if (dateA > 0 && dateB > 0) {
                return dateB - dateA;
            }

            // Only one has lastUpdated - prioritize it
            if (dateA > 0) return -1;
            if (dateB > 0) return 1;

            // Neither has lastUpdated - fall back to month-based sorting
            const aInfo = getLatestMonthForIndicator(a);
            const bInfo = getLatestMonthForIndicator(b);

            // Secondary sort: by days old (ascending - freshest first)
            if (aInfo.daysOld !== bInfo.daysOld) {
                return aInfo.daysOld - bInfo.daysOld;
            }

            // Tertiary sort: by indicator name (alphabetical)
            return a.name.localeCompare(b.name);
        });

        html += `
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
    } else {
        // Original category-based rendering
        categories.forEach(category => {
            if (filterCategory !== 'all' && category !== filterCategory) return;

            const categoryIndicators = financialData.indices.filter(item => item.category === category);
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
    }

    categoriesContainer.innerHTML = html;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    setupInfoIconHandlers(SELECTORS, DATA_ATTRS);
    setupChartIconHandlers(SELECTORS, DATA_ATTRS);
    setupExpandHandlers(SELECTORS);

    if (typeof updateAllCountdowns === 'function') updateAllCountdowns();
}

// Initialize dashboard on page load
function initializeDashboard() {
    document.getElementById('lastUpdated').textContent = `Last Updated: ${formatDate(financialData.lastUpdated)}`;
    setupFilters(financialData, SELECTORS, DATA_ATTRS);
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilter = urlParams.get('filter') || 'all';

    // Check if navigated to 13F anchor
    if (window.location.hash === '#latest-13f-filings-anchor') {
        document.getElementById('categories').style.display = 'none';
        document.getElementById('latest-13f-filings').style.display = 'block';

        // Activate 13F Holdings button
        const allBtnsSelector = `${SELECTORS.DESKTOP_FILTER_BTN}, ${SELECTORS.DROPDOWN_ITEM}`;
        updateActiveElements(allBtnsSelector,
            (btn) => btn.getAttribute(DATA_ATTRS.CATEGORY) === '13F Holdings'
        );
        currentCategory = '13F Holdings';
    } else {
        // Set active state for desktop buttons and dropdown items
        const allBtnsSelector = `${SELECTORS.DESKTOP_FILTER_BTN}, ${SELECTORS.DROPDOWN_ITEM}`;
        updateActiveElements(allBtnsSelector,
            (btn) => btn.getAttribute(DATA_ATTRS.CATEGORY) === initialFilter
        );

        renderDashboard(initialFilter);
        setupModalHandlers();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    fetchFinancialData();
    load13FData();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});
