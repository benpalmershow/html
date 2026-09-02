// Indicator card creation and rendering

const IndicatorRenderers = (function () {
    'use strict';

    const registry = new Services.Registry('IndicatorRenderers');

    // --- Shared data extraction helpers (SRP) ---

    function formatDateShort(date) {
        return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    }

        const BAR_COLOR_MAP = { 'dem-bar': '#3498db', 'gop-bar': '#e74c3c', 'yes-bar': '#22c55e', 'no-bar': '#ef4444', 'fomc-hold': '#3b82f6', 'fomc-hike': '#f59e0b', 'fomc-cut': '#ef4444' };
    const EARNINGS_TOOLTIP_MAP = {
        marketCap: 'Total market capitalization (share price × shares outstanding). Formula: marketCap = price × sharesOutstanding.',
        enterpriseValue: 'Enterprise value = marketCap + totalDebt – totalCash. Formula: EV = marketCap + totalDebt - totalCash.',
        trailingPE: 'Trailing price‑to‑earnings ratio (last 12 months). Formula: trailingPE = price / EPS (where EPS = netIncome / sharesOutstanding).',
        forwardPE: 'Forward P/E based on projected earnings. Formula: forwardPE = price / forwardEPS.',
        pegRatio: 'Price/Earnings to Growth ratio; lower is better. Formula: PEG = PE / earningsGrowth (%).',
        priceToSalesTrailing12Months: 'Price divided by revenue per share over the last year. Formula: P/S = price / (totalRevenue / sharesOutstanding).',
        priceToBook: 'Price divided by book value per share. Formula: P/B = price / bookValue.',
        grossMargins: 'Gross profit ÷ revenue. Formula: grossMargin = grossProfits / totalRevenue.',
        operatingMargins: 'Operating profit ÷ revenue. Formula: operatingMargin = operatingIncome / totalRevenue.',
        profitMargins: 'Net profit ÷ revenue. Formula: profitMargin = netIncome / totalRevenue.',
        returnOnAssets: 'Net income ÷ total assets. Formula: ROA = netIncome / totalAssets.',
        returnOnEquity: 'Net income ÷ shareholder equity. Formula: ROE = netIncome / (bookValue × sharesOutstanding).',
        revenueGrowth: 'Year‑over‑year revenue growth rate. Formula: (currentRevenue - previousRevenue) / previousRevenue.',
        earningsGrowth: 'Year‑over‑year earnings growth rate. Formula: (currentEarnings - previousEarnings) / previousEarnings.',
        revenuePerShare: 'Revenue divided by number of shares. Formula: revenuePerShare = totalRevenue / sharesOutstanding.',
        freeCashflow: 'Cash generated after capital expenditures. Approximation: freeCashflow = operatingCashflow - capex (capex not provided).',
        operatingCashflow: 'Cash from operating activities (as reported).',
        grossProfits: 'Revenue minus cost of goods sold. Formula: grossProfits = totalRevenue - COGS (COGS not provided).',
        totalCash: 'Total cash and cash equivalents (as reported).',
        totalCashPerShare: 'Cash per share. Formula: totalCashPerShare = totalCash / sharesOutstanding.',
        totalDebt: 'Total debt obligations (as reported).',
        totalRevenue: 'Total revenue (top line).',
        debtToEquity: 'Debt ÷ shareholder equity. Formula: debtToEquity = totalDebt / (bookValue * sharesOutstanding).',
        currentRatio: 'Current assets ÷ current liabilities. (Values not provided; formula shown for reference).',
        quickRatio: 'Liquidity ratio excluding inventories. Formula: quickRatio = (currentAssets - inventories) / currentLiabilities.',
        bookValue: 'Shareholder equity per share. Formula: bookValue = (totalAssets - totalLiabilities) / sharesOutstanding (approximated by provided bookValue).',
        sharesOutstanding: 'Number of shares currently issued.',
        floatShares: 'Shares available for public trading.',
        impliedSharesOutstanding: 'Calculated shares based on market cap. Formula: impliedShares = marketCap / price.'
    };
    function getEarningsTooltip(key, info) {
        switch (key) {
            case 'marketCap':
                if (info.sharesOutstanding) {
                    const price = (info.marketCap / info.sharesOutstanding).toFixed(2);
                    return `Market cap = price × sharesOutstanding = $${price} × ${info.sharesOutstanding.toLocaleString()} = $${info.marketCap.toLocaleString()}`;
                }
                return 'Total market capitalization (share price × shares outstanding).';
            case 'enterpriseValue':
                if (info.marketCap && info.totalDebt && info.totalCash) {
                    const ev = info.marketCap + info.totalDebt - info.totalCash;
                    return `Enterprise value = marketCap + totalDebt – totalCash = $${info.marketCap.toLocaleString()} + $${info.totalDebt.toLocaleString()} – $${info.totalCash.toLocaleString()} = $${ev.toLocaleString()}`;
                }
                return 'Enterprise value = marketCap + totalDebt – totalCash.';
            case 'debtToEquity':
                if (info.totalDebt && info.bookValue && info.sharesOutstanding) {
                    const equity = info.bookValue * info.sharesOutstanding;
                    const ratio = (info.totalDebt / equity).toFixed(2);
                    return `Debt‑to‑equity = totalDebt / (bookValue × sharesOutstanding) = $${info.totalDebt.toLocaleString()} / (${info.bookValue} × ${info.sharesOutstanding.toLocaleString()}) = ${ratio}`;
                }
                return 'Debt ÷ shareholder equity.';
            default:
                return EARNINGS_TOOLTIP_MAP[key] || '';
        }
    }
    function predictionBarRow(name, value, barClass, labelWidth = '90px', fontSize = '12px') {
        const valueColor = BAR_COLOR_MAP[barClass] || '#22c55e';
        const width = parseFloat(value);
        return `<div class="prediction-bar-row"><span class="prediction-bar-label" style="min-width: ${labelWidth}; font-size: ${fontSize};">${name}</span><div class="prediction-bar-track"><div class="prediction-bar-fill ${barClass}" style="width: ${width}%;"></div></div><span class="prediction-bar-value" style="color: ${valueColor};">${value}</span></div>`;
    }

    function collectMonthlyData(indicator, MONTHS, MONTH_LABELS) {
        const yearKeys = Object.keys(indicator).filter(key => /^\d{4}$/.test(key)).map(key => parseInt(key)).sort((a, b) => b - a);
        const availableData = [];
        const coveredMonths = new Set();
        // Emit one entry per year+month so multiple nested years (e.g. 2025 and 2026) both render.
        yearKeys.forEach(year => {
            MONTHS.forEach((month, index) => {
                const value = indicator[year] ? indicator[year][month] : undefined;
                if (isValidData(value)) {
                    availableData.push({ month, label: MONTH_LABELS[index], value, index, year });
                    coveredMonths.add(month);
                }
            });
        });
        // Legacy flat months represent prior-year data; include only when not already covered by nested years.
        MONTHS.forEach((month, index) => {
            if (coveredMonths.has(month)) return;
            const value = indicator[month];
            if (isValidData(value)) availableData.push({ month, label: MONTH_LABELS[index], value, index, year: null });
        });
        availableData.sort((a, b) => {
            if (a.year !== null && b.year !== null) { if (a.year !== b.year) return b.year - a.year; }
            if (a.year !== null && b.year === null) return -1;
            if (a.year === null && b.year !== null) return 1;
            return b.index - a.index;
        });
        return availableData;
    }

    function collectSparklineValues(indicator, MONTHS) {
        const sparklineValues = [];
        const yearKeys = Object.keys(indicator).filter(key => /^\d{4}$/.test(key)).map(k => parseInt(k)).sort();
        MONTHS.forEach(month => { const flatVal = extractNumericValue(indicator[month]); if (flatVal !== null) sparklineValues.push(flatVal); });
        yearKeys.forEach(year => { MONTHS.forEach(month => { if (indicator[year] && indicator[year][month] !== undefined) { const val = extractNumericValue(indicator[year][month]); if (val !== null) sparklineValues.push(val); } }); });
        return sparklineValues;
    }

    // --- Individual Type Renderers ---

    function renderFOMC(indicator) {
        const rows = [];
        if (indicator.meeting_date) rows.push(`<span class="month-label">Meeting:</span> <span class="month-value">${indicator.meeting_date}</span>`);
        let latestDataHtml = '', historyDataHtml = '', hasHistory = false;

        let sortedProbabilities = null;
        if (indicator.probabilities && typeof indicator.probabilities === 'object') {
            sortedProbabilities = Object.entries(indicator.probabilities).sort(([a], [b]) => new Date(b) - new Date(a));
        }
        const latestEntry = sortedProbabilities && sortedProbabilities.length ? sortedProbabilities[0][1] : null;
        const holdOdds = indicator.rate_hold_odds || (latestEntry && latestEntry.rate_hold_odds);
        const cutOdds = indicator.rate_cut_odds || (latestEntry && latestEntry.rate_cut_odds);
        const hikeOdds = indicator.rate_hike_odds || (latestEntry && latestEntry.rate_hike_odds);

        if (holdOdds && cutOdds && hikeOdds) {
            const holdProb = parseFloat(holdOdds), cutProb = parseFloat(cutOdds), hikeProb = parseFloat(hikeOdds);

            latestDataHtml = `
                <div class="prediction-bar-container" style="margin-top: 4px;">
                    ${predictionBarRow('Hold', holdOdds, 'fomc-hold', '50px', '12px')}
                    ${predictionBarRow('Hike', hikeOdds, 'fomc-hike', '50px', '12px')}
                    ${predictionBarRow('Cut', cutOdds, 'fomc-cut', '50px', '12px')}
                </div>`;

            if (sortedProbabilities && sortedProbabilities.length > 1) {
                hasHistory = true;
                historyDataHtml = sortedProbabilities.slice(1).map(([date, probs]) => {
                    const dateLabel = formatDateShort(date);
                    const hold = probs.rate_hold_odds || '—', cut = probs.rate_cut_odds || '—', hike = probs.rate_hike_odds || '—';
                    return `<div class="prediction-history-row prediction-history-row-inline"><span class="prediction-history-date prediction-history-date-inline">${dateLabel}</span><div class="prediction-history-content"><div class="prediction-history-item"><span class="prediction-hold-value">${hold}</span></div><div class="prediction-history-item"><span class="prediction-hike-value">${hike}</span></div><div class="prediction-history-item"><span class="prediction-cut-value">${cut}</span></div></div></div>`;
                }).join('');
            }
        } else {
            if (holdOdds) rows.push(`<span class="month-label">Hold:</span> <span class="month-value">${holdOdds}</span>`);
            if (cutOdds) rows.push(`<span class="month-label">Cut:</span> <span class="month-value">${cutOdds}</span>`);
            if (hikeOdds) rows.push(`<span class="month-label">Hike:</span> <span class="month-value">${hikeOdds}</span>`);
            rows.forEach((row, i) => { if (i < 2) latestDataHtml += `<div class="latest-data-row">${row}</div>`; else historyDataHtml += `<div class="data-row">${row}</div>`; });
            hasHistory = rows.length > 2;
        }

        return { latestDataHtml, historyDataHtml, hasHistory };
    }

    function renderBinaryPrediction(indicator, options = {}) {
        let latestDataHtml = '', historyDataHtml = '', hasHistory = false;
        const { useDualBarClass = false, showCustomLabel = false, customLabel = 'Probability' } = options;
        const probabilities = indicator.probabilities || indicator.propabilities;
        if (probabilities && typeof probabilities === 'object') {
            const sorted = Object.entries(probabilities).sort(([a], [b]) => new Date(b) - new Date(a));
            if (sorted.length > 0) {
                const latest = sorted[0];
                const yesProb = parseFloat(latest[1].yes), noProb = parseFloat(latest[1].no);
                const containerClass = useDualBarClass ? 'prediction-bar-container prediction-dual-bar' : 'prediction-bar-container';
                latestDataHtml = `
                    <div class="${containerClass}">
                        <div class="prediction-bar-row prediction-bar-row-inline">
                            <span class="prediction-value">${latest[1].yes}</span>
                            <div class="prediction-bar-track prediction-bar-track-inline">
                                <div class="prediction-bar-fill bar-yes" style="width: ${yesProb}%; height: 100%;" title="${latest[1].yes} Yes"></div>
                                <div class="prediction-bar-fill bar-no" style="width: ${noProb}%; position: absolute; right: 0; height: 100%;" title="${latest[1].no} No"></div>
                            </div>
                            <span class="prediction-value-left">${latest[1].no}</span>
                        </div>
                    </div>`;
            }

            if (sorted.length > 1) {
                hasHistory = true;
                historyDataHtml = sorted.slice(1).map(([date, probs], index) => {
                    const yesProb = parseFloat(probs.yes), noProb = parseFloat(probs.no);
                    const dateLabel = formatDateShort(date);
                    return `<div class="prediction-history-row prediction-history-row-inline"><span class="prediction-history-date prediction-history-date-inline">${dateLabel}</span><div class="prediction-history-content"><div class="prediction-history-item"><span class="prediction-yes-value">${probs.yes}</span></div><div class="prediction-history-item"><span class="prediction-no-value">${probs.no}</span></div></div></div>`;
                }).join('');
            }
        } else if (indicator.yes_probability && indicator.no_probability) {
            const yesProb = parseFloat(indicator.yes_probability), noProb = parseFloat(indicator.no_probability);
            const containerClass = useDualBarClass ? 'prediction-bar-container prediction-dual-bar' : 'prediction-bar-container';
            latestDataHtml = `
                <div class="${containerClass}">
                    <div class="prediction-bar-row prediction-bar-row-inline">
                        <span class="prediction-value">${indicator.yes_probability}</span>
                        <div class="prediction-bar-track prediction-bar-track-inline">
                            <div class="prediction-bar-fill bar-yes" style="width: ${yesProb}%; height: 100%;" title="${indicator.yes_probability} Yes"></div>
                            <div class="prediction-bar-fill bar-no" style="width: ${noProb}%; position: absolute; right: 0; height: 100%;" title="${indicator.no_probability} No"></div>
                        </div>
                        <span class="prediction-value-left">${indicator.no_probability}</span>
                    </div>
                </div>`;
        } else if (indicator.yes_probability && showCustomLabel) {
            latestDataHtml = `<div class="latest-data-row"><span class="month-label">${customLabel}:</span> <span class="month-value">${indicator.yes_probability}</span></div>`;
            if (indicator.no_probability) latestDataHtml += `<div class="latest-data-row"><span class="month-label">No ${customLabel}:</span> <span class="month-value">${indicator.no_probability}</span></div>`;
        }
        return { latestDataHtml, historyDataHtml, hasHistory };
    }

    function renderRecession(indicator) {
        return renderBinaryPrediction(indicator, { useDualBarClass: true, showCustomLabel: true, customLabel: 'Recession Probability' });
    }

    function renderPrediction(indicator) {
        return renderBinaryPrediction(indicator, { useDualBarClass: false, showCustomLabel: false });
    }

    function renderSports(indicator) {
        const rows = [];
        if (indicator.game_title) rows.push(`<span class="month-label">Game:</span> <span class="month-value">${indicator.game_title}</span>`);
        if (indicator.game_time) rows.push(`<span class="month-label">Time:</span> <span class="month-value"><span class="game-countdown" data-game-time="${indicator.game_time_iso}">${indicator.game_time}</span></span>`);
        if (indicator.week) rows.push(`<span class="month-label">Week:</span> <span class="month-value">${indicator.week}</span>`);
        Object.keys(indicator).filter(key => key.endsWith('_win_odds')).forEach(key => { const teamName = key.replace('_win_odds', '').toUpperCase(); rows.push(`<span class="month-label">${teamName} Win:</span> <span class="month-value">${indicator[key]}</span>`); });
        if (indicator.total_points) rows.push(`<span class="month-label">Total:</span> <span class="month-value">${indicator.total_points}</span>`);
        let latestDataHtml = '', historyDataHtml = '';
        rows.forEach((row, i) => { if (i < 2) latestDataHtml += `<div class="latest-data-row">${row}</div>`; else historyDataHtml += `<div class="data-row">${row}</div>`; });
        return { latestDataHtml, historyDataHtml, hasHistory: rows.length > 2 };
    }

    function renderVenezuela(indicator) {
        let latestDataHtml = '', historyDataHtml = '', hasHistory = false;
        const probabilities = indicator.probabilities || indicator.propabilities;
        if (probabilities && typeof probabilities === 'object') {
            const sorted = Object.entries(probabilities).sort(([a], [b]) => new Date(b) - new Date(a));
            const buildCandidateBar = ([date, candidates], large, showLabel = true) => {
                const dateLabel = new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
                const entries = Object.entries(candidates).sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]));
                const fontSize = large ? '12px' : '11px', labelWidth = large ? '70px' : '90px';
                let html = `<div class="prediction-bar-container">`;
                entries.forEach(([name, prob]) => {
                    const barClass = name === 'Democratic Party' ? 'dem-bar' : name === 'Republican Party' ? 'gop-bar' : 'yes-bar';
                    html += predictionBarRow(name, prob, barClass, labelWidth, fontSize);
                });
                html += `</div>`;
                const dateWrapper = showLabel ? `<div class="prediction-date-label">${dateLabel}</div>` : '';
                return `${dateWrapper}${html}`;
            };
            if (sorted.length > 0) latestDataHtml = buildCandidateBar(sorted[0], true, false);
            if (sorted.length > 1) { hasHistory = true; historyDataHtml = sorted.slice(1).map(entry => buildCandidateBar(entry, false)).join(''); }
        } else if (indicator.candidates && typeof indicator.candidates === 'object') {
            const entries = Object.entries(indicator.candidates).sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]));
            latestDataHtml = `<div class="prediction-bar-container">`;
            entries.forEach(([name, prob]) => {
                const barClass = name === 'Democratic Party' ? 'dem-bar' : name === 'Republican Party' ? 'gop-bar' : 'yes-bar';
                latestDataHtml += predictionBarRow(name, prob, barClass, '90px', '12px');
            });
            latestDataHtml += `</div>`;
            hasHistory = entries.length > 2;
        }
        return { latestDataHtml, historyDataHtml, hasHistory };
    }

    function renderPoliticalPoll(indicator) {
        let latestDataHtml = '', historyDataHtml = '', hasHistory = false;
        if (indicator.probabilities && typeof indicator.probabilities === 'object') {
            const sorted = Object.entries(indicator.probabilities).sort(([a], [b]) => new Date(b) - new Date(a));
            if (sorted.length > 0) {
                const [latestDate, latestProbs] = sorted[0];
                const candidates = Object.entries(latestProbs);
                if (candidates.length === 2) {
                    const [candidate1Name, candidate1Prob] = candidates[0], [candidate2Name, candidate2Prob] = candidates[1];
                    const dateLabel = formatDateShort(latestDate);
                    latestDataHtml = `<div class="poll-table-container"><div class="poll-table-header"><span class="poll-date">${dateLabel}</span></div><div class="poll-table-row"><span class="poll-candidate">${candidate1Name}</span><span class="poll-prob">${candidate1Prob}</span></div><div class="poll-table-row"><span class="poll-candidate">${candidate2Name}</span><span class="poll-prob">${candidate2Prob}</span></div></div>`;
                }
            }
            if (sorted.length > 1) {
                hasHistory = true;
                historyDataHtml = sorted.slice(1).map(([date, probs]) => {
                    const candidates = Object.entries(probs);
                    if (candidates.length !== 2) return '';
                    const [candidate1Name, candidate1Prob] = candidates[0], [candidate2Name, candidate2Prob] = candidates[1];
                    const dateLabel = formatDateShort(date);
                    return `<div class="poll-history-row"><span class="poll-history-date">${dateLabel}</span><span class="poll-history-prob">${candidate1Prob}</span><span class="poll-history-prob">${candidate2Prob}</span></div>`;
                }).join('');
            }
        }
        return { latestDataHtml, historyDataHtml, hasHistory };
    }

