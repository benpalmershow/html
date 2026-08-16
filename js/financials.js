// Financials Dashboard Module - Main entry point and core logic
// SOLID: DIP - uses Services.dataService instead of direct fetch
// SRP - initialization, rendering, and navigation are separated

/* =========================================
   Constants & Configuration (SRP)
   ========================================= */

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ENABLE_EARNINGS = true;

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
        const sortedIndicators = financialData.indices.slice().sort((a, b) => {
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
        const initialCount = 4;
        html += renderLatestUpdatesView(financialData, sortedIndicators.slice(0, initialCount));
        const remainingLatest = sortedIndicators.slice(initialCount);
        if (remainingLatest.length) {
            scheduleAppendRemainingLatest(financialData, remainingLatest);
        }
    } else {
        html += renderCategoryView(financialData, categories, filterCategory);
    }

    const heightBefore = indicatorContainer.getBoundingClientRect().height;
    indicatorContainer.style.minHeight = `${heightBefore}px`;
    indicatorContainer.innerHTML = html;

    indicatorContainer.querySelectorAll('.indicator').forEach(el => el.classList.add('indicator-static'));

    if (typeof lucide !== 'undefined') lucide.createIcons();

    setupInfoIconHandlers(SELECTORS, DATA_ATTRS);
    setupChartIconHandlers(SELECTORS, DATA_ATTRS);
    setupExpandHandlers(SELECTORS);

    if (typeof updateAllCountdowns === 'function') updateAllCountdowns();
    if (typeof renderSparklines === 'function') renderSparklines();

    handleEmptyState(indicatorContainer, filterCategory);
    makeCardsFocusable(document.getElementById('categories'));

    // Lazy render indicators to reduce initial DOM complexity
    setupLazyIndicatorRendering();
}

function renderLatestUpdatesView(financialData, indicatorsOverride) {
    const allIndicators = indicatorsOverride || financialData.indices.slice();
    if (!indicatorsOverride) {
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
    }

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

function scheduleAppendRemainingLatest(financialData, remainingIndicators) {
    const grid = document.querySelector('#indicator-categories .category[data-category="latest-updates"] .indicators-grid');
    if (!grid) return;

    const sentinel = document.createElement('div');
    sentinel.className = 'lazy-load-sentinel';
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.height = '1px';
    grid.appendChild(sentinel);

    const observer = new IntersectionObserver((entries) => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        appendRemainingLatestIndicators(financialData, remainingIndicators);
        observer.disconnect();
        sentinel.remove();
    }, { rootMargin: '300px', threshold: 0 });

    observer.observe(sentinel);
}

function appendRemainingLatestIndicators(financialData, remainingIndicators) {
    if (!remainingIndicators.length) return;

    const grid = document.querySelector('#indicator-categories .category[data-category="latest-updates"] .indicators-grid');
    if (!grid) return;

    const fragment = document.createDocumentFragment();
    remainingIndicators.forEach(indicator => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = createIndicatorCard(indicator, MONTHS, MONTH_LABELS, DATA_ATTRS);
        fragment.appendChild(wrapper.firstElementChild);
    });
    grid.appendChild(fragment);

    if (typeof lucide !== 'undefined') lucide.createIcons();
    setupInfoIconHandlers(SELECTORS, DATA_ATTRS);
    setupChartIconHandlers(SELECTORS, DATA_ATTRS);
    setupExpandHandlers(SELECTORS);
    if (typeof renderSparklines === 'function') renderSparklines();
    makeCardsFocusable(document.getElementById('categories'));
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
   Lazy Indicator Rendering (DOM Virtualization)
   ========================================= */

function setupLazyIndicatorRendering() {
    const INITIAL_VISIBLE = 4;
    const categories = document.querySelectorAll('.category');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const category = entry.target;
                category.querySelectorAll('.indicator').forEach(indicator => {
                    if (indicator.style.display === 'none') {
                        indicator.style.display = '';
                    }
                });
                observer.unobserve(category);
            }
        });
    }, { rootMargin: '200px', threshold: 0.01 });

    categories.forEach((category, index) => {
        const indicators = category.querySelectorAll('.indicator');
        indicators.forEach((indicator, indIndex) => {
            if (index > 1 || indIndex >= INITIAL_VISIBLE) {
                indicator.style.display = 'none';
            }
        });
        if (index > 1 || indicators.length > INITIAL_VISIBLE) {
            observer.observe(category);
        }
    });
}

