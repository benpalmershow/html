// Financials Dashboard Module - Streamlined
// Main dashboard functionality with chart overlays

let financialData = null;

// Collapsible functionality
function toggleCollapse(sectionId) {
    const content = document.getElementById(sectionId + '-content');
    const toggle = document.getElementById(sectionId + '-toggle');

    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        toggle.classList.remove('collapsed');
        toggle.textContent = '▼';
    } else {
        content.classList.add('collapsed');
        toggle.classList.add('collapsed');
        toggle.textContent = '▲';
    }
}

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
        initializeDashboard();
    } catch (error) {
        console.error('Could not load financial data from any path:', error);
        document.getElementById('categories').innerHTML =
            '<div class="error">Error loading financial data. Please try again later.</div>';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getChangeClass(change) {
    if (change === "—" || change === "0" || change === "0.00") return 'change-neutral';
    if (change.startsWith('+')) return 'change-positive';
    if (change.startsWith('-')) return 'change-negative';
    return 'change-neutral';
}

function getArrowClass(change) {
    if (change === "—" || change === "0" || change === "0.00") return '';
    if (change.startsWith('+')) return 'arrow-up';
    if (change.startsWith('-')) return 'arrow-down';
    return '';
}

function extractNumericValue(value) {
    if (!value || value === '' || value.startsWith('TBD') || value === '—') return null;

    let cleanValue = value.toString()
        .replace(/[$,%]/g, '')
        .replace(/^\+/g, '')
        .replace(/[A-Za-z]/g, '')
        .trim();

    if (value.includes('M')) cleanValue = cleanValue.replace(/M$/, '');
    if (value.includes('B')) cleanValue = cleanValue.replace(/B$/, '');

    const num = parseFloat(cleanValue);
    return isNaN(num) ? null : num;
}

function formatCompactNumber(num) {
    if (num === null || num === undefined) return '—';

    const absNum = Math.abs(num);

    // For numbers >= 1000, use K suffix
    if (absNum >= 1000) {
        const kValue = num / 1000;
        // Show 1 decimal place for values under 100K, no decimals for 100K+
        if (absNum < 100000) {
            return (num >= 0 ? '+' : '') + kValue.toFixed(1) + 'K';
        } else {
            return (num >= 0 ? '+' : '') + Math.round(kValue) + 'K';
        }
    }

    // For smaller numbers, show as-is
    const formatted = num.toFixed(2).replace('.00', '');
    return num >= 0 ? '+' + formatted : formatted;
}


function getLatestMonthForIndicator(indicator) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

    // Find the latest month with data
    for (let i = months.length - 1; i >= 0; i--) {
        const month = months[i];
        if (indicator[month] && indicator[month] !== '' && !indicator[month].startsWith('TBD')) {
            // Calculate approximate days since data was released
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonth = now.getMonth(); // 0-11

            // Get release day (default to 15th if not specified or 0)
            const releaseDay = indicator.releaseDay && indicator.releaseDay > 0 ? indicator.releaseDay : 15;

            // Determine the year for this data point
            // If the data month is in the future relative to current month, it's from last year
            let dataYear = currentYear;
            if (i > currentMonth) {
                dataYear = currentYear - 1;
            }

            // Create the approximate release date
            const releaseDate = new Date(dataYear, i, releaseDay);

            // Calculate days old
            const daysOld = Math.floor((now - releaseDate) / (1000 * 60 * 60 * 24));

            return {
                monthIndex: i,
                monthName: months[i],
                daysOld: daysOld >= 0 ? daysOld : 9999 // If negative (future date), treat as very old
            };
        }
    }

    // No data found
    return {
        monthIndex: -1,
        monthName: 'none',
        daysOld: 99999 // Very high value to sort to bottom
    };
}

function calculateMoMChange(indicator) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    let currentValue = null;
    let previousValue = null;
    let currentRawValue = '';

    for (let i = months.length - 1; i >= 0; i--) {
        const month = months[i];
        const value = indicator[month];

        if (value && value !== '' && !value.startsWith('TBD')) {
            if (currentValue === null) {
                currentValue = extractNumericValue(value);
                currentRawValue = value;
            } else if (previousValue === null) {
                previousValue = extractNumericValue(value);
                break;
            }
        }
    }

    if (currentValue === null || previousValue === null || previousValue === 0) return null;

    const change = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    const numberChange = currentValue - previousValue;

    return {
        percentChange: change,
        numberChange: numberChange,
        currentRawValue: currentRawValue
    };
}

