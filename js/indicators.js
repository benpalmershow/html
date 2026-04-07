// Indicator card creation and rendering
// SOLID: Open/Closed via IndicatorTypeRegistry, Single Responsibility via extracted helpers

const IndicatorRenderers = (function () {
    'use strict';

    const registry = new Services.Registry('IndicatorRenderers');

    // --- Shared data extraction helpers (SRP) ---

    function collectMonthlyData(indicator, MONTHS, MONTH_LABELS) {
        const yearKeys = Object.keys(indicator)
            .filter(key => /^\d{4}$/.test(key))
            .map(key => parseInt(key))
            .sort((a, b) => b - a);

        const availableData = [];

        MONTHS.forEach((month, index) => {
            let value = null;
            let year = null;

            for (const yr of yearKeys) {
                if (indicator[yr] && indicator[yr][month] !== undefined) {
                    value = indicator[yr][month];
                    year = yr;
                    break;
                }
            }

            if (value === null) {
                value = indicator[month];
                year = null;
            }

            if (isValidData(value)) {
                availableData.push({ month, label: MONTH_LABELS[index], value, index, year });
            }
        });

        availableData.sort((a, b) => {
            if (a.year !== null && b.year !== null) {
                if (a.year !== b.year) return b.year - a.year;
            }
            if (a.year !== null && b.year === null) return -1;
            if (a.year === null && b.year !== null) return 1;
            return b.index - a.index;
        });

        return availableData;
    }

    function collectSparklineValues(indicator, MONTHS) {
        const sparklineValues = [];
        const yearKeys = Object.keys(indicator).filter(key => /^\d{4}$/.test(key)).map(k => parseInt(k)).sort();

        MONTHS.forEach(month => {
            const flatVal = extractNumericValue(indicator[month]);
            if (flatVal !== null) sparklineValues.push(flatVal);
        });

        yearKeys.forEach(year => {
            MONTHS.forEach(month => {
                if (indicator[year] && indicator[year][month] !== undefined) {
                    const val = extractNumericValue(indicator[year][month]);
                    if (val !== null) sparklineValues.push(val);
                }
            });
        });

        return sparklineValues;
    }

    // --- Individual Type Renderers (SRP: one responsibility each) ---

    function renderFOMC(indicator) {
        const rows = [];
        if (indicator.meeting_date) rows.push(`<span class="month-label">Meeting:</span> <span class="month-value">${indicator.meeting_date}</span>`);
        if (indicator.rate_hold_odds) rows.push(`<span class="month-label">Hold:</span> <span class="month-value">${indicator.rate_hold_odds}</span>`);
        if (indicator.rate_cut_odds) rows.push(`<span class="month-label">Cut:</span> <span class="month-value">${indicator.rate_cut_odds}</span>`);
        if (indicator.rate_hike_odds) rows.push(`<span class="month-label">Hike:</span> <span class="month-value">${indicator.rate_hike_odds}</span>`);

        let latestDataHtml = '';
        let historyDataHtml = '';
        rows.forEach((row, i) => {
            if (i < 2) latestDataHtml += `<div class="latest-data-row">${row}</div>`;
            else historyDataHtml += `<div class="data-row">${row}</div>`;
        });

        return { latestDataHtml, historyDataHtml, hasHistory: rows.length > 2 };
    }

    function renderRecession(indicator) {
        let latestDataHtml = '';
        if (indicator.yes_probability) latestDataHtml += `<div class="latest-data-row"><span class="month-label">Recession Probability:</span> <span class="month-value">${indicator.yes_probability}</span></div>`;
        if (indicator.no_probability) latestDataHtml += `<div class="latest-data-row"><span class="month-label">No Recession:</span> <span class="month-value">${indicator.no_probability}</span></div>`;
        return { latestDataHtml, historyDataHtml: '', hasHistory: false };
    }

    function renderPrediction(indicator) {
        let latestDataHtml = '';
        if (indicator.yes_probability) latestDataHtml += `<div class="latest-data-row"><span class="month-label">Yes:</span> <span class="month-value">${indicator.yes_probability}</span></div>`;
        if (indicator.no_probability) latestDataHtml += `<div class="latest-data-row"><span class="month-label">No:</span> <span class="month-value">${indicator.no_probability}</span></div>`;
        return { latestDataHtml, historyDataHtml: '', hasHistory: false };
    }

    function renderSports(indicator) {
        const rows = [];
        if (indicator.game_title) rows.push(`<span class="month-label">Game:</span> <span class="month-value">${indicator.game_title}</span>`);
        if (indicator.game_time) rows.push(`<span class="month-label">Time:</span> <span class="month-value"><span class="game-countdown" data-game-time="${indicator.game_time_iso}">${indicator.game_time}</span></span>`);
        if (indicator.week) rows.push(`<span class="month-label">Week:</span> <span class="month-value">${indicator.week}</span>`);
        Object.keys(indicator).filter(key => key.endsWith('_win_odds')).forEach(key => {
            const teamName = key.replace('_win_odds', '').toUpperCase();
            rows.push(`<span class="month-label">${teamName} Win:</span> <span class="month-value">${indicator[key]}</span>`);
        });
        if (indicator.total_points) rows.push(`<span class="month-label">Total:</span> <span class="month-value">${indicator.total_points}</span>`);

        let latestDataHtml = '';
        let historyDataHtml = '';
        rows.forEach((row, i) => {
            if (i < 2) latestDataHtml += `<div class="latest-data-row">${row}</div>`;
            else historyDataHtml += `<div class="data-row">${row}</div>`;
        });

        return { latestDataHtml, historyDataHtml, hasHistory: rows.length > 2 };
    }

    function renderVenezuela(indicator) {
        let latestDataHtml = '';
        let historyDataHtml = '';
        let hasHistory = false;

        if (indicator.candidates && typeof indicator.candidates === 'object') {
            const entries = Object.entries(indicator.candidates);
            entries.forEach(([name, prob], i) => {
                if (i < 2) {
                    latestDataHtml += `<div class="latest-data-row"><span class="month-label">${name}:</span> <span class="month-value">${prob}</span></div>`;
                } else {
                    historyDataHtml += `<div class="data-row"><span class="month-label">${name}:</span> <span class="month-value">${prob}</span></div>`;
                }
            });
            hasHistory = entries.length > 2;
        }

        return { latestDataHtml, historyDataHtml, hasHistory };
    }

    function renderStandard(indicator, MONTHS, MONTH_LABELS) {
        const availableData = collectMonthlyData(indicator, MONTHS, MONTH_LABELS);
        let latestDataHtml = '';
        let historyDataHtml = '';
        let hasHistory = false;

        if (availableData.length > 0) {
            const latest = availableData[0];
            const extraHtml = buildExtraHtml(indicator, latest, MONTHS);
            latestDataHtml = `<div class="latest-data-row"><span class="month-label">${latest.label}:</span><span class="month-value">${latest.value}${extraHtml}</span></div>`;

            if (availableData.length > 1) {
                const second = availableData[1];
                const secondExtraHtml = buildExtraHtml(indicator, second, MONTHS);
                latestDataHtml += `<div class="latest-data-row"><span class="month-label">${second.label}:</span><span class="month-value">${second.value}${secondExtraHtml}</span></div>`;

                hasHistory = availableData.length > 2;
                for (let i = 2; i < availableData.length; i++) {
                    const item = availableData[i];
                    const historyExtraHtml = buildExtraHtml(indicator, item, MONTHS);
                    historyDataHtml += `<div class="data-row"><span class="month-label">${item.label}:</span><span class="month-value">${item.value}${historyExtraHtml}</span></div>`;
                }
            }
        } else {
            latestDataHtml = `<div class="latest-data-row"><span class="month-label">Status:</span><span class="month-value">No Data</span></div>`;
        }

        return { latestDataHtml, historyDataHtml, hasHistory };
    }

    // --- Registry setup (OCP: extend by registering new types) ---

    registry
        .register('fomc', (indicator) => renderFOMC(indicator))
        .register('recession', (indicator) => renderRecession(indicator))
        .register('prediction', (indicator) => renderPrediction(indicator))
        .register('sports', (indicator) => renderSports(indicator))
        .register('venezuela', (indicator) => renderVenezuela(indicator))
        .register('standard', (indicator, MONTHS, MONTH_LABELS) => renderStandard(indicator, MONTHS, MONTH_LABELS))
        .registerFallback((indicator, MONTHS, MONTH_LABELS) => renderStandard(indicator, MONTHS, MONTH_LABELS));

    return { registry, collectMonthlyData, collectSparklineValues };
})();