/* =========================================
   Data Fetching (DIP: uses Services.dataService)
   ========================================= */

async function fetchFinancialData() {
    try {
        const dataPromise = window.__FINANCIALS_DATA_PROMISE__ || Services.dataService.fetchJSON('json/financials-data.json');
        const data = await dataPromise;
        window.__FINANCIALS_DATA_PROMISE__ = null;

        DashboardState.setData(data);
        initializeDashboard();

        if (ENABLE_EARNINGS) {
            Services.dataService.fetchJSON('json/earnings.json')
                .catch(() => null)
                .then(earningsData => {
                    if (!earningsData?.earnings?.length) return;
                    const financialData = DashboardState.getData();
                    const earningsIndicators = convertEarningsToIndicators(earningsData.earnings);
                    financialData.indices = financialData.indices.filter(item => item.category !== 'Earnings');
                    financialData.indices.push(...earningsIndicators);
                    DashboardState.setData(financialData);
                    if (typeof setupFilters === 'function') setupFilters(financialData);
                    const current = document.getElementById('categories')?.dataset.filter || 'latest';
                    const isLatest = current === 'latest';
                    renderDashboard(isLatest ? 'all' : current, isLatest);
                });
        }
    } catch (error) {
        console.error('Could not load financial data:', error);
        document.getElementById('categories').innerHTML =
            '<div class="error">Error loading financial data. Please try again later.</div>';
    }
}