function calculateAllMonthlyChanges(indicator) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const changes = [];

    for (let i = 1; i < months.length; i++) {
        const currentMonth = months[i];
        const previousMonth = months[i - 1];

        const currentValue = extractNumericValue(indicator[currentMonth]);
        const previousValue = extractNumericValue(indicator[previousMonth]);

        if (currentValue !== null && previousValue !== null) {
            const change = currentValue - previousValue;
            const formattedChange = formatCompactNumber(change);

            changes.push({
                month: currentMonth,
                change: change,
                formatted: formattedChange
            });
        }
    }

    return changes;
}

function formatChange(change) {
    if (change === null) return '—';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
}

function createIndicatorCard(indicator) {
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    let latestDataHtml = '';
    let historyDataHtml = '';
    let hasHistory = false;

    const momChange = calculateMoMChange(indicator);

    // Special handling for different indicator types
    if (indicator.name.includes('FOMC') && indicator.bps_probabilities) {
        latestDataHtml += `<div class="latest-data-row"><span class="month-label">Next Meeting:</span> <span class="month-value">${indicator.next_meeting || ''}</span></div>`;
        Object.entries(indicator.bps_probabilities).forEach(([bps, prob]) => {
            if (prob) historyDataHtml += `<div class="data-row"><span class="month-label">${bps}:</span> <span class="month-value">${prob}</span></div>`;
        });
        hasHistory = true;
    } else if (indicator.name.includes('Recession')) {
        if (indicator.yes_probability) latestDataHtml += `<div class="latest-data-row"><span class="month-label">Recession Probability:</span> <span class="month-value">${indicator.yes_probability}</span></div>`;
        if (indicator.no_probability) historyDataHtml += `<div class="data-row"><span class="month-label">No Recession:</span> <span class="month-value">${indicator.no_probability}</span></div>`;
        hasHistory = true;
    } else if (indicator.name.includes('@')) {
        // Sports/Game logic
        if (indicator.game_title) latestDataHtml += `<div class="latest-data-row"><span class="month-label">Game:</span> <span class="month-value">${indicator.game_title}</span></div>`;
        if (indicator.game_time) historyDataHtml += `<div class="data-row"><span class="month-label">Time:</span> <span class="month-value"><span class="game-countdown" data-game-time="${indicator.game_time_iso}">${indicator.game_time}</span></span></div>`;
        if (indicator.week) historyDataHtml += `<div class="data-row"><span class="month-label">Week:</span> <span class="month-value">${indicator.week}</span></div>`;
        Object.keys(indicator).filter(key => key.endsWith('_win_odds')).forEach(key => {
            const teamName = key.replace('_win_odds', '').toUpperCase();
            historyDataHtml += `<div class="data-row"><span class="month-label">${teamName} Win:</span> <span class="month-value">${indicator[key]}</span></div>`;
        });
        if (indicator.total_points) historyDataHtml += `<div class="data-row"><span class="month-label">Total:</span> <span class="month-value">${indicator.total_points}</span></div>`;
        hasHistory = true;
    } else {
        // Standard monthly data
        const availableData = [];

        // Collect all available data points
        months.forEach((month, index) => {
            const value = indicator[month];
            if (value && value !== '' && !value.startsWith('TBD')) {
                availableData.push({
                    month: month,
                    label: monthLabels[index],
                    value: value,
                    index: index
                });
            }
        });

        // Sort by month index descending (latest first)
        availableData.sort((a, b) => b.index - a.index);

        if (availableData.length > 0) {
            // Latest data point
            const latest = availableData[0];
            let extraHtml = '';

            // Special handling for specific indicators
            const cpiYoyData = { march: '2.4%', april: '2.3%', may: '2.4%', june: '2.7%', july: '2.7%', august: '2.9%', september: '3.0%' };

            if (indicator.name === 'Total Nonfarm Employment' || indicator.name === 'Job Openings') {
                const changesMap = {};
                calculateAllMonthlyChanges(indicator).forEach(change => changesMap[change.month] = change);
                const changeObj = changesMap[latest.month];
                if (changeObj) {
                    extraHtml = `<span class="month-change ${changeObj.change >= 0 ? 'change-positive' : 'change-negative'}" style="margin-left:8px; font-weight:600;">${changeObj.formatted}</span>`;
                }
            } else if (indicator.name === 'CPI') {
                if (cpiYoyData[latest.month]) {
                    extraHtml = `<span class="month-change" style="margin-left:8px; font-weight:600;">${cpiYoyData[latest.month]}</span>`;
                }
            }

            latestDataHtml = `<div class="latest-data-row"><span class="month-label">${latest.label}:</span><span class="month-value">${latest.value}${extraHtml}</span></div>`;

            // Show next 2 months as visible (collapsed state shows 3 total)
            let visibleHistoryHtml = '';

            // History data - split into visible (next 2 months) and expandable (rest)
            if (availableData.length > 1) {
                hasHistory = availableData.length > 3; // Only show expand button if more than 3 months

                for (let i = 1; i < availableData.length; i++) {
                    const item = availableData[i];
                    let historyExtraHtml = '';

                    if (indicator.name === 'Total Nonfarm Employment' || indicator.name === 'Job Openings') {
                        const changesMap = {};
                        calculateAllMonthlyChanges(indicator).forEach(change => changesMap[change.month] = change);
                        const changeObj = changesMap[item.month];
                        if (changeObj) {
                            historyExtraHtml = `<span class="month-change ${changeObj.change >= 0 ? 'change-positive' : 'change-negative'}" style="margin-left:8px; font-weight:600;">${changeObj.formatted}</span>`;
                        }
                    } else if (indicator.name === 'CPI') {
                        if (cpiYoyData[item.month]) {
                            historyExtraHtml = `<span class="month-change" style="margin-left:8px; font-weight:600;">${cpiYoyData[item.month]}</span>`;
                        }
                    }

                    const rowHtml = `<div class="data-row"><span class="month-label">${item.label}:</span><span class="month-value">${item.value}${historyExtraHtml}</span></div>`;

                    // First 2 items (index 1 and 2) go to visible, rest go to expandable
                    if (i <= 2) {
                        visibleHistoryHtml += rowHtml;
                    } else {
                        historyDataHtml += rowHtml;
                    }
                }
            }

            // Add visible history to latest data
            latestDataHtml += visibleHistoryHtml;
        } else {
            latestDataHtml = `<div class="latest-data-row"><span class="month-label">Status:</span><span class="month-value">No Data</span></div>`;
        }
    }

    const url = indicator.url || '#';
    const explanation = indicator.explanation || '';
    let changeIndicators = '';

    if (momChange !== null) {
        const momFormatted = formatChange(momChange.percentChange);
        let changeText = `<span class="mom-label">MoM:</span> <span class="mom-value">${momFormatted}</span>`;

        if (['Private Employment', 'Total Nonfarm Employment', 'Job Openings'].includes(indicator.name)) {
            const numberChange = momChange.numberChange;
            const compactChange = formatCompactNumber(numberChange).replace(/^\+/, ''); // Remove leading + since we add it in parentheses
            changeText += ` <span class="mom-number">(${numberChange >= 0 ? '+' : ''}${compactChange})</span>`;
        }

        const arrowIcon = momChange.numberChange >= 0 ? '<i data-lucide="arrow-up-right"></i>' : '<i data-lucide="arrow-down-right"></i>';
        const title = indicator.name === 'Total Nonfarm Employment' ? "Latest monthly change in nonfarm payroll employment" : "Month-over-Month (MoM) change calculated from available data.";

        changeIndicators += `<div class="change-indicator ${getChangeClass(momFormatted)}" title="${title}"><button class="change-arrow-button" aria-label="Change direction"><span class="arrow-icon">${arrowIcon}</span></button><div class="change-text">${changeText}</div></div>`;
    }

    return `
        <div class="indicator ${indicator.category === 'Prediction Markets' ? 'expanded' : ''}" data-indicator-name="${indicator.name.replace(/"/g, '&quot;')}">
            <div class="indicator-header">
                <div class="indicator-name">
                    ${indicator.name}
                </div>
                <div class="indicator-actions">
                    ${explanation ? `<i data-lucide="info" class="info-icon" data-explanation="${explanation.replace(/"/g, '&quot;')}" title="Show explanation"></i>` : ''}
                    ${indicator.category !== 'Prediction Markets' ? `<i data-lucide="bar-chart-3" class="chart-icon" title="View Interactive Chart"></i>` : ''}
                    ${hasHistory ? `<button class="expand-toggle" aria-label="Toggle history"><i data-lucide="chevron-down"></i></button>` : ''}
                </div>
            </div>
            
            <div class="indicator-agency">
                Source: <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">${indicator.agency}</a>
                ${indicator.category === 'Prediction Markets' && indicator.kalshi_url ? ` | <a href="${indicator.kalshi_url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">Kalshi</a>` : ''}
                ${indicator.category === 'Prediction Markets' && indicator.polymarket_url ? ` | <a href="${indicator.polymarket_url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">Polymarket</a>` : ''}
            </div>
            
            ${changeIndicators ? `<div class="change-indicators">${changeIndicators}</div>` : ''}

            <div class="indicator-content">
                ${latestDataHtml}
                
                <div class="explanation-text" style="display: none; margin-top: 8px; padding: 8px; background: var(--bg-secondary, #f5f5f5); border-radius: 4px; font-size: 0.9em; color: var(--text-secondary, #666);"></div>

                ${hasHistory ? `
                    <div class="data-rows-container">
                        ${historyDataHtml}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

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

function setupInfoIconHandlers() {
    document.querySelectorAll('.info-icon').forEach(icon => {
        icon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const indicator = this.closest('.indicator');
            const explanationDiv = indicator.querySelector('.explanation-text');
            const explanation = this.dataset.explanation;

            if (explanationDiv.style.display === 'none') {
                explanationDiv.textContent = explanation;
                explanationDiv.style.display = 'block';
                this.classList.add('active');
            } else {
                explanationDiv.style.display = 'none';
                this.classList.remove('active');
            }
        });
    });
}

function setupExpandHandlers() {
    document.querySelectorAll('.expand-toggle').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const indicator = this.closest('.indicator');
            indicator.classList.toggle('expanded');
        });
    });
}

function renderDashboard(filterCategory = 'all', sortByLatest = false) {
    const categoriesContainer = document.getElementById('categories');
    let categories = [...new Set(financialData.indices.map(item => item.category))];

    let html = '';

    if (sortByLatest) {
        // Sort all indicators by latest data and display in single "Latest Updates" section
        const allIndicators = financialData.indices.slice(); // copy array
        // Primary sort: by explicit lastUpdated timestamp (descending)
        allIndicators.sort((a, b) => {
            const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
            const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
            
            // Both have lastUpdated - sort by timestamp
            if (dateA > 0 && dateB > 0) {
                return dateB - dateA; // newest first
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
                    ${allIndicators.map(indicator => createIndicatorCard(indicator)).join('')}
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
                        ${categoryIndicators.map(indicator => createIndicatorCard(indicator)).join('')}
                    </div>
                </div>
            `;
        });
    }

    categoriesContainer.innerHTML = html;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    setupInfoIconHandlers();
    setupChartIconHandlers();
    setupExpandHandlers();

    if (typeof updateAllCountdowns === 'function') updateAllCountdowns();
}