// --- Type Detection (SRP: separate from rendering) ---

function detectIndicatorType(indicator) {
    if (indicator.name.includes('FOMC') || (indicator.rate_cut_odds || indicator.rate_hold_odds || indicator.rate_hike_odds)) return 'fomc';
    if (indicator.name.includes('Recession')) return 'recession';
    if (indicator.name.includes('@')) return 'sports';
    if (indicator.candidates && typeof indicator.candidates === 'object') return 'venezuela';
    if (indicator.yes_probability && indicator.no_probability) return 'prediction';
    return 'standard';
}

// --- Main rendering function (now delegates to registry) ---

function renderIndicatorData(indicator, type, MONTHS, MONTH_LABELS) {
    const renderer = IndicatorRenderers.registry.get(type);
    if (!renderer) {
        return IndicatorRenderers.registry.resolve('standard', indicator, MONTHS, MONTH_LABELS);
    }
    return renderer(indicator, MONTHS, MONTH_LABELS);
}

// --- Extra HTML builder (SRP) ---

function buildExtraHtml(indicator, dataItem, MONTHS) {
    let extraHtml = '';

    if (indicator.name === 'Total Nonfarm Employment' || indicator.name === 'Job Openings' || indicator.name === 'Private Employment') {
        const changesMap = {};
        calculateAllMonthlyChanges(indicator, MONTHS).forEach(change => changesMap[change.month] = change);
        const changeObj = changesMap[dataItem.month];
        if (changeObj) {
            extraHtml = `<span class="month-change ${changeObj.change >= 0 ? 'change-positive' : 'change-negative'}" style="margin-left:8px; font-weight:600;">${changeObj.formatted}</span>`;
        }
    } else if (indicator.name === 'CPI') {
        let yoyValue = null;

        if (indicator.yoy && dataItem.year && indicator.yoy[dataItem.year] && indicator.yoy[dataItem.year][dataItem.month]) {
            yoyValue = indicator.yoy[dataItem.year][dataItem.month];
        } else if (indicator.yoy && indicator.yoy[dataItem.month]) {
            yoyValue = indicator.yoy[dataItem.month];
        }

        if (yoyValue) {
            extraHtml = `<span class="month-change" style="margin-left:8px; font-weight:600;">${yoyValue}</span>`;
        }
    }

    return extraHtml;
}