function convertEarningsToIndicators(earnings) {
    return earnings.map(entry => {
        const recent = (entry.recentEarnings || []);
        const latest = recent[0] || {};

        const indicator = {
            id: `earnings-${entry.ticker.toLowerCase()}`,
            category: 'Earnings',
            agency: entry.source || 'Yahoo Finance',
            name: entry.ticker,
            url: `https://finance.yahoo.com/quote/${entry.ticker}`,
            lastUpdated: latest.reportedDate || entry.fetchedAt,
            reportedDate: latest.reportedDate || '',
            isNew: (() => {
                const d = latest.reportedDate ? new Date(latest.reportedDate) : null;
                return d ? (Date.now() - d.getTime()) < (3 * 24 * 60 * 60 * 1000) : false;
            })(),
            actualEPS: latest.actualEPS,
            estimatedEPS: latest.estimatedEPS,
            surprisePercent: latest.surprisePercent,
            nextEarningsDate: entry.nextEarningsDate || '',
            estimatedNextEPS: entry.estimatedEPS || latest.estimatedEPS,
            latestPrice: entry.latestPrice,
            change: '',
            explanation: buildEarningsExplanation(entry, latest),
            recentEarnings: entry.recentEarnings || [],
            company: entry.company,
            sector: entry.sector,
            marketCap: entry.marketCap,
            trailingPE: entry.trailingPE,
            forwardPE: entry.forwardPE,
            pegRatio: entry.pegRatio,
            priceToSalesTrailing12Months: entry.priceToSalesTrailing12Months,
            priceToBook: entry.priceToBook,
            grossMargins: entry.grossMargins,
            operatingMargins: entry.operatingMargins,
            profitMargins: entry.profitMargins,
            returnOnAssets: entry.returnOnAssets,
            returnOnEquity: entry.returnOnEquity,
            revenueGrowth: entry.revenueGrowth,
            earningsGrowth: entry.earningsGrowth,
            revenuePerShare: entry.revenuePerShare,
            freeCashflow: entry.freeCashflow,
            operatingCashflow: entry.operatingCashflow,
            grossProfits: entry.grossProfits,
            totalCash: entry.totalCash,
            totalCashPerShare: entry.totalCashPerShare,
            totalDebt: entry.totalDebt,
            totalRevenue: entry.totalRevenue,
            debtToEquity: entry.debtToEquity,
            currentRatio: entry.currentRatio,
            quickRatio: entry.quickRatio,
            bookValue: entry.bookValue,
            sharesOutstanding: entry.sharesOutstanding,
            floatShares: entry.floatShares,
            impliedSharesOutstanding: entry.impliedSharesOutstanding,
            dividendRate: entry.dividendRate,
            dividendYield: entry.dividendYield,
            payoutRatio: entry.payoutRatio,
            fiveYearAvgDividendYield: entry.fiveYearAvgDividendYield,
            targetHighPrice: entry.targetHighPrice,
            targetLowPrice: entry.targetLowPrice,
            targetMeanPrice: entry.targetMeanPrice,
            targetMedianPrice: entry.targetMedianPrice,
            recommendationMean: entry.recommendationMean,
            numberOfAnalystOpinions: entry.numberOfAnalystOpinions,
            beta: entry.beta,
            fiftyTwoWeekHigh: entry.fiftyTwoWeekHigh,
            fiftyTwoWeekLow: entry.fiftyTwoWeekLow,
            fiftyDayAverage: entry.fiftyDayAverage,
            twoHundredDayAverage: entry.twoHundredDayAverage,
            averageVolume: entry.averageVolume,
            averageDailyVolume10Day: entry.averageDailyVolume10Day,
            previousClose: entry.previousClose,
            open: entry.open,
            regularMarketOpen: entry.regularMarketOpen,
            dayHigh: entry.dayHigh,
            dayLow: entry.dayLow,
            regularMarketDayHigh: entry.regularMarketDayHigh,
            regularMarketDayLow: entry.regularMarketDayLow,
            regularMarketVolume: entry.regularMarketVolume,
            averageVolume10days: entry.averageVolume10days,
            sharesShort: entry.sharesShort,
            sharesShortPreviousMonthDate: entry.sharesShortPreviousMonthDate,
            sharesShortPriorMonth: entry.sharesShortPriorMonth,
            dateShortInterest: entry.dateShortInterest,
            fullTimeEmployees: entry.fullTimeEmployees,
            industry: entry.industry,
            currency: entry.currency,
            recommendationKey: entry.recommendationKey,
            exDividendDate: entry.exDividendDate,
            lastDividendDate: entry.lastDividendDate,
            priceHistory: entry.priceHistory || []
        };

        const prev = (() => {
            try {
                const raw = localStorage.getItem(`earnings-prev-${entry.ticker}`);
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                return null;
            }
        })();

        const deltas = {};
        const metricsToTrack = [
            'marketCap', 'trailingPE', 'forwardPE', 'pegRatio',
            'priceToSalesTrailing12Months', 'priceToBook',
            'profitMargins', 'revenueGrowth', 'earningsGrowth',
            'dividendYield', 'debtToEquity', 'currentRatio', 'quickRatio',
            'bookValue', 'beta',
            'fiftyDayAverage', 'twoHundredDayAverage',
            'previousClose', 'dayHigh', 'dayLow',
            'regularMarketVolume', 'averageVolume',
            'totalRevenue', 'totalCash', 'totalDebt',
            'freeCashflow', 'operatingCashflow', 'grossProfits',
            'targetMeanPrice', 'targetMedianPrice',
            'latestPrice'
        ];

        metricsToTrack.forEach(key => {
            const curr = indicator[key];
            const old = prev && prev[key] != null ? prev[key] : null;
            if (curr != null && old != null && typeof curr === 'number' && typeof old === 'number' && old !== 0) {
                const diff = curr - old;
                const pct = (diff / Math.abs(old)) * 100;
                deltas[key] = { diff, pct, old, curr };
            }
        });

        indicator.deltas = deltas;

        try {
            const snapshot = {};
            metricsToTrack.forEach(key => {
                if (indicator[key] != null && typeof indicator[key] === 'number') {
                    snapshot[key] = indicator[key];
                }
            });
            localStorage.setItem(`earnings-prev-${entry.ticker}`, JSON.stringify(snapshot));
        } catch (e) {
            // storage full or unavailable
        }

        return indicator;
    }).filter(ind => ind.name);
}