function renderHormuz(indicator) {
        const PRECRISIS_NORMAL = 115;
        const dailyEntries = indicator.daily && typeof indicator.daily === 'object' ? Object.entries(indicator.daily).sort(([a], [b]) => new Date(b) - new Date(a)) : Object.entries(indicator.probabilities || {}).sort(([a], [b]) => new Date(b) - new Date(a)).map(([date, val]) => [date, ((val.Inbound || 0) + (val.Outbound || 0)).toString()]);
        const latestEntry = dailyEntries[0], previousEntry = dailyEntries[1];
        const latestCount = latestEntry ? parseInt(latestEntry[1], 10) : null;
        const prevCount = previousEntry ? parseInt(previousEntry[1], 10) : null;
        const latestDateStr = latestEntry ? new Date(latestEntry[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '\u2014';
        const capacityPct = latestCount !== null ? Math.min(Math.round((latestCount / PRECRISIS_NORMAL) * 100), 100) : 0;
        const propKeys = indicator.probabilities ? Object.keys(indicator.probabilities).sort((a, b) => new Date(b) - new Date(a)) : [];
        const currentPropKey = propKeys[0];
        const currentProp = currentPropKey ? indicator.probabilities[currentPropKey] : null;

        const latestDataHtml = `<div class="hormuz-card"><div class="hormuz-top-row ${capacityPct < 20 ? 'hormuz-top-row--critical' : capacityPct < 50 ? 'hormuz-top-row--low' : ''}"><span class="hormuz-count-num">${latestCount !== null ? latestCount : '\u2014'}</span><span class="hormuz-count-unit">/day</span><span class="hormuz-status-badge">Blockade</span></div><div class="hormuz-capacity-row" title="vs pre-crisis baseline of ~${PRECRISIS_NORMAL}/day"><div class="hormuz-capacity-track"><div class="hormuz-capacity-fill ${capacityPct < 20 ? 'hormuz-capacity--critical' : capacityPct < 50 ? 'hormuz-capacity--low' : 'hormuz-capacity--normal'}" style="width: ${capacityPct}%"></div></div><span class="hormuz-capacity-text">${capacityPct}% · ${latestDateStr}</span></div></div>`;

        let historyDataHtml = '';
        if (currentProp) {
            const inOut = (currentProp.hormuzInbound !== undefined && currentProp.hormuzOutbound !== undefined) ? `${currentProp.hormuzInbound}↓ ${currentProp.hormuzOutbound}↑` : null;
            const metrics = [];
            if (currentProp.vesselsInGulf !== undefined) metrics.push(`<div class="hormuz-metric"><span class="hormuz-metric-val">${currentProp.vesselsInGulf.toLocaleString()}</span><span class="hormuz-metric-lbl">Gulf Vessels</span></div>`);
            if (inOut) metrics.push(`<div class="hormuz-metric"><span class="hormuz-metric-val">${inOut}</span><span class="hormuz-metric-lbl">In / Out</span></div>`);
            if (currentProp.darkActivityEvents !== undefined) metrics.push(`<div class="hormuz-metric"><span class="hormuz-metric-val">${currentProp.darkActivityEvents}</span><span class="hormuz-metric-lbl">Dark Events</span></div>`);
            if (currentProp.vesselsAttacked !== undefined) metrics.push(`<div class="hormuz-metric hormuz-metric--danger"><span class="hormuz-metric-val">${currentProp.vesselsAttacked}</span><span class="hormuz-metric-lbl">Attacked</span></div>`);
            const metricsHtml = metrics.join('');
            if (metricsHtml) historyDataHtml += `<div class="hormuz-metrics-grid">${metricsHtml}</div>`;
        }

        const dailyHistoryEntries = dailyEntries.slice(1);
        if (dailyHistoryEntries.length > 0) {
            historyDataHtml += `<div class="hormuz-section-label">Daily History</div><div class="hormuz-daily-list">`;
            dailyHistoryEntries.slice(0, 8).forEach(([dateKey, count]) => {
                const date = new Date(dateKey + 'T12:00:00');
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                const snap = indicator.probabilities?.[dateKey];
                const isLow = parseInt(count, 10) < 20;
                historyDataHtml += `<div class="hormuz-daily-item ${isLow ? 'hormuz-daily--low' : ''}"><span class="hormuz-daily-date">${dateStr}</span><span class="hormuz-daily-count">${count}</span>${isLow ? `<span class="hormuz-daily-badge">&lt;20</span>` : ''}${snap?.vesselsAttacked ? `<span class="hormuz-daily-badge">⚠ ${snap.vesselsAttacked}</span>` : ''}</div>`;
            });
            historyDataHtml += `</div>`;
        }

        const months2026 = [{ key: 'may', label: 'May' }, { key: 'april', label: 'Apr' }, { key: 'march', label: 'Mar' }, { key: 'february', label: 'Feb' }, { key: 'january', label: 'Jan' }];
        const monthAvgs = months2026.filter(({ key }) => indicator['2026']?.[key]);
        if (monthAvgs.length > 0) {
            historyDataHtml += `<div class="hormuz-section-label">Monthly Avg</div><div class="hormuz-monthly-grid">`;
            monthAvgs.forEach(({ key, label }) => {
                const val = parseInt(indicator['2026'][key], 10);
                const isLow = val < 50;
                historyDataHtml += `<div class="hormuz-monthly-item"><span class="hormuz-monthly-name">${label}</span><span class="hormuz-monthly-val ${isLow ? 'hormuz-monthly--low' : ''}">${val}</span></div>`;
            });
            historyDataHtml += `</div>`;
        }

        return { latestDataHtml, historyDataHtml, hasHistory: true };
    }

    function renderStandard(indicator, MONTHS, MONTH_LABELS) {
        const availableData = collectMonthlyData(indicator, MONTHS, MONTH_LABELS);
        let latestDataHtml = '', historyDataHtml = '', hasHistory = false;
        if (availableData.length > 0) {
            const latest = availableData[0];
            const extraHtml = buildExtraHtml(indicator, latest, MONTHS);
            const latestTooltip = buildLabelTooltip(indicator, latest, MONTHS);
            latestDataHtml = `<div class="latest-data-row"><span class="month-label" title="${latestTooltip}">${latest.label}:</span><span class="month-value">${latest.value}${extraHtml}</span></div>`;
            if (availableData.length > 1) {
                const second = availableData[1];
                const secondExtraHtml = buildExtraHtml(indicator, second, MONTHS);
                const secondTooltip = buildLabelTooltip(indicator, second, MONTHS);
                latestDataHtml += `<div class="latest-data-row"><span class="month-label" title="${secondTooltip}">${second.label}:</span><span class="month-value">${second.value}${secondExtraHtml}</span></div>`;
                hasHistory = availableData.length > 2;
                for (let i = 2; i < availableData.length; i++) {
                    const item = availableData[i];
                    const historyExtraHtml = buildExtraHtml(indicator, item, MONTHS);
                    const historyTooltip = buildLabelTooltip(indicator, item, MONTHS);
                    historyDataHtml += `<div class="data-row"><span class="month-label" title="${historyTooltip}">${item.label}:</span><span class="month-value">${item.value}${historyExtraHtml}</span></div>`;
                }
            }
        } else {
            latestDataHtml = `<div class="latest-data-row"><span class="month-label">Status:</span><span class="month-value">No Data</span></div>`;
        }
        return { latestDataHtml, historyDataHtml, hasHistory };
    }

    function renderEarnings(indicator) {
        const recent = indicator.recentEarnings || [];
        const latest = recent[0] || {};
        const excludedKeys = new Set(['marketCap', 'trailingPE', 'recentEarnings', 'latestPrice', 'nextEarningsDate', 'estimatedNextEPS', 'reportedDate', 'actualEPS', 'estimatedEPS', 'surprisePercent', 'explanation', 'ticker', 'id', 'category', 'agency', 'url', 'lastUpdated', 'change', 'isNew', 'deltas', 'priceHistory']);
        const infoEntries = Object.entries(indicator).filter(([key, value]) => value !== null && value !== undefined && value !== '' && !excludedKeys.has(key));

        const latestItems = [];
        if (indicator.latestPrice) {
            latestItems.push(`<div class="latest-data-row"><span class="month-label">Price:</span><span class="month-value">$${indicator.latestPrice}</span></div>`);
        }
        if (indicator.marketCap) {
            const capText = `$${(indicator.marketCap / 1e9).toFixed(1)}B`;
            latestItems.push(`<div class="latest-data-row"><span class="month-label">Market Cap:</span><span class="month-value">${capText}</span></div>`);
        }
        const peValue = indicator.trailingPE ?? indicator.forwardPE;
        latestItems.push(`<div class="latest-data-row"><span class="month-label">P/E:</span><span class="month-value">${peValue !== null && peValue !== undefined ? peValue.toFixed(1) : '\u2014'}</span></div>`);

        const latestDataHtml = latestItems.slice(0, 6).join('');

        let historyDataHtml = '';
        let hasHistory = false;
        if (recent.length > 0) {
            hasHistory = true;
            historyDataHtml = recent.map(entry => {
                const val = parseFloat(entry.surprisePercent);
                const sign = val >= 0 ? '+' : '';
                const dateLabel = entry.reportedDate ? new Date(entry.reportedDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
                const surpriseClass = val >= 0 ? 'surprise-positive' : 'surprise-negative';
                return `<div class="data-row"><span class="month-label">${dateLabel}</span><span class="month-value">Actual: $${entry.actualEPS} | Est: $${entry.estimatedEPS} <span class="${surpriseClass}">${sign}${val.toFixed(2)}%</span></span></div>`;
            }).join('');
        }

        if (infoEntries.length > 0) {
            hasHistory = true;
            const companyRows = [];
            if (indicator.nextEarningsDate) companyRows.push(`<div class="data-row"><span class="month-label">Next:</span><span class="month-value">${indicator.nextEarningsDate}</span></div>`);
            if (indicator.estimatedNextEPS) companyRows.push(`<div class="data-row"><span class="month-label">Next Est:</span><span class="month-value">$${indicator.estimatedNextEPS}</span></div>`);

            function formatEarningsValue(key, value) {
                const isCash = key.includes('Cap') || key.includes('Revenue') || key.includes('Cashflow') || key.includes('Profits') || key.includes('Debt') || key === 'totalCash';
                let displayValue = typeof value === 'number' ? (isCash ? '$' + (value / 1e9).toFixed(1) + 'B' : value.toFixed ? value.toFixed(2) : value) : value;
                return displayValue;
            }

            const metricGroups = [
                { label: 'Valuation', keys: ['forwardPE', 'pegRatio', 'priceToSalesTrailing12Months', 'priceToBook', 'trailingPE'] },
                { label: 'Profitability', keys: ['grossMargins', 'operatingMargins', 'profitMargins', 'returnOnAssets', 'returnOnEquity', 'revenueGrowth', 'earningsGrowth'] },
                { label: 'Financials', keys: ['totalRevenue', 'totalCash', 'operatingCashflow', 'grossProfits', 'totalDebt', 'freeCashflow', 'debtToEquity', 'currentRatio', 'quickRatio', 'bookValue'] },
                { label: 'Per Share', keys: ['revenuePerShare', 'totalCashPerShare', 'sharesOutstanding', 'floatShares', 'impliedSharesOutstanding'] },
                { label: 'Market Data', keys: ['fiftyTwoWeekHigh', 'fiftyTwoWeekLow', 'fiftyDayAverage', 'twoHundredDayAverage', 'averageVolume', 'previousClose', 'dayHigh', 'dayLow', 'regularMarketVolume'] },
                { label: 'Analyst', keys: ['targetHighPrice', 'targetLowPrice', 'targetMeanPrice', 'targetMedianPrice', 'recommendationMean', 'numberOfAnalystOpinions', 'recommendationKey'] },
                { label: 'Company', keys: ['company', 'name', 'sector', 'fullTimeEmployees', 'industry', 'currency'] }
            ];

            const allInfoRows = [];
            metricGroups.forEach(group => {
                const groupRows = [];
                group.keys.forEach(key => {
                    const entry = infoEntries.find(([k]) => k === key);
                    if (!entry) return;
                    const [k, value] = entry;
                    const displayValue = formatEarningsValue(k, value);
                    const tooltip = getEarningsTooltip(k, indicator);
                    const label = `${k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:`;
                    groupRows.push(`<div class="data-row"><span class="month-label" title="${tooltip}">${label}</span><span class="month-value" title="${tooltip}">${displayValue}</span></div>`);
                });
                if (groupRows.length > 0) {
                    allInfoRows.push(`<div class="metric-section collapsed"><div class="prediction-section-label" role="button" tabindex="0" aria-expanded="false">${group.label}</div><div class="metric-section-body">${groupRows.join('')}</div></div>`);
                }
            });

            const sections = [];
            if (companyRows.length > 0) sections.push(companyRows.join(''));
            if (allInfoRows.length > 0) sections.push(allInfoRows.join(''));
            historyDataHtml += sections.join('');
        }

        return { latestDataHtml, historyDataHtml, hasHistory };
    }

    // --- Registry setup ---
    registry.register('fomc', (indicator) => renderFOMC(indicator)).register('recession', (indicator) => renderRecession(indicator)).register('prediction', (indicator) => renderPrediction(indicator)).register('sports', (indicator) => renderSports(indicator)).register('venezuela', (indicator) => renderVenezuela(indicator)).register('hormuz', (indicator) => renderHormuz(indicator)).register('politicalPoll', (indicator) => renderPoliticalPoll(indicator)).register('earnings', (indicator) => renderEarnings(indicator)).register('standard', (indicator, MONTHS, MONTH_LABELS) => renderStandard(indicator, MONTHS, MONTH_LABELS)).registerFallback((indicator, MONTHS, MONTH_LABELS) => renderStandard(indicator, MONTHS, MONTH_LABELS));
    return { registry, collectMonthlyData, collectSparklineValues };
})();


// --- Type Detection ---

function hasYesNoProbabilities(indicator) {
    const probs = indicator.probabilities || indicator.propabilities;
    if (!probs || typeof probs !== 'object') return false;
    return Object.values(probs).some(entry => entry && entry.yes !== undefined && entry.no !== undefined);
}

function detectIndicatorType(indicator) {
    if (indicator.name.includes('FOMC') || (indicator.rate_cut_odds || indicator.rate_hold_odds || indicator.rate_hike_odds)) return 'fomc';
    if (indicator.name.includes('Recession')) return 'recession';
    if (indicator.name.includes('@')) return 'sports';
    if (indicator.category === 'Earnings') return 'earnings';
    if (indicator.name === 'Strait of Hormuz Daily Transits') return 'hormuz';
    const probabilities = indicator.probabilities || indicator.propabilities;
    if (probabilities && typeof probabilities === 'object') {
        const firstEntry = Object.values(probabilities)[0];
        if (firstEntry && !firstEntry.yes && !firstEntry.no) return 'venezuela';
        return 'prediction';
    }
    if (indicator.candidates && typeof indicator.candidates === 'object') return 'venezuela';
    if (indicator.name === 'KY-04 Massie v. Gallrein') return 'politicalPoll';
    if (indicator.yes_probability && indicator.no_probability) return 'prediction';
    return 'standard';
}

// --- Main rendering function ---

function renderIndicatorData(indicator, type, MONTHS, MONTH_LABELS) {
    const renderer = IndicatorRenderers.registry.get(type);
    if (!renderer) return IndicatorRenderers.registry.resolve('standard', indicator, MONTHS, MONTH_LABELS);
    return renderer(indicator, MONTHS, MONTH_LABELS);
}

// --- Extra HTML builder ---

function buildExtraHtml(indicator, dataItem, MONTHS) {
    let extraHtml = '';
    if (indicator.name === 'Total Nonfarm Employment' || indicator.name === 'Job Openings' || indicator.name === 'Private Employment') {
        const changesMap = {};
        calculateAllMonthlyChanges(indicator, MONTHS).forEach(change => changesMap[change.month] = change);
        const changeObj = changesMap[dataItem.month];
        if (changeObj) extraHtml = `<span class="month-change month-change-inline ${changeObj.change >= 0 ? 'change-positive' : 'change-negative'}">${changeObj.formatted}</span>`;
    } else if (indicator.name === 'CPI') {
        let yoyValue = null;
        if (indicator.yoy && dataItem.year && indicator.yoy[dataItem.year] && indicator.yoy[dataItem.year][dataItem.month]) yoyValue = indicator.yoy[dataItem.year][dataItem.month];
        else if (indicator.yoy && indicator.yoy[dataItem.month]) yoyValue = indicator.yoy[dataItem.month];
        if (yoyValue) extraHtml = `<span class="month-change month-change-inline">${yoyValue}</span>`;
    }
    return extraHtml;
}

function buildLabelTooltip(indicator, dataItem, MONTHS) {
    const parts = [`${dataItem.label}: ${dataItem.value}`];
    if (indicator.name === 'Total Nonfarm Employment' || indicator.name === 'Job Openings' || indicator.name === 'Private Employment') {
        const changesMap = {};
        calculateAllMonthlyChanges(indicator, MONTHS).forEach(change => changesMap[change.month] = change);
        const changeObj = changesMap[dataItem.month];
        if (changeObj) {
            parts.push(`MoM: ${changeObj.formatted}`);
            parts.push(`Previous: ${changeObj.prevValue}`);
        }
    } else if (indicator.name === 'CPI') {
        let yoyValue = null;
        if (indicator.yoy && dataItem.year && indicator.yoy[dataItem.year] && indicator.yoy[dataItem.year][dataItem.month]) yoyValue = indicator.yoy[dataItem.year][dataItem.month];
        else if (indicator.yoy && indicator.yoy[dataItem.month]) yoyValue = indicator.yoy[dataItem.month];
        if (yoyValue) parts.push(`YoY: ${yoyValue}`);
    }
    return parts.join('\n');
}

// --- Change Metric Button builder ---

function buildChangeMetricButton(label, changeInfo, title) {
    const iconName = changeInfo.direction > 0 ? 'arrow-up-right' : changeInfo.direction < 0 ? 'arrow-down-right' : 'minus';
    const topSection = label ? `<span class="change-metric-title">${label}</span>` : '';
    const valueWithoutSign = changeInfo.formatted.replace(/^[+\-]/, '');
    const valueWithIcon = `<i data-lucide="${iconName}" style="display: inline; width: 0.85em; height: 0.85em; vertical-align: -0.05em; margin-right: 2px;"></i>${valueWithoutSign}`;
    return `<div class="change-metric-block"><button type="button" class="change-metric-btn ${changeInfo.cssClass}">${topSection}<span class="change-metric-value">${valueWithIcon}</span></button></div>`;
}

// --- Card Creation ---

function createIndicatorCard(indicator, MONTHS, MONTH_LABELS, DATA_ATTRS) {
    const momChange = calculateMoMChange(indicator, MONTHS);
    const yoyChange = calculateYoYChange(indicator, MONTHS);
    const indicatorType = detectIndicatorType(indicator);
    const { latestDataHtml, historyDataHtml, hasHistory } = renderIndicatorData(indicator, indicatorType, MONTHS, MONTH_LABELS);
    const url = indicator.url || '#';
    const explanation = indicator.explanation || '';
    const changeIndicators = buildChangeIndicators(momChange, yoyChange, indicator);
    const sparklineValues = indicatorType === 'standard' ? IndicatorRenderers.collectSparklineValues(indicator, MONTHS) : indicatorType === 'hormuz' && indicator.daily ? Object.entries(indicator.daily).sort(([a], [b]) => new Date(a) - new Date(b)).map(([, v]) => parseFloat(v)).filter(v => !isNaN(v)) : [];
    return buildIndicatorCardHTML({ indicator, DATA_ATTRS, url, explanation, changeIndicators, latestDataHtml, historyDataHtml, hasHistory, sparklineValues });
}

function buildChangeIndicators(momChange, yoyChange, indicator) {
    let result = '';
    if (indicator.name === 'Strait of Hormuz Daily Transits') {
        if (indicator.daily && typeof indicator.daily === 'object') {
            const sortedEntries = Object.entries(indicator.daily).sort(([a], [b]) => new Date(b) - new Date(a));
            const latestEntry = sortedEntries[0], previousEntry = sortedEntries[1];
            if (latestEntry && previousEntry) {
                const [prevDate, prevValue] = previousEntry;
                const [date, currentValue] = latestEntry;
                const change = currentValue - prevValue;
                const percentChange = prevValue !== 0 ? ((currentValue - prevValue) / prevValue) * 100 : 0;
                const dailyChangeInfo = { change: percentChange, direction: percentChange > 0 ? 1 : -1, cssClass: percentChange > 0 ? 'change-positive' : 'change-negative', formatted: `${change > 0 ? '+' : ''}${change} ${percentChange.toFixed(1)}%` };
                result += buildChangeMetricButton('Daily', dailyChangeInfo, 'Daily change');
            }
        }
        if (momChange !== null) {
            const momChangeValue = momChange.percentChange;
            const momInfo = formatChangeIndicator(momChangeValue);
            result += buildChangeMetricButton('MoM', momInfo, 'Month over Month');
        }
        return result;
    }
    if (momChange === null) return '';
    const isUnemploymentIndicator = indicator.name.includes('Unemployment');
    const momChangeValue = momChange.percentChange;
    const momInfo = formatChangeIndicator(momChangeValue);
    const changeLabel = indicator.change_label || 'MoM';
    result += buildChangeMetricButton(changeLabel, momInfo, changeLabel + ' change');
    if (yoyChange !== null) {
        const yoyChangeValue = isUnemploymentIndicator ? -yoyChange.percentChange : yoyChange.percentChange;
        const yoyInfo = formatChangeIndicator(yoyChangeValue);
        result += buildChangeMetricButton('YoY', yoyInfo, 'Year over Year');
    }
    return result;
}

function buildIndicatorCardHTML({ indicator, DATA_ATTRS, url, explanation, changeIndicators, latestDataHtml, historyDataHtml, hasHistory, sparklineValues }) {
    const accent = indicator.color || 'var(--logo-teal)';
    let isNew = false;
    if (indicator.category === 'Earnings' && typeof indicator.isNew === 'boolean') {
        isNew = indicator.isNew;
    } else {
        isNew = indicator.lastUpdated && (Date.now() - new Date(indicator.lastUpdated).getTime()) < (3 * 24 * 60 * 60 * 1000);
    }
    const explanationHtml = explanation && indicator.category !== 'Earnings'
        ? `<div class="indicator-explanation"><div class="indicator-explanation-header">Why this matters</div><div class="indicator-explanation-body">${explanation}</div></div>`
        : '';

    return `<div class="indicator" ${DATA_ATTRS.INDICATOR_NAME}="${indicator.name.replace(/"/g, '&quot;')}" style="--indicator-accent: ${accent};"><div class="indicator-header"><div class="indicator-name" title="${(indicator.company || '').replace(/"/g, '&quot;')}">${indicator.name}${isNew ? '<span class="new-badge">New</span>' : ''}</div><div class="indicator-actions">${explanation && indicator.category !== 'Earnings' ? `<button class="info-btn" title="Show explanation" aria-label="Show explanation" ${DATA_ATTRS.EXPLANATION}="${explanation.replace(/"/g, '&quot;')}"><i data-lucide="info"></i></button>` : ''}<button class="chart-btn" title="View Interactive Chart" aria-label="View chart"><i data-lucide="bar-chart-3"></i></button>${(hasHistory || indicator.category === 'Prediction Markets') ? `<button class="expand-toggle" aria-label="Toggle history"><i data-lucide="chevron-down"></i></button>` : ''}</div></div><div class="indicator-agency">Source: <a href="${url}" target="_blank" rel="noopener noreferrer">${indicator.agency}</a>${indicator.portwatch_url ? ` | <a href="${indicator.portwatch_url}" target="_blank" rel="noopener noreferrer">PortWatch</a>` : ''}${indicator.category === 'Prediction Markets' && indicator.kalshi_url ? ` | <a href="${indicator.kalshi_url}" target="_blank" rel="noopener noreferrer">Kalshi</a>` : ''}${indicator.category === 'Prediction Markets' && indicator.polymarket_url ? ` | <a href="${indicator.polymarket_url}" target="_blank" rel="noopener noreferrer">Polymarket</a>` : ''}${indicator.lastUpdated ? ` | <span class="indicator-date">${new Date(indicator.lastUpdated).getMonth() + 1}/${new Date(indicator.lastUpdated).getDate()}</span>` : ''}</div>${changeIndicators ? `<div class="change-indicators">${changeIndicators}</div>` : ''}<div class="indicator-content">${latestDataHtml}${(hasHistory || indicator.category === 'Prediction Markets') ? `<div class="data-rows-container">${historyDataHtml}</div>` : ''}${sparklineValues.length > 2 ? `<div class="sparkline-container"><canvas data-sparkline='${JSON.stringify(sparklineValues)}'></canvas></div>` : ''}${explanationHtml}</div></div>`;
}

