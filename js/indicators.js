// Indicator card creation and rendering

function detectIndicatorType(indicator) {
    if (indicator.name.includes('FOMC') || (indicator.rate_cut_odds || indicator.rate_hold_odds || indicator.rate_hike_odds)) return 'fomc';
    if (indicator.name.includes('Recession')) return 'recession';
    if (indicator.name.includes('@')) return 'sports';
    if (indicator.name.includes('Venezuela') && indicator.candidates) return 'venezuela';
    return 'standard';
}

function renderIndicatorData(indicator, type, MONTHS, MONTH_LABELS) {
    let latestDataHtml = '';
    let historyDataHtml = '';
    let hasHistory = false;

    switch (type) {
        case 'fomc':
            if (indicator.meeting_date) latestDataHtml += `<div class="latest-data-row"><span class="month-label">Meeting:</span> <span class="month-value">${indicator.meeting_date}</span></div>`;
            if (indicator.rate_hold_odds) historyDataHtml += `<div class="data-row"><span class="month-label">Hold:</span> <span class="month-value">${indicator.rate_hold_odds}</span></div>`;
            if (indicator.rate_cut_odds) historyDataHtml += `<div class="data-row"><span class="month-label">Cut:</span> <span class="month-value">${indicator.rate_cut_odds}</span></div>`;
            if (indicator.rate_hike_odds) historyDataHtml += `<div class="data-row"><span class="month-label">Hike:</span> <span class="month-value">${indicator.rate_hike_odds}</span></div>`;
            hasHistory = !!(indicator.rate_cut_odds || indicator.rate_hold_odds || indicator.rate_hike_odds);
            break;

        case 'recession':
            if (indicator.yes_probability) latestDataHtml += `<div class="latest-data-row"><span class="month-label">Recession Probability:</span> <span class="month-value">${indicator.yes_probability}</span></div>`;
            if (indicator.no_probability) historyDataHtml += `<div class="data-row"><span class="month-label">No Recession:</span> <span class="month-value">${indicator.no_probability}</span></div>`;
            hasHistory = true;
            break;

        case 'sports':
            if (indicator.game_title) latestDataHtml += `<div class="latest-data-row"><span class="month-label">Game:</span> <span class="month-value">${indicator.game_title}</span></div>`;
            if (indicator.game_time) historyDataHtml += `<div class="data-row"><span class="month-label">Time:</span> <span class="month-value"><span class="game-countdown" data-game-time="${indicator.game_time_iso}">${indicator.game_time}</span></span></div>`;
            if (indicator.week) historyDataHtml += `<div class="data-row"><span class="month-label">Week:</span> <span class="month-value">${indicator.week}</span></div>`;
            Object.keys(indicator).filter(key => key.endsWith('_win_odds')).forEach(key => {
                const teamName = key.replace('_win_odds', '').toUpperCase();
                historyDataHtml += `<div class="data-row"><span class="month-label">${teamName} Win:</span> <span class="month-value">${indicator[key]}</span></div>`;
            });
            if (indicator.total_points) historyDataHtml += `<div class="data-row"><span class="month-label">Total:</span> <span class="month-value">${indicator.total_points}</span></div>`;
            hasHistory = true;
            break;

        case 'venezuela':
            if (indicator.candidates && typeof indicator.candidates === 'object') {
                const candidateEntries = Object.entries(indicator.candidates);
                if (candidateEntries.length > 0) {
                    latestDataHtml += `<div class="latest-data-row"><span class="month-label">${candidateEntries[0][0]}:</span> <span class="month-value">${candidateEntries[0][1]}</span></div>`;
                    for (let i = 1; i < candidateEntries.length; i++) {
                        historyDataHtml += `<div class="data-row"><span class="month-label">${candidateEntries[i][0]}:</span> <span class="month-value">${candidateEntries[i][1]}</span></div>`;
                    }
                    hasHistory = candidateEntries.length > 1;
                }
            }
            break;

        case 'standard': {
            const availableData = [];
            
            // Find year-nested data (keys that are numeric/year-like)
            const yearKeys = Object.keys(indicator)
                .filter(key => /^\d{4}$/.test(key))
                .map(key => parseInt(key))
                .sort((a, b) => b - a); // Sort years descending

            // Collect all available data points
            MONTHS.forEach((month, index) => {
                let value = null;
                let year = null;
                
                // First check year-nested data in descending year order (newest first)
                for (const yr of yearKeys) {
                    if (indicator[yr] && indicator[yr][month] !== undefined) {
                        value = indicator[yr][month];
                        year = yr;
                        break;
                    }
                }
                
                // Fall back to flat structure (e.g., indicator["january"])
                if (value === null) {
                    value = indicator[month];
                    year = null;
                }
                
                if (isValidData(value)) {
                    availableData.push({
                        month: month,
                        label: MONTH_LABELS[index],
                        value: value,
                        index: index,
                        year: year
                    });
                }
            });

            // Sort by year descending (latest first), then by month index descending
            availableData.sort((a, b) => {
                // If both have year data, sort by year first
                if (a.year !== null && b.year !== null) {
                    if (a.year !== b.year) return b.year - a.year;
                }
                // If only one has year data, prioritize it (newer)
                if (a.year !== null && b.year === null) return -1;
                if (a.year === null && b.year !== null) return 1;
                // Otherwise sort by month index
                return b.index - a.index;
            });

            if (availableData.length > 0) {
                const latest = availableData[0];
                let extraHtml = buildExtraHtml(indicator, latest, MONTHS);

                latestDataHtml = `<div class="latest-data-row"><span class="month-label">${latest.label}:</span><span class="month-value">${latest.value}${extraHtml}</span></div>`;

                let visibleHistoryHtml = '';
                if (availableData.length > 1) {
                    hasHistory = availableData.length > 3;

                    for (let i = 1; i < availableData.length; i++) {
                        const item = availableData[i];
                        const historyExtraHtml = buildExtraHtml(indicator, item, MONTHS);
                        const rowHtml = `<div class="data-row"><span class="month-label">${item.label}:</span><span class="month-value">${item.value}${historyExtraHtml}</span></div>`;
                        if (i <= 2) {
                            visibleHistoryHtml += rowHtml;
                        } else {
                            historyDataHtml += rowHtml;
                        }
                    }
                }
                latestDataHtml += visibleHistoryHtml;
            } else {
                latestDataHtml = `<div class="latest-data-row"><span class="month-label">Status:</span><span class="month-value">No Data</span></div>`;
            }
            break;
        }
    }

    return { latestDataHtml, historyDataHtml, hasHistory };
}

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
         
         // Check for year-nested YoY data first (e.g., yoy.2026.january)
         if (indicator.yoy && dataItem.year && indicator.yoy[dataItem.year] && indicator.yoy[dataItem.year][dataItem.month]) {
             yoyValue = indicator.yoy[dataItem.year][dataItem.month];
         }
         // Fall back to flat YoY structure (e.g., yoy.january)
         else if (indicator.yoy && indicator.yoy[dataItem.month]) {
             yoyValue = indicator.yoy[dataItem.month];
         }
         
         if (yoyValue) {
             extraHtml = `<span class="month-change" style="margin-left:8px; font-weight:600;">${yoyValue}</span>`;
         }
     }
 
     return extraHtml;
 }

