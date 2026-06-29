// Chart configuration and initialization

const ChartStrategies = (function () {
    'use strict';

    const registry = new Services.Registry('ChartStrategies');

    function detectChartType(indicator) {
        if (indicator.name === 'Trade Deficit' && indicator.imports && indicator.exports) return 'trade-deficit';
        if (indicator.name === 'Monthly Budget Deficit' && indicator.receipts && indicator.outlays) return 'budget-deficit';
        if (indicator.name === 'KY-04 Massie v. Gallrein') return 'political-poll';
        if (indicator.category === 'Prediction Markets' || indicator.bps_probabilities || indicator.yes_probability || indicator.candidates) return 'prediction-market';
        return 'line';
    }

    return { registry, detectChartType };
})();


let chartOverlayTimeout;
let currentChartIndicatorName = null;
let currentChartFullConfig = null;

const crosshairPlugin = {
    id: 'crosshair',
    afterDraw(chart) {
        const tooltip = chart.tooltip;
        if (!tooltip || !tooltip.opacity) return;

        const ctx = chart.ctx;
        const x = tooltip.caretX;
        const topY = chart.scales.y.top;
        const bottomY = chart.scales.y.bottom;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, topY);
        ctx.lineTo(x, bottomY);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(44, 95, 90, 0.3)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();
    }
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.chart-overlay.show').forEach(overlay => {
            hideChartOverlay(overlay);
        });
    }
});

// --- Chart Lazy Loading with IntersectionObserver ---

const chartObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const overlay = entry.target.closest('.chart-overlay');
            if (overlay && !overlay._chartLoaded) {
                const indicator = overlay.closest('.indicator');
                const indicatorName = indicator?.getAttribute('data-indicator-name');
                if (indicatorName) {
                    loadChartInOverlay(indicator, indicatorName, overlay);
                    overlay._chartLoaded = true;
                }
            }
        }
    });
}, { rootMargin: '50px', threshold: 0.1 });

// --- Overlay Management ---

function showChartOverlay(indicator, indicatorName, overlay) {
    document.querySelectorAll('.chart-overlay.show').forEach(otherOverlay => { if (otherOverlay !== overlay) hideChartOverlay(otherOverlay); });
    overlay.classList.add('show');
    currentChartIndicatorName = indicatorName;
    
    // Use IntersectionObserver for lazy loading
    const canvasContainer = overlay.querySelector('.chart-overlay-body');
    if (canvasContainer) {
        chartObserver.observe(canvasContainer);
    }
    
    // Fallback: load immediately if observer doesn't trigger quickly
    setTimeout(() => {
        if (!overlay._chartLoaded) {
            loadChartInOverlay(indicator, indicatorName, overlay);
            overlay._chartLoaded = true;
        }
    }, 100);
}

function hideChartOverlay(overlay) {
    overlay.classList.remove('show');
    const canvasContainer = overlay.querySelector('.chart-overlay-body');
    if (canvasContainer) {
        chartObserver.unobserve(canvasContainer);
    }
    if (overlay._chartInstance) { overlay._chartInstance.destroy(); overlay._chartInstance = null; }
    overlay._chartLoaded = false;
}

function toggleChartOverlay(indicator, indicatorName) {
    let overlay = indicator.querySelector('.chart-overlay');
    if (overlay) { if (overlay.classList.contains('show')) hideChartOverlay(overlay); else showChartOverlay(indicator, indicatorName, overlay); } else { createChartOverlay(indicator, indicatorName); }
}