// --- Sparkline rendering (lightweight canvas-only, no Chart.js dependency) ---
function renderSparklines() {
    document.querySelectorAll('.sparkline-container canvas[data-sparkline]').forEach(canvas => {
        if (canvas._sparklineRendered) return;
        canvas._sparklineRendered = true;
        try {
            const values = JSON.parse(canvas.dataset.sparkline);
            if (!values || values.length < 3) return;
            const ctx = canvas.getContext('2d');
            const width = canvas.width = canvas.parentElement.offsetWidth || 300;
            const height = canvas.height = canvas.parentElement.offsetHeight || 120;
            const minVal = Math.min(...values), maxVal = Math.max(...values);
            const range = maxVal - minVal || 1, pad = range * 0.1;
            
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            
            // Create gradient fill
            const gradient = ctx.createLinearGradient(0, 0, 0, height);
            gradient.addColorStop(0, 'rgba(44, 95, 90, 0.12)');
            gradient.addColorStop(1, 'rgba(44, 95, 90, 0)');
            
            // Calculate points
            const points = values.map((val, i) => ({
                x: (i / (values.length - 1)) * width,
                y: height - ((val - minVal + pad) / (range + pad * 2)) * height
            }));

            // Build a single smoothed path (shared by fill + stroke so the
            // shaded area never extends past the visible line)
            const tracePath = () => {
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                    const xc = (points[i].x + points[i - 1].x) / 2;
                    const yc = (points[i].y + points[i - 1].y) / 2;
                    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
                }
                ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            };

            // Draw fill area (close the smoothed line down to the baseline)
            ctx.beginPath();
            tracePath();
            ctx.lineTo(points[points.length - 1].x, height);
            ctx.lineTo(points[0].x, height);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            // Draw line (same smoothed path)
            ctx.beginPath();
            tracePath();
            ctx.strokeStyle = 'rgba(44, 95, 90, 0.18)';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        } catch (e) { /* skip broken sparklines */ }
    });
}