function buildChangeMetricButton(label, changeInfo, title) {
    const iconName = changeInfo.direction > 0
        ? 'arrow-up-right'
        : changeInfo.direction < 0
            ? 'arrow-down-right'
            : 'minus';

    const topSection = label ? `
                <span class="change-metric-top">
                    <span class="change-metric-title">${label}</span>
                    <span class="change-metric-title-icon ${changeInfo.cssClass}"><i data-lucide="${iconName}"></i></span>
                </span>
            ` : '';

    return `
        <div class="change-metric-block">
            <button
                type="button"
                class="change-metric-btn ${changeInfo.cssClass}"
                title="${title.replace(/"/g, '&quot;')}"
                aria-label="${label ? label + ' ' : ''}${changeInfo.formatted}"
            >
                ${topSection}
                <span class="change-metric-main">
                    <span class="change-metric-value">${changeInfo.formatted}</span>
                </span>
            </button>
        </div>
    `;
}



function createIndicatorCard(indicator, MONTHS, MONTH_LABELS, DATA_ATTRS) {
    const momChange = calculateMoMChange(indicator, MONTHS);
    const yoyChange = calculateYoYChange(indicator, MONTHS);
    const indicatorType = detectIndicatorType(indicator);
    const { latestDataHtml, historyDataHtml, hasHistory } = renderIndicatorData(indicator, indicatorType, MONTHS, MONTH_LABELS);

    const url = indicator.url || '#';
    const explanation = indicator.explanation || '';
    let changeIndicators = '';

    if (momChange !== null) {
         const momInfo = formatChangeIndicator(momChange.percentChange);
         changeIndicators += buildChangeMetricButton('', momInfo, 'Month over Month');

         if (yoyChange !== null) {
             const yoyInfo = formatChangeIndicator(yoyChange.percentChange);
             changeIndicators += buildChangeMetricButton('', yoyInfo, 'Year over Year');
         }
     }

    return `
        <div class="indicator ${indicator.category === 'Prediction Markets' ? 'expanded' : ''}" ${DATA_ATTRS.INDICATOR_NAME}="${indicator.name.replace(/"/g, '&quot;')}">
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
                Source: <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">${indicator.agency}</a>
                ${indicator.category === 'Prediction Markets' && indicator.kalshi_url ? ` | <a href="${indicator.kalshi_url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">Kalshi</a>` : ''}
                ${indicator.category === 'Prediction Markets' && indicator.polymarket_url ? ` | <a href="${indicator.polymarket_url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">Polymarket</a>` : ''}
                ${indicator.lastUpdated ? ` | <span style="color: var(--logo-teal); font-weight: 600;">${new Date(indicator.lastUpdated).getMonth() + 1}/${new Date(indicator.lastUpdated).getDate()}</span>` : ''}
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