function setupFilters() {
    const categories = [...new Set(financialData.indices.map(item => item.category))];
    const categoryDropdown = document.getElementById('categoryDropdown');
    const desktopFilters = document.getElementById('desktopFilters');

    // Populate category dropdown and desktop filters
    // Reset content
    categoryDropdown.innerHTML = '';
    desktopFilters.innerHTML = '';

    // Helper to create filter elements
    const createFilterElements = (id, iconClass, text, isLatest = false) => {
        // Dropdown item
        const dropItem = document.createElement('button');
        dropItem.className = 'dropdown-item';
        if (id === 'all') dropItem.classList.add('active');
        if (isLatest) {
            dropItem.dataset.sort = 'latest';
            dropItem.dataset.isLatest = 'true';
        } else {
            dropItem.dataset.category = id;
        }
        dropItem.innerHTML = `${iconClass}<span>${text}</span>`;
        categoryDropdown.appendChild(dropItem);

        // Desktop button
        const deskBtn = document.createElement('button');
        deskBtn.className = 'filter-btn desktop-filter-btn';
        if (id === 'all') deskBtn.classList.add('active');
        if (isLatest) {
            deskBtn.dataset.sort = 'latest';
            deskBtn.dataset.isLatest = 'true';
        } else {
            deskBtn.dataset.category = id;
        }
        deskBtn.innerHTML = `${iconClass}<span>${text}</span>`;
        desktopFilters.appendChild(deskBtn);
    };

    // Add "All"
    createFilterElements('all', '<i data-lucide="list" class="filter-icon"></i>', 'All');

    // Add "Latest"
    createFilterElements('latest', '<i data-lucide="clock" class="filter-icon"></i>', 'Latest', true);

    // Add Categories
    categories.forEach(category => {
        const icon = categoryIcons[category] || '<i data-lucide="bar-chart-2" class="filter-icon"></i>';
        createFilterElements(category, icon, category);
    });

    // Setup dropdown toggle functionality
    setupDropdownToggle('categoryBtn', 'categoryDropdown');

    // Setup dropdown item clicks
    document.getElementById('categoryDropdown').addEventListener('click', function (e) {
        const item = e.target.closest('.dropdown-item');
        if (item) {
            handleFilterClick(item, 'dropdown');
            closeAllDropdowns();
        }
    });

    // Setup desktop button clicks
    desktopFilters.addEventListener('click', function (e) {
        const btn = e.target.closest('.filter-btn');
        if (btn) {
            handleFilterClick(btn, 'desktop');
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.filter-group') && !e.target.closest('.filter-dropdown')) {
            closeAllDropdowns();
        }
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function handleFilterClick(element, source) {
    const category = element.dataset.category;
    const isLatest = element.dataset.isLatest === 'true';

    // Update dropdown items
    document.querySelectorAll('#categoryDropdown .dropdown-item').forEach(i => {
        i.classList.remove('active');
        if ((isLatest && i.dataset.isLatest === 'true') || (!isLatest && i.dataset.category === category)) {
            i.classList.add('active');
        }
    });

    // Update desktop buttons
    document.querySelectorAll('#desktopFilters .filter-btn').forEach(b => {
        b.classList.remove('active');
        if ((isLatest && b.dataset.isLatest === 'true') || (!isLatest && b.dataset.category === category)) {
            b.classList.add('active');
        }
    });

    // Render
    if (isLatest) {
        renderDashboard('all', true);
    } else {
        currentCategory = category || 'all';
        renderDashboard(currentCategory, false);
    }
}

function setupDropdownToggle(btnId, dropdownId) {
    const btn = document.getElementById(btnId);
    const dropdown = document.getElementById(dropdownId);
    const group = btn.closest('.filter-group');

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        closeAllDropdowns();
        dropdown.classList.add('open');
        group.classList.add('open');
    });
}

function closeAllDropdowns() {
    document.querySelectorAll('.filter-dropdown').forEach(d => d.classList.remove('open'));
    document.querySelectorAll('.filter-group').forEach(g => g.classList.remove('open'));
}

let currentCategory = 'all';

function initializeDashboard() {
    document.getElementById('lastUpdated').textContent = `Last Updated: ${formatDate(financialData.lastUpdated)}`;
    setupFilters();
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilter = urlParams.get('filter') || 'all';

    // Set active state for desktop buttons
    document.querySelectorAll('.desktop-filter-btn').forEach(btn => {
        if (btn.dataset.category === initialFilter) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Set active state for dropdown items
    document.querySelectorAll('.dropdown-item').forEach(item => {
        if (item.dataset.category === initialFilter) item.classList.add('active');
        else item.classList.remove('active');
    });

    renderDashboard(initialFilter);
    setupModalHandlers();
}

// Chart overlay functionality
function setupChartIconHandlers() {
    document.querySelectorAll('.chart-icon').forEach(icon => {
        icon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const indicator = this.closest('.indicator');
            const indicatorName = indicator.dataset.indicatorName;
            toggleChartOverlay(indicator, indicatorName);
        });
    });
}

function toggleChartOverlay(indicator, indicatorName) {
    let overlay = indicator.querySelector('.chart-overlay');

    if (overlay) {
        if (overlay.classList.contains('show')) hideChartOverlay(overlay);
        else showChartOverlay(indicator, indicatorName, overlay);
    } else {
        createChartOverlay(indicator, indicatorName);
    }
}

function createChartOverlay(indicator, indicatorName) {
    const overlay = document.createElement('div');
    overlay.className = 'chart-overlay';
    overlay.innerHTML = `
        <h4 class="chart-overlay-title-floating">${indicatorName}</h4>
        <button class="chart-overlay-close">&times;</button>
        <div class="chart-overlay-body">
            <div class="chart-overlay-loading">
                <div class="chart-overlay-loading-spinner"></div>
                <span>Loading chart...</span>
            </div>
        </div>
    `;

    indicator.appendChild(overlay);

    const closeBtn = overlay.querySelector('.chart-overlay-close');
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideChartOverlay(overlay);
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) hideChartOverlay(overlay);
    });

    showChartOverlay(indicator, indicatorName, overlay);
}

