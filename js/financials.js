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
        '/html/json/financials-data.json',
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

function calculateMoMChange(indicator) {
    const months = ['february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
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
    const months = ['february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const changes = [];

    for (let i = 1; i < months.length; i++) {
        const currentMonth = months[i];
        const previousMonth = months[i - 1];

        const currentValue = extractNumericValue(indicator[currentMonth]);
        const previousValue = extractNumericValue(indicator[previousMonth]);

        if (currentValue !== null && previousValue !== null) {
            const change = currentValue - previousValue;
            let formattedChange;
            if (Math.abs(change) >= 1000) {
                formattedChange = change >= 0 ? `+${change.toLocaleString()}` : change.toLocaleString();
            } else {
                formattedChange = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
                formattedChange = formattedChange.replace('.00', '');
            }

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
    const months = ['march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthLabels = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let dataRows = '';

    const momChange = calculateMoMChange(indicator);

    // Handle special indicator types
    if (indicator.name.includes('FOMC') && indicator.bps_probabilities) {
        dataRows += `<div class="data-row"><span class="month-label">Next Meeting:</span> <span class="month-value">${indicator.next_meeting || ''}</span></div>`;
        Object.entries(indicator.bps_probabilities).forEach(([bps, prob]) => {
            if (prob) dataRows += `<div class="data-row"><span class="month-label">${bps}:</span> <span class="month-value">${prob}</span></div>`;
        });
    } else if (indicator.name.includes('Recession')) {
        if (indicator.yes_probability) dataRows += `<div class="data-row"><span class="month-label">Yes:</span> <span class="month-value">${indicator.yes_probability}</span></div>`;
        if (indicator.no_probability) dataRows += `<div class="data-row"><span class="month-label">No:</span> <span class="month-value">${indicator.no_probability}</span></div>`;
    } else if (indicator.name.includes('@')) {
        if (indicator.game_title) dataRows += `<div class="data-row"><span class="month-label">Game:</span> <span class="month-value">${indicator.game_title}</span></div>`;
        if (indicator.game_time) dataRows += `<div class="data-row"><span class="month-label">Time:</span> <span class="month-value"><span class="game-countdown" data-game-time="${indicator.game_time_iso}">${indicator.game_time}</span></span></div>`;
        if (indicator.week) dataRows += `<div class="data-row"><span class="month-label">Week:</span> <span class="month-value">${indicator.week}</span></div>`;
        Object.keys(indicator).filter(key => key.endsWith('_win_odds')).forEach(key => {
            const teamName = key.replace('_win_odds', '').toUpperCase();
            dataRows += `<div class="data-row"><span class="month-label">${teamName} Win:</span> <span class="month-value">${indicator[key]}</span></div>`;
        });
        if (indicator.total_points) dataRows += `<div class="data-row"><span class="month-label">Total:</span> <span class="month-value">${indicator.total_points}</span></div>`;
    } else if (indicator.name === 'Total Nonfarm Employment' || indicator.name === 'Job Openings') {
        const changesMap = {};
        calculateAllMonthlyChanges(indicator).forEach(change => changesMap[change.month] = change);
        months.forEach((month, index) => {
            const value = indicator[month];
            if (value) {
                const changeObj = changesMap[month];
                const changeHtml = changeObj ? `<span class="month-change ${changeObj.change >= 0 ? 'change-positive' : 'change-negative'}" style="margin-left:8px; font-weight:600;">${changeObj.formatted}</span>` : '';
                dataRows += `<div class="data-row"><span class="month-label">${monthLabels[index]}:</span><span class="month-value">${value}${changeHtml}</span></div>`;
            }
        });
    } else if (indicator.name === 'CPI') {
        const cpiYoyData = { march: '3.2%', april: '3.4%', may: '3.3%', june: '3.0%', july: '2.9%', august: '2.5%' };
        months.forEach((month, index) => {
            const value = indicator[month];
            if (value) {
                const yoy = cpiYoyData[month] ? `<span class="month-change" style="margin-left:8px; font-weight:600;">${cpiYoyData[month]}</span>` : '';
                dataRows += `<div class="data-row"><span class="month-label">${monthLabels[index]}:</span><span class="month-value">${value}${yoy}</span></div>`;
            }
        });
    } else {
        months.forEach((month, index) => {
            const value = indicator[month];
            if (value) dataRows += `<div class="data-row"><span class="month-label">${monthLabels[index]}:</span><span class="month-value">${value}</span></div>`;
        });
    }

    const url = indicator.url || '#';
    const explanation = indicator.explanation || '';
    let changeIndicators = '';

    if (momChange !== null) {
        const momFormatted = formatChange(momChange.percentChange);
        let changeText = `MoM: ${momFormatted}`;

        if (['Private Employment', 'Total Nonfarm Employment', 'Job Openings'].includes(indicator.name)) {
            const numberChange = momChange.numberChange;
            changeText += ` (${numberChange >= 0 ? '+' : ''}${numberChange.toLocaleString()})`;
        }

        const arrowIcon = momChange.numberChange >= 0 ? '<i data-lucide="arrow-up-right"></i>' : '<i data-lucide="arrow-down-right"></i>';
        const title = indicator.name === 'Total Nonfarm Employment' ? "Latest monthly change in nonfarm payroll employment" : "Month-over-Month (MoM) change calculated from available data.";

        changeIndicators += `<div class="change-indicator ${getChangeClass(momFormatted)}" title="${title}"><span class="arrow-icon">${arrowIcon}</span> ${changeText}</div>`;
    }

    return `
        <div class="indicator" data-indicator-name="${indicator.name.replace(/"/g, '&quot;')}">
            <div class="indicator-name">
                ${indicator.name}
                ${explanation ? `<i data-lucide="info" class="info-icon" data-explanation="${explanation.replace(/"/g, '&quot;')}" title="Show explanation"></i>` : ''}
                ${indicator.category !== 'Prediction Markets' ? `<i data-lucide="bar-chart-3" class="chart-icon" title="View Interactive Chart"></i>` : ''}
            </div>
            <div class="indicator-agency">
                Source: <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">${indicator.agency}</a>
                ${indicator.category === 'Prediction Markets' && indicator.kalshi_url ? ` | <a href="${indicator.kalshi_url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">Kalshi</a>` : ''}
                ${indicator.category === 'Prediction Markets' && indicator.polymarket_url ? ` | <a href="${indicator.polymarket_url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">Polymarket</a>` : ''}
            </div>
            ${dataRows}
            <div class="change-indicators">${changeIndicators}</div>
            <div class="explanation-text" style="display: none; margin-top: 8px; padding: 8px; background: var(--bg-secondary, #f5f5f5); border-radius: 4px; font-size: 0.9em; color: var(--text-secondary, #666);"></div>
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
    'Prediction Markets': '<i data-lucide="trending-up" class="filter-icon"></i>'
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
                this.style.color = 'var(--primary-color, #2C5F5A)';
            } else {
                explanationDiv.style.display = 'none';
                this.style.color = 'var(--text-muted)';
            }
        });
    });
}