function createChartOverlay(indicator, indicatorName) {
    const overlay = document.createElement('div');
    overlay.className = 'chart-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = `<div class="chart-overlay-range-picker" id="chartRangePicker"><button class="range-btn" data-range="3">3M</button><button class="range-btn" data-range="6">6M</button><button class="range-btn active" data-range="12">1Y</button><button class="chart-overlay-close" aria-label="Close chart">&times;</button></div><div class="chart-overlay-body"><div class="chart-overlay-loading"><div class="chart-overlay-loading-spinner"></div><span>Loading chart...</span></div></div>`;
    indicator.appendChild(overlay);
    const closeBtn = overlay.querySelector('.chart-overlay-close');
    closeBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); hideChartOverlay(overlay); });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) hideChartOverlay(overlay); });

    overlay.querySelectorAll('.range-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation();
            overlay.querySelectorAll('.range-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (overlay._chartInstance) { overlay._chartInstance.destroy(); overlay._chartInstance = null; }
            const fullConfig = getChartConfig(indicatorName, window.financialData.indices);
            const slicedConfig = sliceChartDataByRange(fullConfig, btn.dataset.range);
            const body = overlay.querySelector('.chart-overlay-body');
            body.innerHTML = '';
            const canvas = document.createElement('canvas');
            canvas.className = 'chart-overlay-canvas';
            canvas.id = `overlay-${indicatorName.replace(/\s+/g, '-').toLowerCase()}-chart-${Date.now()}`;
            body.appendChild(canvas);
            const chartInstance = initializeChartInOverlay(slicedConfig, canvas);
            if (chartInstance) overlay._chartInstance = chartInstance;
        });
    });

    showChartOverlay(indicator, indicatorName, overlay);
}