function showChartOverlay(indicator, indicatorName, overlay) {
    document.querySelectorAll('.chart-overlay.show').forEach(otherOverlay => {
        if (otherOverlay !== overlay) hideChartOverlay(otherOverlay);
    });

    overlay.classList.add('show');
    loadChartInOverlay(indicator, indicatorName, overlay);

    const chartIcon = indicator.querySelector('.chart-icon');
    if (chartIcon) chartIcon.classList.add('active');
}

function hideChartOverlay(overlay) {
    overlay.classList.remove('show');

    const indicator = overlay.closest('.indicator');
    const chartIcon = indicator.querySelector('.chart-icon');
    if (chartIcon) chartIcon.classList.remove('active');

    setTimeout(() => {
        if (overlay.parentNode && !overlay.classList.contains('show')) {
            overlay.parentNode.removeChild(overlay);
        }
    }, 300);
}

async function loadChartInOverlay(indicator, indicatorName, overlay) {
    const body = overlay.querySelector('.chart-overlay-body');

    try {
        const chartConfig = await getChartConfig(indicatorName);

        if (chartConfig && chartConfig.data) {
            const loading = body.querySelector('.chart-overlay-loading');
            if (loading) loading.remove();

            const canvas = document.createElement('canvas');
            canvas.className = 'chart-overlay-canvas';
            canvas.id = `overlay-${indicatorName.replace(/\s+/g, '-').toLowerCase()}-chart`;
            body.appendChild(canvas);

            const chartInstance = initializeChartInOverlay(chartConfig, canvas);
            if (chartInstance) overlay._chartInstance = chartInstance;
        } else {
            showOverlayError(body, 'Chart data not available');
        }
    } catch (error) {
        console.error('Error loading chart in overlay:', error);
        showOverlayError(body, 'Error loading chart');
    }
}