function setupJobsIconHandlers() {
    document.querySelectorAll('.jobs-icon').forEach(icon => {
        icon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const indicator = this.closest('.indicator');
            const dataRows = indicator.querySelectorAll('.data-row');

            const isShowingChanges = indicator.dataset.showingJobChanges === 'true';

            if (!isShowingChanges) {
                const indicatorData = financialData.indices.find(item => item.name === 'Total Nonfarm Employment' && item.agency === 'FRED');

                if (indicatorData) {
                    const monthlyChanges = calculateAllMonthlyChanges(indicatorData);
                    const months = ['march', 'april', 'may', 'june', 'july', 'august'];
                    const monthLabels = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

                    const changesMap = {};
                    monthlyChanges.forEach(change => changesMap[change.month] = change);

                    dataRows.forEach(row => {
                        const monthLabel = row.querySelector('.month-label');
                        const monthValue = row.querySelector('.month-value');

                        if (monthLabel && monthValue) {
                            const monthText = monthLabel.textContent.trim().replace(':', '');
                            const monthIndex = monthLabels.indexOf(monthText);

                            if (monthIndex >= 0) {
                                const monthKey = months[monthIndex];
                                const change = changesMap[monthKey];

                                if (change) {
                                    const changeClass = change.change >= 0 ? 'change-positive' : 'change-negative';
                                    const arrowIcon = change.change >= 0 ? '↗' : '↘';

                                    const jobChangeSpan = document.createElement('span');
                                    jobChangeSpan.className = 'job-change-inline';
                                    jobChangeSpan.innerHTML = ` <span class="${changeClass}" style="font-size: 0.75em; margin-left: 8px; opacity: 0.8;">${arrowIcon}${change.formatted}</span>`;
                                    monthValue.appendChild(jobChangeSpan);
                                }
                            }
                        }
                    });

                    indicator.dataset.showingJobChanges = 'true';
                    this.style.color = 'var(--logo-orange, #D4822A)';
                }
            } else {
                dataRows.forEach(row => {
                    const jobChangeSpan = row.querySelector('.job-change-inline');
                    if (jobChangeSpan) jobChangeSpan.remove();
                });

                indicator.dataset.showingJobChanges = 'false';
                this.style.color = 'var(--logo-orange, #D4822A)';
            }
        });
    });
}