function buildEarningsExplanation(entry, latest) {
    const parts = [];
    const company = entry.company || entry.ticker;
    
    // Company description based on sector
    if (entry.sector) {
        parts.push(`${company} operates in the ${entry.sector} sector.`);
    }
    
    // Market cap
    if (entry.marketCap) {
        const marketCap = entry.marketCap >= 1e12 ? `$${(entry.marketCap / 1e12).toFixed(2)}T` : `$${(entry.marketCap / 1e9).toFixed(1)}B`;
        parts.push(`Market cap: ${marketCap}.`);
    }
    
    // Growth metrics
    if (entry.revenueGrowth) {
        parts.push(`Revenue growth: ${(entry.revenueGrowth * 100).toFixed(0)}% year-over-year.`);
    }
    if (entry.earningsGrowth) {
        parts.push(`Earnings growth: ${(entry.earningsGrowth * 100).toFixed(0)}% year-over-year.`);
    }
    
    // Profitability
    if (entry.profitMargins) {
        parts.push(`Profit margins: ${(entry.profitMargins * 100).toFixed(0)}%.`);
    }
    
    // Valuation
    if (entry.trailingPE) {
        parts.push(`Trailing P/E: ${entry.trailingPE.toFixed(1)}.`);
    }
    if (entry.forwardPE) {
        parts.push(`Forward P/E: ${entry.forwardPE.toFixed(1)}.`);
    }
    
    // Analyst recommendations
    if (entry.targetMeanPrice) {
        parts.push(`Analyst target price: $${entry.targetMeanPrice.toFixed(2)}.`);
    }
    if (entry.recommendationMean) {
        const recMap = { 1: 'Strong Buy', 2: 'Buy', 3: 'Hold', 4: 'Sell', 5: 'Strong Sell' };
        const rec = recMap[Math.round(entry.recommendationMean)] || 'Hold';
        parts.push(`Analyst consensus: ${rec}.`);
    }
    
    // Latest earnings
    if (latest.reportedDate) {
        parts.push(`Latest earnings reported: ${latest.reportedDate}.`);
    }
    if (entry.nextEarningsDate) {
        parts.push(`Next earnings date: ${entry.nextEarningsDate}.`);
    }
    
    return parts.join(' ');
}

/* =========================================
   Dashboard Initialization (SRP: orchestrates setup)
   ========================================= */

function initializeDashboard() {
    const financialData = DashboardState.getData();

    document.getElementById('lastUpdated').textContent = `Last Updated: ${formatDate(financialData.lastUpdated, 'full')}`;
    if (typeof setupFilters === 'function') setupFilters(financialData);
    if (typeof setupFilterBarSearchToggle === 'function') setupFilterBarSearchToggle();

    const urlParams = new URLSearchParams(window.location.search);
    const initialFilter = urlParams.get('filter') || 'latest';
    const indicatorParam = urlParams.get('indicator');
    const isLatest = initialFilter.toLowerCase() === 'latest';

    if (window.location.hash === '#latest-13f-filings-anchor' || initialFilter === '13F Holdings') {
        setActiveFilter('13F Holdings');
        ensureLoad13F();
    } else {
        const cat = isLatest ? 'latest' : initialFilter;
        setActiveFilter(cat);
        renderDashboard(isLatest ? 'all' : initialFilter, isLatest);
        if (indicatorParam) scrollToIndicatorByName(indicatorParam);
    }

    setup13FIntersectionLoader();

    if (typeof setupIndicatorSearch === 'function') setupIndicatorSearch();
    if (typeof setupStickyObserver === 'function') setupStickyObserver();
    if (typeof setupModalHandlers === 'function') setupModalHandlers();
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

    if (typeof syncFilterToURL === 'function') syncFilterToURL(category, category === 'latest');
}

/* =========================================
   13F Lazy Loading (SRP)
   ========================================= */

function ensureLoad13F() {
    if (DashboardState.is13FLoaded()) return;
    DashboardState.mark13FLoaded();

    const section = document.getElementById('latest-13f-filings');
    if (section) section.classList.add('is-visible');

    const runLoad = () => {
        if (typeof load13FData === 'function') load13FData();
    };

    if (typeof load13FData === 'function') {
        runLoad();
        return;
    }

    const script = document.createElement('script');
    script.src = 'js/13f-holdings.js';
    script.defer = true;
    script.onload = runLoad;
    script.onerror = () => console.error('Failed to load 13f-holdings.js');
    document.head.appendChild(script);
}

function setup13FIntersectionLoader() {
    const section = document.getElementById('latest-13f-filings');
    if (!section || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
        if (entries.some(entry => entry.isIntersecting)) {
            ensureLoad13F();
            observer.disconnect();
        }
    }, { rootMargin: '400px', threshold: 0 });

    observer.observe(section);
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
            if (chartBtn) {
                ensureChartsModule(function () {
                    chartBtn.click();
                });
                e.preventDefault();
                return;
            }
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

    const categoriesEl = document.getElementById('categories');
    if (categoriesEl) {
        categoriesEl.addEventListener('click', function (e) {
            const label = e.target.closest('.prediction-section-label');
            if (!label) return;
            const section = label.parentElement;
            if (!section || !section.classList.contains('metric-section')) return;
            const isCollapsed = section.classList.toggle('collapsed');
            label.setAttribute('aria-expanded', String(!isCollapsed));
        });
        categoriesEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                const label = e.target.closest('.prediction-section-label');
                if (!label) return;
                e.preventDefault();
                label.click();
            }
        });
    }
});