function showOverlayError(body, message) {
    const loading = body.querySelector('.chart-overlay-loading');
    if (loading) loading.remove();

    body.innerHTML = `<div class="chart-overlay-error"><div class="chart-overlay-error-icon">📊</div><p>${message}</p></div>`;
}

function initializeChartInOverlay(chartConfig, canvas) {
    if (!chartConfig.data) return null;

    const ctx = canvas.getContext('2d');

    if (window[canvas.id + 'Chart']) window[canvas.id + 'Chart'].destroy();

    // Determine chart type based on config
    const isMixedChart = chartConfig.type === 'chartjs-mixed';
    const chartType = isMixedChart ? 'bar' : 'line';

    // Build scales based on chart type
    const scales = {
        x: { display: true, grid: { display: false, drawBorder: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 4, padding: 2, font: { size: 9 } } }
    };

    if (isMixedChart) {
        // Dual Y-axes for mixed chart
        scales.y = {
            display: true,
            beginAtZero: false,
            grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
            ticks: { padding: 2, font: { size: 9 }, callback: function (value) { if (value >= 1000) return (value / 1000).toFixed(1) + 'K'; return value.toLocaleString(); } },
            position: 'left',
            title: { display: true, text: 'Imports / Exports (Billions)', font: { size: 10, weight: 'bold' } }
        };
        scales.y1 = {
            display: true,
            beginAtZero: false,
            grid: { display: false },
            ticks: { padding: 2, font: { size: 9 }, callback: function (value) { if (value >= 1000) return (value / 1000).toFixed(1) + 'K'; return value.toLocaleString(); } },
            position: 'right',
            title: { display: true, text: 'Trade Deficit (Billions)', font: { size: 10, weight: 'bold' } }
        };
    } else {
        // Single Y-axis for standard line chart
        scales.y = {
            display: true,
            beginAtZero: false,
            grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
            ticks: { padding: 2, font: { size: 9 }, callback: function (value) { if (value >= 1000) return (value / 1000).toFixed(1) + 'K'; return value.toLocaleString(); } },
            position: 'right'
        };
    }

    const chartInstance = new Chart(ctx, {
        type: chartType,
        data: chartConfig.data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 15, right: 0, bottom: 25, left: 10 } },
            animation: { duration: 600, easing: 'easeInOutQuart' },
            plugins: {
                legend: { display: true, position: 'top', labels: { font: { size: 10 }, padding: 10, boxWidth: 12 } },
                title: { display: false },
                tooltip: {
                    mode: 'index', intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff',
                    borderColor: '#2C5F5A', borderWidth: 1, padding: 8,
                    titleFont: { size: 11 }, bodyFont: { size: 11 }, boxPadding: 4,
                    callbacks: {
                        title: function (context) {
                            if (context.length > 0) {
                                return context[0].label;
                            }
                            return '';
                        },
                        label: function (context) {
                            if (context.parsed.y !== null) {
                                return context.dataset.label + ': ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(context.parsed.y) + 'B';
                            }
                            return '';
                        }
                    }
                }
            },
            scales: scales,
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });

    window[canvas.id + 'Chart'] = chartInstance;
    return chartInstance;
}