function renderDashboard(filterCategory = 'all') {
    const categoriesContainer = document.getElementById('categories');
    const categories = [...new Set(financialData.indices.map(item => item.category))];

    let html = '';

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

    categoriesContainer.innerHTML = html;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    setupInfoIconHandlers();
    setupChartIconHandlers();

    if (typeof updateAllCountdowns === 'function') updateAllCountdowns();
}

function setupFilters() {
    const filtersContainer = document.getElementById('filters');
    const categories = [...new Set(financialData.indices.map(item => item.category))];

    filtersContainer.innerHTML = '';

    const allButton = document.createElement('button');
    allButton.className = 'filter-btn active';
    allButton.dataset.category = 'all';
    allButton.innerHTML = '<i data-lucide="list" class="filter-icon"></i><span class="filter-text">All</span>';
    filtersContainer.appendChild(allButton);

    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        const icon = categoryIcons[category] || '<i data-lucide="bar-chart-2"></i>';
        button.innerHTML = `<span class="filter-icon">${icon}</span><span class="filter-text">${category}</span>`;
        button.dataset.category = category;
        filtersContainer.appendChild(button);
    });

    filtersContainer.addEventListener('click', function (e) {
        const btn = e.target.closest('.filter-btn');
        if (btn) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderDashboard(btn.dataset.category);
        }
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function initializeDashboard() {
    document.getElementById('lastUpdated').textContent = `Last Updated: ${formatDate(financialData.lastUpdated)}`;
    setupFilters();
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilter = urlParams.get('filter') || 'all';

    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.category === initialFilter) btn.classList.add('active');
        else btn.classList.remove('active');
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
        <div class="chart-overlay-header">
            <h4 class="chart-overlay-title">
                <i data-lucide="bar-chart-3"></i>
                ${indicatorName}
            </h4>
            <button class="chart-overlay-close">&times;</button>
        </div>
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

    const chartInstance = new Chart(ctx, {
        type: 'line',
        data: chartConfig.data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 5, right: 5, bottom: 5, left: 5 } },
            animation: { duration: 600, easing: 'easeInOutQuart' },
            plugins: {
                legend: { display: false },
                title: { display: false },
                tooltip: {
                    mode: 'index', intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff',
                    borderColor: '#2C5F5A', borderWidth: 1, padding: 8,
                    titleFont: { size: 11 }, bodyFont: { size: 11 }, boxPadding: 4,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: { display: true, grid: { display: false, drawBorder: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 4, padding: 2, font: { size: 9 } } },
                y: { display: true, beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false }, ticks: { padding: 2, font: { size: 9 }, callback: function (value) { if (value >= 1000) return (value / 1000).toFixed(1) + 'K'; return value.toLocaleString(); } }, position: 'right' }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });

    window[canvas.id + 'Chart'] = chartInstance;
    return chartInstance;
}

function getChartConfig(indicatorName) {
    const indicatorData = financialData.indices.find(item => item.name.trim().toLowerCase() === indicatorName.trim().toLowerCase());
    if (!indicatorData) return null;

    const months = ['march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const monthLabels = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const labels = [];
    const values = [];

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