async function loadChartInOverlay(indicator, indicatorName, overlay) {
    const body = overlay.querySelector('.chart-overlay-body');
    try {
        // Load Chart.js on-demand if not already present
        if (typeof Chart === 'undefined') {
            await Services.loadExternalModule('https://cdn.jsdelivr.net/npm/chart.js');
        }
        if (!window.financialData || !window.financialData.indices) { showOverlayError(body, 'Financial data not loaded'); return; }
        const chartConfig = getChartConfig(indicatorName, window.financialData.indices);
        if (chartConfig && chartConfig.data) {
            const loading = body.querySelector('.chart-overlay-loading');
            if (loading) loading.remove();
            const existingCanvas = body.querySelector('canvas');
            if (existingCanvas) {
                const existingChartId = existingCanvas.id + 'Chart';
                if (window[existingChartId]) { window[existingChartId].destroy(); window[existingChartId] = null; }
                existingCanvas.remove();
            }
            const activeBtn = overlay.querySelector('.range-btn.active');
            const defaultRange = activeBtn ? activeBtn.dataset.range : '12';
            const slicedConfig = sliceChartDataByRange(chartConfig, defaultRange);
            const canvas = document.createElement('canvas');
            canvas.className = 'chart-overlay-canvas';
            canvas.id = `overlay-${indicatorName.replace(/\s+/g, '-').toLowerCase()}-chart`;
            body.appendChild(canvas);
            const chartInstance = initializeChartInOverlay(slicedConfig, canvas);
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

// --- Chart Initialization ---

function initializeChartInOverlay(chartConfig, canvas) {
    if (!chartConfig.data) return null;
    const ctx = canvas.getContext('2d');
    if (window[canvas.id + 'Chart']) window[canvas.id + 'Chart'].destroy();

    const isBar = chartConfig.type === 'chartjs-bar';
    const isMixedChart = chartConfig.type === 'chartjs-mixed';
    const chartType = isBar ? 'bar' : isMixedChart ? 'bar' : 'line';
    const scales = isBar ? buildBarScales() : buildOverlayScales(isMixedChart);
    const plugins = isBar ? buildBarPlugins(chartConfig) : buildOverlayPlugins(isMixedChart);

    const chartInstance = new Chart(ctx, {
        type: chartType,
        data: chartConfig.data,
        plugins: isBar ? [] : [crosshairPlugin],
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: 0, autoPadding: false },
            animation: { duration: 600, easing: 'easeInOutQuart' },
            plugins,
            scales,
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
    window[canvas.id + 'Chart'] = chartInstance;
    return chartInstance;
}

function buildBarScales() {
    return {
        x: { display: true, grid: { display: false }, ticks: { font: { size: 10 }, color: 'rgba(150,150,150,0.8)' } },
        y: { display: true, beginAtZero: true, max: 100, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { display: false } }
    };
}

function buildBarPlugins(chartConfig) {
    return {
        legend: { display: false },
        tooltip: {
            callbacks: {
                label: (ctx) => `${ctx.parsed.y}%`
            }
        }
    };
}

function buildOverlayScales(isMixedChart) {
    const scales = { x: { display: true, grid: { display: false, drawBorder: false }, ticks: { display: true, font: { size: 9 }, color: 'rgba(0, 0, 0, 0.4)', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } } };
    if (isMixedChart) {
        scales.y = { display: true, beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false }, ticks: { display: false }, position: 'left', title: { display: false } };
        scales.y1 = { display: true, beginAtZero: false, grid: { display: false }, ticks: { display: false }, position: 'right', title: { display: false } };
    } else {
        scales.y = { display: true, beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false }, ticks: { display: false }, position: 'right' };
    }
    return scales;
}

function buildOverlayPlugins(isMixedChart) {
    return {
        legend: { display: isMixedChart, position: 'bottom', align: 'center', labels: { font: { size: isMixedChart ? 9 : 10 }, padding: isMixedChart ? 6 : 12, boxWidth: isMixedChart ? 10 : 14, useBorderRadius: true, borderRadius: 4 } },
        title: { display: false },
        tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff', borderColor: '#2C5F5A', borderWidth: 1, padding: 10, titleFont: { size: 11 }, bodyFont: { size: 11 }, boxPadding: 5, callbacks: { title: function (context) { return context.length > 0 ? context[0].label : ''; }, label: function (context) { if (context.parsed.y !== null) { const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(context.parsed.y); return isMixedChart ? `${context.dataset.label}: ${formatted}` : formatted; } return ''; } } },
        crosshair: false
    };
}

// --- Chart Data Slicing ---

function sliceChartDataByRange(config, months) {
    if (!config || !config.data || months === 'all') return config;
    const count = parseInt(months);
    if (isNaN(count)) return config;
    const slicedConfig = JSON.parse(JSON.stringify(config));
    const totalPoints = slicedConfig.data.labels.length;
    const startIndex = Math.max(0, totalPoints - count);
    slicedConfig.data.labels = slicedConfig.data.labels.slice(startIndex);
    slicedConfig.data.datasets.forEach(ds => { ds.data = ds.data.slice(startIndex); if (ds.backgroundColor && Array.isArray(ds.backgroundColor)) ds.backgroundColor = ds.backgroundColor.slice(startIndex); });
    return slicedConfig;
}

// --- Chart Config Resolver ---

function getChartConfig(indicatorName, indices) {
    const indicatorData = indices.find(item => item.name.trim().toLowerCase() === indicatorName.trim().toLowerCase());
    if (!indicatorData) return null;
    const chartType = ChartStrategies.detectChartType(indicatorData);
    return ChartStrategies.registry.resolve(chartType, indicatorName, indicatorData);
}

// --- Standard Line Chart Strategy ---

function buildStandardLineChartConfig(indicatorName, indicatorData) {
    const yearKeys = Object.keys(indicatorData).filter(key => /^\d{4}$/.test(key)).map(key => parseInt(key)).sort((a, b) => b - a);
    const labels = [], values = [], dataMap = {};
    MONTHS.forEach((month, index) => {
        const value = indicatorData[month];
        if (isValidData(value)) {
            const numValue = extractNumericValue(value);
            if (numValue !== null) dataMap[`${null}-${index}`] = { month, label: MONTH_LABELS[index], value: numValue, monthIndex: index, year: null };
        }
    });
    for (const year of yearKeys) {
        const yearData = indicatorData[year];
        MONTHS.forEach((month, index) => {
            const value = yearData[month];
            if (isValidData(value)) {
                const numValue = extractNumericValue(value);
                if (numValue !== null) dataMap[`${year}-${index}`] = { month, label: MONTH_LABELS[index], value: numValue, monthIndex: index, year };
            }
        });
    }
    const sortedData = Object.values(dataMap).sort((a, b) => {
        if (a.year !== b.year) {
            const yearA = a.year !== null ? a.year : 2025;
            const yearB = b.year !== null ? b.year : 2025;
            return yearA - yearB;
        }
        return a.monthIndex - b.monthIndex;
    });
    sortedData.forEach(item => { labels.push(item.label); values.push(item.value); });
    return { type: 'chartjs', data: { labels, datasets: [{ label: indicatorName, data: values, borderColor: '#2C5F5A', backgroundColor: 'rgba(44, 95, 90, 0.1)', tension: 0.4, fill: true, pointBackgroundColor: '#2C5F5A', pointBorderColor: '#fff', pointBorderWidth: 1.5, pointRadius: 3, pointHoverRadius: 5 }] } };
}

// --- Trade Deficit Chart Strategy ---

function buildTradeDeficitChartConfig(indicatorName, indicatorData) {
    const importValues = [], exportValues = [], deficitValues = [], labels = [];
    const yearKeys = Object.keys(indicatorData).filter(key => /^\d{4}$/.test(key)).map(key => parseInt(key)).sort((a, b) => b - a);
    MONTHS.forEach((month, index) => {
        const importValue = indicatorData.imports[month], exportValue = indicatorData.exports[month], deficitValue = indicatorData[month];
        if (isValidData(importValue) && isValidData(exportValue) && isValidData(deficitValue)) {
            const numImport = extractNumericValue(importValue), numExport = extractNumericValue(exportValue), numDeficit = extractNumericValue(deficitValue);
            if (numImport !== null && numExport !== null && numDeficit !== null) { labels.push(MONTH_LABELS[index]); importValues.push(numImport); exportValues.push(numExport); deficitValues.push(numDeficit); }
        }
    });
    const yearNestedPoints = [];
    for (const year of yearKeys) {
        const yearData = indicatorData[year];
        if (!yearData || typeof yearData !== 'object') continue;
        const importsYear = indicatorData.imports[year], exportsYear = indicatorData.exports[year];
        if (!importsYear || !exportsYear) continue;
        MONTHS.forEach((month, index) => {
            const importValue = importsYear[month], exportValue = exportsYear[month], deficitValue = yearData[month];
            if (isValidData(importValue) && isValidData(exportValue) && isValidData(deficitValue)) {
                const numImport = extractNumericValue(importValue), numExport = extractNumericValue(exportValue), numDeficit = extractNumericValue(deficitValue);
                if (numImport !== null && numExport !== null && numDeficit !== null) yearNestedPoints.push({ year, monthIndex: index, label: MONTH_LABELS[index], numImport, numExport, numDeficit });
            }
        });
    }
    yearNestedPoints.sort((a, b) => a.year !== b.year ? b.year - a.year : b.monthIndex - a.monthIndex);
    yearNestedPoints.slice(0, 2).reverse().forEach(p => { labels.push(p.label); importValues.push(p.numImport); exportValues.push(p.numExport); deficitValues.push(Math.abs(p.numDeficit)); });
    return { type: 'chartjs-mixed', data: { labels, datasets: [{ label: 'Imports', data: importValues, type: 'bar', backgroundColor: 'rgba(255, 107, 107, 0.7)', borderColor: '#FF6B6B', borderWidth: 1, yAxisID: 'y' }, { label: 'Exports', data: exportValues, type: 'bar', backgroundColor: 'rgba(81, 207, 102, 0.7)', borderColor: '#51CF66', borderWidth: 1, yAxisID: 'y' }, { label: 'Deficit', data: deficitValues, type: 'line', borderColor: '#2C5F5A', backgroundColor: 'transparent', borderWidth: 2.5, tension: 0.4, fill: false, yAxisID: 'y1', pointBackgroundColor: '#2C5F5A', pointBorderColor: '#fff', pointBorderWidth: 1.5, pointRadius: 4 }] } };
}

function buildBudgetDeficitChartConfig(indicatorName, indicatorData) {
    const receiptValues = [], outlayValues = [], deficitValues = [], labels = [];
    const yearKeys = Object.keys(indicatorData).filter(key => /^\d{4}$/.test(key)).map(key => parseInt(key)).sort((a, b) => b - a);
    MONTHS.forEach((month, index) => {
        const receiptValue = indicatorData.receipts[month], outlayValue = indicatorData.outlays[month], deficitValue = indicatorData[month];
        if (isValidData(receiptValue) && isValidData(outlayValue) && isValidData(deficitValue)) {
            const numReceipt = extractNumericValue(receiptValue), numOutlay = extractNumericValue(outlayValue), numDeficit = extractNumericValue(deficitValue);
            if (numReceipt !== null && numOutlay !== null && numDeficit !== null) { labels.push(MONTH_LABELS[index]); receiptValues.push(numReceipt); outlayValues.push(numOutlay); deficitValues.push(numDeficit); }
        }
    });
    const yearNestedPoints = [];
    for (const year of yearKeys) {
        const yearData = indicatorData[year];
        if (!yearData || typeof yearData !== 'object') continue;
        const receiptsYear = indicatorData.receipts[year], outlaysYear = indicatorData.outlays[year];
        if (!receiptsYear || !outlaysYear) continue;
        MONTHS.forEach((month, index) => {
            const receiptValue = receiptsYear[month], outlayValue = outlaysYear[month], deficitValue = yearData[month];
            if (isValidData(receiptValue) && isValidData(outlayValue) && isValidData(deficitValue)) {
                const numReceipt = extractNumericValue(receiptValue), numOutlay = extractNumericValue(outlayValue), numDeficit = extractNumericValue(deficitValue);
                if (numReceipt !== null && numOutlay !== null && numDeficit !== null) yearNestedPoints.push({ year, monthIndex: index, label: MONTH_LABELS[index], numReceipt, numOutlay, numDeficit });
            }
        });
    }
    yearNestedPoints.sort((a, b) => a.year !== b.year ? b.year - a.year : b.monthIndex - a.monthIndex);
    yearNestedPoints.slice(0, 2).reverse().forEach(p => { labels.push(p.label); receiptValues.push(p.numReceipt); outlayValues.push(p.numOutlay); deficitValues.push(p.numDeficit); });
    return { type: 'chartjs-mixed', data: { labels, datasets: [{ label: 'Receipts', data: receiptValues, type: 'bar', backgroundColor: 'rgba(81, 207, 102, 0.7)', borderColor: '#51CF66', borderWidth: 1, yAxisID: 'y' }, { label: 'Outlays', data: outlayValues, type: 'bar', backgroundColor: 'rgba(255, 107, 107, 0.7)', borderColor: '#FF6B6B', borderWidth: 1, yAxisID: 'y' }, { label: 'Deficit/Surplus', data: deficitValues, type: 'line', borderColor: '#2C5F5A', backgroundColor: 'rgba(44, 95, 90, 0.2)', borderWidth: 2.5, tension: 0.4, fill: 'origin', yAxisID: 'y1', pointBackgroundColor: '#2C5F5A', pointBorderColor: '#fff', pointBorderWidth: 1.5, pointRadius: 4 }] }, options: { scales: { y1: { type: 'linear', position: 'right', beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.1)' }, ticks: { callback: function(value) { return value >= 0 ? '+' + value : value; } } } }, plugins: { legend: { display: true }, tooltip: { callbacks: { label: function(context) { const val = context.raw; return context.dataset.label + ': ' + (val >= 0 ? '+$' + val + 'M' : '-$' + Math.abs(val) + 'M'); } } }, chartAreaBorder: { borderColor: 'rgba(0, 0, 0, 0.3)', borderWidth: 1 } } } };
}

function buildPredictionMarketChartConfig(indicatorName, indicatorData) {
    // Time-series probability data — render as a line chart over dates
    const probabilities = indicatorData.probabilities || indicatorData.propabilities;
    if (probabilities && typeof probabilities === 'object') {
        const sorted = Object.entries(probabilities)
            .filter(([, v]) => v && v.yes !== undefined)
            .sort(([a], [b]) => new Date(a) - new Date(b));
        if (sorted.length > 1) {
            const labels = sorted.map(([date]) =>
                new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
            );
            const yesValues = sorted.map(([, v]) => parseFloat(v.yes));
            const noValues = sorted.map(([, v]) => parseFloat(v.no));
            return {
                type: 'chartjs-mixed',
                data: {
                    labels,
                    datasets: [
                        { label: 'Yes', data: yesValues, type: 'line', borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.1)', borderWidth: 2.5, tension: 0.4, fill: true, pointRadius: 3, pointHoverRadius: 5 },
                        { label: 'No', data: noValues, type: 'line', borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 2.5, tension: 0.4, fill: true, pointRadius: 3, pointHoverRadius: 5 }
                    ]
                }
            };
        }
    }

    // Snapshot / static probability — render as a doughnut-style bar
    const labels = [], values = [], colors = [];
    if (indicatorData.bps_probabilities) {
        Object.entries(indicatorData.bps_probabilities).forEach(([key, val]) => {
            labels.push(key); values.push(parseFloat(val)); colors.push('#2C5F5A');
        });
    } else if (indicatorData.candidates && typeof indicatorData.candidates === 'object') {
        Object.entries(indicatorData.candidates).forEach(([name, prob]) => {
            const val = parseFloat(String(prob).replace(/[^0-9.-]/g, ''));
            if (!isNaN(val)) { labels.push(name); values.push(val); colors.push('#2C5F5A'); }
        });
    } else if (indicatorData.yes_probability && indicatorData.no_probability) {
        labels.push('Yes', 'No');
        values.push(parseFloat(String(indicatorData.yes_probability).replace(/[^0-9.-]/g, '')));
        values.push(parseFloat(String(indicatorData.no_probability).replace(/[^0-9.-]/g, '')));
        colors.push('#22c55e', '#ef4444');
    }
    return { type: 'chartjs-bar', data: { labels, datasets: [{ label: indicatorName, data: values, backgroundColor: colors }] } };
}

function buildPoliticalPollChartConfig(indicatorName, indicatorData) {
    const labels = [], candidate1Values = [], candidate2Values = [];
    if (indicatorData.probabilities && typeof indicatorData.probabilities === 'object') {
        const sortedDates = Object.keys(indicatorData.probabilities).sort((a, b) => new Date(a) - new Date(b));
        sortedDates.forEach(date => {
            const probs = indicatorData.probabilities[date], candidates = Object.entries(probs);
            if (candidates.length >= 2) {
                const dateLabel = new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                labels.push(dateLabel);
                const [candidate1Name, candidate1Prob] = candidates[0], [candidate2Name, candidate2Prob] = candidates[1];
                const prob1 = parseFloat(String(candidate1Prob).replace(/[^0-9.-]/g, '')), prob2 = parseFloat(String(candidate2Prob).replace(/[^0-9.-]/g, ''));
                candidate1Values.push(prob1);
                candidate2Values.push(prob2);
            }
        });
    }
    return { type: 'chartjs-mixed', data: { labels, datasets: [{ label: 'Massie', data: candidate1Values, type: 'line', borderColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.1)', borderWidth: 2.5, tension: 0.4, fill: true, pointBackgroundColor: '#3498db', pointBorderColor: '#fff', pointBorderWidth: 1.5, pointRadius: 4, pointHoverRadius: 6 }, { label: 'Gallrein', data: candidate2Values, type: 'line', borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.1)', borderWidth: 2.5, tension: 0.4, fill: true, pointBackgroundColor: '#e74c3c', pointBorderColor: '#fff', pointBorderWidth: 1.5, pointRadius: 4, pointHoverRadius: 6 }] } };
}

ChartStrategies.registry
    .register('line', buildStandardLineChartConfig)
    .register('trade-deficit', buildTradeDeficitChartConfig)
    .register('budget-deficit', buildBudgetDeficitChartConfig)
    .register('prediction-market', buildPredictionMarketChartConfig)
    .register('political-poll', buildPoliticalPollChartConfig)
    .register('chartjs-bar', buildPredictionMarketChartConfig);