function getChartConfig(indicatorName) {
    const indicatorData = financialData.indices.find(item => item.name.trim().toLowerCase() === indicatorName.trim().toLowerCase());
    if (!indicatorData) return null;

    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const labels = [];
    const values = [];

    // Check if this is Trade Deficit with imports/exports data
    if (indicatorName === 'Trade Deficit' && indicatorData.imports && indicatorData.exports) {
        const importValues = [];
        const exportValues = [];
        const deficitValues = [];

        months.forEach((month, index) => {
            const importValue = indicatorData.imports[month];
            const exportValue = indicatorData.exports[month];
            const deficitValue = indicatorData[month];

            if (importValue && exportValue && deficitValue && 
                !importValue.startsWith('TBD') && !exportValue.startsWith('TBD') && !deficitValue.startsWith('TBD')) {
                const numImport = extractNumericValue(importValue);
                const numExport = extractNumericValue(exportValue);
                const numDeficit = extractNumericValue(deficitValue);

                if (numImport !== null && numExport !== null && numDeficit !== null) {
                    labels.push(monthLabels[index]);
                    importValues.push(numImport);
                    exportValues.push(numExport);
                    deficitValues.push(numDeficit);
                }
            }
        });

        const data = {
            labels: labels,
            datasets: [
                {
                    label: 'Imports',
                    data: importValues,
                    type: 'bar',
                    backgroundColor: 'rgba(255, 107, 107, 0.7)',
                    borderColor: '#FF6B6B',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Exports',
                    data: exportValues,
                    type: 'bar',
                    backgroundColor: 'rgba(81, 207, 102, 0.7)',
                    borderColor: '#51CF66',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Trade Deficit',
                    data: deficitValues,
                    type: 'line',
                    borderColor: '#2C5F5A',
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y1',
                    pointBackgroundColor: '#2C5F5A',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1.5,
                    pointRadius: 4
                }
            ]
        };

        return { type: 'chartjs-mixed', data: data };
    }

    // Standard single-line chart
    months.forEach((month, index) => {
        const value = indicatorData[month];
        if (value && value !== '' && !value.startsWith('TBD')) {
            const numValue = extractNumericValue(value);
            if (numValue !== null) {
                labels.push(monthLabels[index]);
                values.push(numValue);
            }
        }
    });

    const data = {
        labels: labels,
        datasets: [{
            label: indicatorName,
            data: values,
            borderColor: '#2C5F5A',
            backgroundColor: 'rgba(44, 95, 90, 0.1)',
            tension: 0.4,
            fill: true
        }]
    };

    return { type: 'chartjs', data: data };
}

// Modal handlers (simplified)
function setupModalHandlers() {
    const modal = document.getElementById('chartModal');
    if (!modal) return;

    const closeBtn = document.getElementById('closeChartModal');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => { modal.style.display = 'none'; });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', function () {
    fetchFinancialData();
    if (typeof lucide !== 'undefined') lucide.createIcons();
});