// --- Change Metric Button builder (SRP) ---

function buildChangeMetricButton(label, changeInfo, title) {
    const iconName = changeInfo.direction > 0
        ? 'arrow-up-right'
        : changeInfo.direction < 0
            ? 'arrow-down-right'
            : 'minus';

    const topSection = label ? `<span class="change-metric-title">${label}</span>` : '';

    const valueWithoutSign = changeInfo.formatted.replace(/^[+\-]/, '');
    const valueWithIcon = `<i data-lucide="${iconName}" style="display: inline; width: 0.85em; height: 0.85em; vertical-align: -0.05em; margin-right: 2px;"></i>${valueWithoutSign}`;

    return `
        <div class="change-metric-block">
            <button
                type="button"
                class="change-metric-btn ${changeInfo.cssClass}"
                title="${title.replace(/"/g, '&quot;')}"
                aria-label="${label ? label + ' ' : ''}${changeInfo.formatted}"
            >
                ${topSection}
                <span class="change-metric-value">${valueWithIcon}</span>
            </button>
        </div>
    `;
}

// --- Card Creation (delegates to focused helpers) ---

function createIndicatorCard(indicator, MONTHS, MONTH_LABELS, DATA_ATTRS) {
    const momChange = calculateMoMChange(indicator, MONTHS);
    const yoyChange = calculateYoYChange(indicator, MONTHS);
    const indicatorType = detectIndicatorType(indicator);
    const { latestDataHtml, historyDataHtml, hasHistory } = renderIndicatorData(indicator, indicatorType, MONTHS, MONTH_LABELS);

    const url = indicator.url || '#';
    const explanation = indicator.explanation || '';
    const changeIndicators = buildChangeIndicators(momChange, yoyChange, indicator);

    const sparklineValues = indicatorType === 'standard'
        ? IndicatorRenderers.collectSparklineValues(indicator, MONTHS)
        : [];

    return buildIndicatorCardHTML({
        indicator,
        DATA_ATTRS,
        url,
        explanation,
        changeIndicators,
        latestDataHtml,
        historyDataHtml,
        hasHistory,
        sparklineValues
    });
}

