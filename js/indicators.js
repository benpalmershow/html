// Indicator card creation and rendering

function detectIndicatorType(indicator) {
    if (indicator.name.includes('FOMC') && indicator.bps_probabilities) return 'fomc';
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
            latestDataHtml += `<div class="latest-data-row"><span class="month-label">Next Meeting:</span> <span class="month-value">${indicator.next_meeting || ''}</span></div>`;
            Object.entries(indicator.bps_probabilities).forEach(([bps, prob]) => {
                if (prob) historyDataHtml += `<div class="data-row"><span class="month-label">${bps}:</span> <span class="month-value">${prob}</span></div>`;
            });
            hasHistory = true;
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

            // Collect all available data points
            MONTHS.forEach((month, index) => {
                const value = indicator[month];
                if (isValidData(value)) {
                    availableData.push({
                        month: month,
                        label: MONTH_LABELS[index],
                        value: value,
                        index: index
                    });
                }
            });

            // Sort by month index descending (latest first)
            availableData.sort((a, b) => b.index - a.index);

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
     const cpiYoyData = { march: '2.4%', april: '2.3%', may: '2.4%', june: '2.7%', july: '2.7%', august: '2.9%', september: '3.0%' };
     let extraHtml = '';
 
     if (indicator.name === 'Total Nonfarm Employment' || indicator.name === 'Job Openings' || indicator.name === 'Private Employment') {
         const changesMap = {};
         calculateAllMonthlyChanges(indicator, MONTHS).forEach(change => changesMap[change.month] = change);
         const changeObj = changesMap[dataItem.month];
         if (changeObj) {
             extraHtml = `<span class="month-change ${changeObj.change >= 0 ? 'change-positive' : 'change-negative'}" style="margin-left:8px; font-weight:600;">${changeObj.formatted}</span>`;
         }
     } else if (indicator.name === 'CPI') {
         if (cpiYoyData[dataItem.month]) {
             extraHtml = `<span class="month-change" style="margin-left:8px; font-weight:600;">${cpiYoyData[dataItem.month]}</span>`;
         }
     }
 
     return extraHtml;
 }

function createIndicatorCard(indicator, MONTHS, MONTH_LABELS, DATA_ATTRS) {
    const momChange = calculateMoMChange(indicator, MONTHS);
    const indicatorType = detectIndicatorType(indicator);
    const { latestDataHtml, historyDataHtml, hasHistory } = renderIndicatorData(indicator, indicatorType, MONTHS, MONTH_LABELS);

    const url = indicator.url || '#';
    const explanation = indicator.explanation || '';
    let changeIndicators = '';

    if (momChange !== null) {
        const changeInfo = formatChangeIndicator(momChange.percentChange);
        let changeText = `<span class="mom-label">MoM:</span> <span class="mom-value">${changeInfo.formatted}</span>`;

        if (['Private Employment', 'Total Nonfarm Employment', 'Job Openings'].includes(indicator.name)) {
            const numberChange = momChange.numberChange;
            const compactChange = formatCompactNumber(numberChange).replace(/^\+/, ''); // Remove leading + since we add it in parentheses
            changeText += ` <span class="mom-number">(${numberChange >= 0 ? '+' : ''}${compactChange})</span>`;
        }

        const arrowIcon = momChange.numberChange >= 0 ? '<i data-lucide="arrow-up-right"></i>' : '<i data-lucide="arrow-down-right"></i>';
        const title = indicator.name === 'Total Nonfarm Employment' ? "Latest monthly change in nonfarm payroll employment" : "Month-over-Month (MoM) change calculated from available data.";

        changeIndicators += `<div class="change-indicator ${changeInfo.cssClass}" title="${title}"><button class="change-arrow-button" aria-label="Change direction"><span class="arrow-icon">${arrowIcon}</span></button><div class="change-text">${changeText}</div></div>`;
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