function buildChangeIndicators(momChange, yoyChange, indicator) {
    if (momChange === null) return '';

    const isUnemploymentIndicator = indicator.name.includes('Unemployment');
    let result = '';

    const momChangeValue = isUnemploymentIndicator ? -momChange.percentChange : momChange.percentChange;
    const momInfo = formatChangeIndicator(momChangeValue);
    result += buildChangeMetricButton('MoM', momInfo, 'Month over Month');

    if (yoyChange !== null) {
        const yoyChangeValue = isUnemploymentIndicator ? -yoyChange.percentChange : yoyChange.percentChange;
        const yoyInfo = formatChangeIndicator(yoyChangeValue);
        result += buildChangeMetricButton('YoY', yoyInfo, 'Year over Year');
    }

    return result;
}

function buildIndicatorCardHTML({ indicator, DATA_ATTRS, url, explanation, changeIndicators, latestDataHtml, historyDataHtml, hasHistory, sparklineValues }) {
    return `
        <div class="indicator" ${DATA_ATTRS.INDICATOR_NAME}="${indicator.name.replace(/"/g, '&quot;')}">
            <div class="indicator-header">
                <div class="indicator-name">
                    ${indicator.name}
                </div>
                <div class="indicator-actions">
                    ${explanation ? `<button class="info-btn" title="Show explanation" ${DATA_ATTRS.EXPLANATION}="${explanation.replace(/"/g, '&quot;')}"><i data-lucide="info" class="info-icon"></i></button>` : ''}
                    ${indicator.category !== 'Prediction Markets' ? `<button class="chart-btn" title="View Interactive Chart"><i data-lucide="bar-chart-3" class="chart-icon"></i></button>` : ''}
                    ${hasHistory ? `<button class="expand-toggle" aria-label="Toggle history"><i data-lucide="chevron-down"></i></button>` : ''}
                </div>
            </div>
            
            <div class="indicator-agency">
                Source: <a href="${url}" target="_blank" rel="noopener noreferrer">${indicator.agency}</a>
                ${indicator.portwatch_url ? ` | <a href="${indicator.portwatch_url}" target="_blank" rel="noopener noreferrer">PortWatch</a>` : ''}
                ${indicator.category === 'Prediction Markets' && indicator.kalshi_url ? ` | <a href="${indicator.kalshi_url}" target="_blank" rel="noopener noreferrer">Kalshi</a>` : ''}
                ${indicator.category === 'Prediction Markets' && indicator.polymarket_url ? ` | <a href="${indicator.polymarket_url}" target="_blank" rel="noopener noreferrer">Polymarket</a>` : ''}
                ${indicator.lastUpdated ? ` | <span class="indicator-date">${new Date(indicator.lastUpdated).getMonth() + 1}/${new Date(indicator.lastUpdated).getDate()}</span>` : ''}
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
            ${sparklineValues.length > 2 ? `<div class="sparkline-container"><canvas data-sparkline='${JSON.stringify(sparklineValues)}'></canvas></div>` : ''}
        </div>
    `;
}

// --- Sparkline rendering (SRP) ---

function renderSparklines() {
    document.querySelectorAll('.sparkline-container canvas[data-sparkline]').forEach(canvas => {
        if (canvas._sparklineRendered) return;
        canvas._sparklineRendered = true;
        try {
            const values = JSON.parse(canvas.dataset.sparkline);
            if (!values || values.length < 3) return;
            const ctx = canvas.getContext('2d');
            const minVal = Math.min(...values);
            const maxVal = Math.max(...values);
            const range = maxVal - minVal || 1;
            const pad = range * 0.1;
            const gradient = ctx.createLinearGradient(0, 0, 0, canvas.parentElement.offsetHeight || 120);
            gradient.addColorStop(0, 'rgba(44, 95, 90, 0.12)');
            gradient.addColorStop(1, 'rgba(44, 95, 90, 0)');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: values.map((_, i) => i),
                    datasets: [{
                        data: values,
                        borderColor: 'rgba(44, 95, 90, 0.18)',
                        backgroundColor: gradient,
                        borderWidth: 1.5,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 0,
                        pointHitRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: { legend: { display: false }, tooltip: { enabled: false } },
                    scales: {
                        x: { display: false },
                        y: { display: false, min: minVal - pad, max: maxVal + pad }
                    },
                    layout: { padding: 0 },
                    elements: { line: { borderCapStyle: 'round' } }
                }
            });
        } catch (e) { /* skip broken sparklines */ }
    });
}
