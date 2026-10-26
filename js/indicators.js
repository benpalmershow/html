// Indicator card creation and rendering

const IndicatorRenderers = (function () {
    'use strict';

    const registry = new Services.Registry('IndicatorRenderers');

    // --- Shared data extraction helpers (SRP) ---

    function formatDateShort(date) {
        return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    }

    // The binary market helpers live in html-utils.js. Resolve them lazily so a
    // stale cached copy of that file degrades the rendering instead of throwing
    // and blanking the whole dashboard.
    function sharedUtils() {
        return (typeof HtmlUtils !== 'undefined') ? HtmlUtils : null;
    }

    function binaryProbabilityEntries(indicator) {
        const utils = sharedUtils();
        return (utils && utils.getBinaryProbabilityEntries)
            ? utils.getBinaryProbabilityEntries(indicator)
            : [];
    }

    function toPercent(value) {
        const utils = sharedUtils();
        if (utils && utils.probabilityPercent) return utils.probabilityPercent(value);
        const num = parseFloat(value);
        return Number.isFinite(num) ? Math.min(100, Math.max(0, num)) : 0;
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

            if (indicator.week) latestDataHtml += `<div class="latest-data-row"><span class="month-label">Week:</span> <span class="month-value">${indicator.week}</span></div>`;
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
        const containerClass = useDualBarClass ? 'prediction-bar-container prediction-dual-bar' : 'prediction-bar-container';
        const pairs = binaryProbabilityEntries(indicator);

        if (pairs.length > 0) {
            const latestPair = pairs[0][1];
            const yesProb = toPercent(latestPair.yes);
            const noProb = toPercent(latestPair.no);
            latestDataHtml = `
                <div class="${containerClass}">
                    <div class="prediction-bar-row prediction-bar-row-inline">
                        <span class="prediction-value">${latestPair.yes}</span>
                        <div class="prediction-bar-track prediction-bar-track-inline">
                            <div class="prediction-bar-fill bar-yes" style="width: ${yesProb}%; height: 100%;" title="${latestPair.yes} Yes"></div>
                            <div class="prediction-bar-fill bar-no" style="width: ${noProb}%; position: absolute; right: 0; height: 100%;" title="${latestPair.no} No"></div>
                        </div>
                        <span class="prediction-value-left">${latestPair.no}</span>
                    </div>
                </div>`;
        }

        if (pairs.length > 1) {
            hasHistory = true;
            historyDataHtml = pairs.slice(1).map(([date, pair]) => {
                const dateLabel = formatDateShort(date);
                return `<div class="prediction-history-row prediction-history-row-inline"><span class="prediction-history-date prediction-history-date-inline">${dateLabel}</span><div class="prediction-history-content"><div class="prediction-history-item"><span class="prediction-yes-value">${pair.yes}</span></div><div class="prediction-history-item"><span class="prediction-no-value">${pair.no}</span></div></div></div>`;
            }).join('');
        }

        if (pairs.length === 0) {
            const topYes = indicator.yes_probability || indicator.yes_odds;
            const topNo = indicator.no_probability || indicator.no_odds;
            if (topYes && topNo) {
                const yesProb = toPercent(topYes), noProb = toPercent(topNo);
                latestDataHtml = `
                    <div class="${containerClass}">
                        <div class="prediction-bar-row prediction-bar-row-inline">
                            <span class="prediction-value">${topYes}</span>
                            <div class="prediction-bar-track prediction-bar-track-inline">
                                <div class="prediction-bar-fill bar-yes" style="width: ${yesProb}%; height: 100%;" title="${topYes} Yes"></div>
                                <div class="prediction-bar-fill bar-no" style="width: ${noProb}%; position: absolute; right: 0; height: 100%;" title="${topNo} No"></div>
                            </div>
                            <span class="prediction-value-left">${topNo}</span>
                        </div>
                    </div>`;
            } else if (topYes && showCustomLabel) {
                latestDataHtml = `<div class="latest-data-row"><span class="month-label">${customLabel}:</span> <span class="month-value">${topYes}</span></div>`;
                if (topNo) latestDataHtml += `<div class="latest-data-row"><span class="month-label">No ${customLabel}:</span> <span class="month-value">${topNo}</span></div>`;
            }
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
        if (indicator.game_title) rows.push(`<span class="month-label">Game:</span> <span class="month-value game-title">${indicator.name}</span>`);
        if (indicator.game_time) {
            const winnerAbbr = indicator.winner || null;
            const resultLabel = winnerAbbr
                ? `Final: ${winnerAbbr} wins`
                : (indicator.result || indicator.game_time);
            rows.push(`<span class="month-label">Time:</span> <span class="month-value">${indicator.result ? `<span class="game-final">${resultLabel}</span>` : `<span class="game-countdown" data-game-time="${indicator.game_time_iso}">${indicator.game_time}</span>`}</span>`);
        }

        // Win odds as a single stacked dual-color bar (same pattern as other prediction markets).
        const winOddsKeys = Object.keys(indicator).filter(key => key.endsWith('_win_odds'));
        let latestDataHtml = '', historyDataHtml = '', hasHistory = false;
        if (winOddsKeys.length >= 2) {
            const [awayKey, homeKey] = winOddsKeys;
            const awayLabel = indicator[`${awayKey.replace('_win_odds', '_pm_name')}`] || awayKey.replace('_win_odds', '').toUpperCase();
            const homeLabel = indicator[`${homeKey.replace('_win_odds', '_pm_name')}`] || homeKey.replace('_win_odds', '').toUpperCase();
            const awayOdds = indicator[awayKey], homeOdds = indicator[homeKey];
            const awayProb = parseFloat(awayOdds), homeProb = parseFloat(homeOdds);
            if (!isNaN(awayProb) && !isNaN(homeProb)) {
            const awayColor = (window.DataUtils?.TEAM_COLORS || {})[awayKey.replace('_win_odds', '')] || indicator.away_color || '#22c55e';
                const homeColor = (window.DataUtils?.TEAM_COLORS || {})[homeKey.replace('_win_odds', '')] || indicator.home_color || '#ef4444';
                const awayState = awayProb === homeProb ? 'sports-even' : awayProb > homeProb ? 'sports-favorite' : 'sports-underdog';
                const homeState = awayProb === homeProb ? 'sports-even' : homeProb > awayProb ? 'sports-favorite' : 'sports-underdog';
                const awayFillState = awayState === 'sports-favorite' ? 'sports-favorite-fill' : awayState === 'sports-underdog' ? 'sports-underdog-fill' : 'sports-even-fill';
                const homeFillState = homeState === 'sports-favorite' ? 'sports-favorite-fill' : homeState === 'sports-underdog' ? 'sports-underdog-fill' : 'sports-even-fill';
latestDataHtml = `
                        <div class="prediction-bar-container prediction-dual-bar">
                            <div class="prediction-bar-row prediction-bar-row-inline">
                                <span class="prediction-value sports-team-label sports-away ${awayState}${indicator.result && indicator.winner === awayKey.replace('_win_odds', '') ? ' sports-winner' : ''}" style="--team-color: ${awayColor};" title="${awayLabel}">${awayLabel} ${awayOdds}</span>
                                <div class="prediction-bar-track prediction-bar-track-inline">
                                    <div class="prediction-bar-fill bar-away ${awayFillState}" style="width: ${awayProb}%; height: 100%; --team-color: ${awayColor};" title="${awayLabel} ${awayOdds}"></div>
                                    <div class="prediction-bar-fill bar-home ${homeFillState}" style="width: calc(${homeProb}% - 2px); margin-left: calc(${awayProb}% + 2px); height: 100%; --team-color: ${homeColor};" title="${homeLabel} ${homeOdds}"></div>
                                </div>
                                <span class="prediction-value-left sports-team-label sports-home ${homeState}${indicator.result && indicator.winner === homeKey.replace('_win_odds', '') ? ' sports-winner' : ''}" style="--team-color: ${homeColor};" title="${homeLabel}">${homeLabel} ${homeOdds}</span>
                            </div>
                        </div>`;
            }
        }

        // Probability history over time (like FOMC)
        if (indicator.probabilities && typeof indicator.probabilities === 'object') {
            const sortedProbabilities = Object.entries(indicator.probabilities).sort(([a], [b]) => new Date(b) - new Date(a));
            if (sortedProbabilities.length > 1) {
                hasHistory = true;
                historyDataHtml = sortedProbabilities.slice(1).map(([date, probs]) => {
                    const dateLabel = formatDateShort(date);
                    const entries = Object.entries(probs).filter(([k]) => k.endsWith('_win_odds'));
                    const historyItems = entries.map(([key, val]) => {
                        const teamAbbr = key.replace('_win_odds', '');
                        return `<div class="prediction-history-item"><span class="prediction-history-team">${teamAbbr}</span><span class="prediction-history-value">${val}</span></div>`;
                    }).join('');
                    return `<div class="prediction-history-row prediction-history-row-inline"><span class="prediction-history-date prediction-history-date-inline">${dateLabel}</span><div class="prediction-history-content">${historyItems}</div></div>`;
                }).join('');
            }
        }

        if (indicator.total_points) rows.push(`<span class="month-label">Total:</span> <span class="month-value">${indicator.total_points}</span>`);
        if (indicator.venue) rows.push(`<span class="month-label">Venue:</span> <span class="month-value">${indicator.venue}</span>`);

        rows.forEach((row, i) => { historyDataHtml += `<div class="data-row">${row}</div>`; });
        return { latestDataHtml, historyDataHtml, hasHistory };
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

    function renderInterestOnDebt(indicator, MONTHS, MONTH_LABELS) {
        const availableData = collectMonthlyData(indicator, MONTHS, MONTH_LABELS);
        let latestDataHtml = '', historyDataHtml = '', hasHistory = false;

        // Calculate annual total for the most recent year
        let annualTotal = 0;
        let annualYear = '';
        const yearKeys = Object.keys(indicator).filter(key => /^\d{4}$/.test(key)).map(key => parseInt(key)).sort((a, b) => b - a);
        if (yearKeys.length > 0) {
            const latestYear = yearKeys[0];
            annualYear = latestYear;
            const yearData = indicator[latestYear];
            if (yearData) {
                let sum = 0;
                let hasData = false;
                Object.values(yearData).forEach(value => {
                    if (value && typeof value === 'string') {
                        const numValue = parseFloat(value.replace(/[$B]/g, ''));
                        if (!isNaN(numValue)) {
                            sum += numValue;
                            hasData = true;
                        }
                    }
                });
                if (hasData) {
                    annualTotal = sum;
                }
            }
        }

        // Show monthly data
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

        // Add annual total to history section (expanded card)
        if (annualTotal > 0) {
            historyDataHtml = `<div class="data-row" style="border-top: 1px solid var(--border-color); margin-top: 8px; padding-top: 8px;"><span class="month-label">Annual (${annualYear}):</span><span class="month-value">$${annualTotal.toFixed(0)}B</span></div>` + historyDataHtml;
            hasHistory = true;
        }

        return { latestDataHtml, historyDataHtml, hasHistory };
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
        const quarterly = indicator.quarterlyFinancials || [];
        let hasHistory = false;

        const formatAmount = (value) => {
            if (value === null || value === undefined || Number.isNaN(value)) return '\u2014';
            const abs = Math.abs(value);
            const sign = value < 0 ? '-' : '';
            if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(2)}T`;
            if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
            if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
            if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
            return `${sign}$${abs.toFixed(0)}`;
        };

        const formatQuarterLabel = (quarterEnd) => {
            if (!quarterEnd) return '';
            const date = new Date(quarterEnd + 'T00:00:00Z');
            const month = date.getUTCMonth();
            const year = date.getUTCFullYear();
            const quarterNum = Math.floor(month / 3) + 1;
            const yearShort = year.toString().slice(-2);
            return `Q${quarterNum} '${yearShort}`;
        };

        const quarterLabelForReport = (entry) => {
            if (!entry) return '';
            const match = quarterly.find(q => q.filingDate === entry.reportedDate || q.acceptedDate === entry.reportedDate);
            return match ? formatQuarterLabel(match.quarterEnd) : '';
        };

        // --- Card Front: who / when / print / beat ---
        const latestItems = [];

        const price = indicator.latestPrice != null ? `$${indicator.latestPrice.toFixed ? indicator.latestPrice.toFixed(2) : indicator.latestPrice}` : '\u2014';
        let dayChange = '';
        let priceContext = '';
        if (indicator.latestPrice != null && indicator.previousClose != null && indicator.previousClose !== 0) {
            const pct = ((indicator.latestPrice - indicator.previousClose) / Math.abs(indicator.previousClose)) * 100;
            const sign = pct >= 0 ? '+' : '';
            const cls = pct >= 0 ? 'earnings-positive' : 'earnings-negative';
            const arrow = pct >= 0 ? '↑' : '↓';
            dayChange = `<span class="earnings-day-change ${cls}" title="Change vs previous close">${arrow} ${sign}${pct.toFixed(1)}%</span>`;
        }

        // Price context badge based on 52-week range
        if (indicator.latestPrice != null && indicator.fiftyTwoWeekLow != null && indicator.fiftyTwoWeekHigh != null) {
            const range = indicator.fiftyTwoWeekHigh - indicator.fiftyTwoWeekLow;
            const position = range > 0 ? ((indicator.latestPrice - indicator.fiftyTwoWeekLow) / range) * 100 : 50;
            let contextLabel = '';
            let contextClass = '';
            if (position >= 80) {
                contextLabel = 'Near 52W High';
                contextClass = 'price-context-high';
            } else if (position <= 20) {
                contextLabel = 'Near 52W Low';
                contextClass = 'price-context-low';
            } else {
                contextLabel = 'Mid-Range';
                contextClass = 'price-context-mid';
            }
            priceContext = `<span class="price-context-badge ${contextClass}" title="Current price is ${position.toFixed(0)}% of 52-week range">${contextLabel}</span>`;
        }

        latestItems.push(`<div class="latest-data-row earnings-price-row"><span class="month-label"><span style="font-weight: 700; margin-right: 4px;">$</span>Price:</span><span class="month-value earnings-price-value">${price}${dayChange}${priceContext}</span></div>`);

        if (quarterly.length > 0) {
            const latestQ = quarterly[0];
            const qLabel = formatQuarterLabel(latestQ.quarterEnd) || 'Latest';
            const form = latestQ.form || '10-Q';
            const filingUrl = latestQ.exhibitUrl || latestQ.filingUrl;
            const rev = latestQ.totalRevenue != null ? formatAmount(latestQ.totalRevenue) : null;
            const net = latestQ.netIncome != null ? formatAmount(latestQ.netIncome) : null;
            const netClass = latestQ.netIncome != null ? (latestQ.netIncome >= 0 ? 'earnings-positive' : 'earnings-negative') : '';

            const qBadge = filingUrl
                ? `<a href="${filingUrl}" target="_blank" rel="noopener noreferrer" class="sec-filing-tag" title="View official SEC ${form} filing">${qLabel} (${form})</a>`
                : `${qLabel} (${form})`;

            const printParts = [];
            if (rev) printParts.push(`<span title="Total Revenue">${rev}</span>`);
            if (net) printParts.push(`<span class="${netClass}" title="Net Income">${net}</span>`);
            if (printParts.length) {
                latestItems.push(`<div class="latest-data-row"><span class="month-label">${qBadge}:</span><span class="month-value">${printParts.join('<span class="earnings-sep"> · </span>')}</span></div>`);
            }
        }

        const reportedRecent = recent.filter(entry => entry.actualEPS != null && entry.surprisePercent != null && !Number.isNaN(parseFloat(entry.surprisePercent)));
        const latestBeat = reportedRecent[0];
        if (latestBeat) {
            const surprise = parseFloat(latestBeat.surprisePercent);
            const sign = surprise >= 0 ? '+' : '';
            const surpriseClass = surprise >= 0 ? 'surprise-positive' : 'surprise-negative';
            const beatIcon = surprise >= 0 ? '✓' : '✗';
            const epsQuarter = quarterLabelForReport(latestBeat);
            const epsLabel = epsQuarter ? `${epsQuarter} EPS` : 'EPS';
            const est = latestBeat.estimatedEPS != null ? `$${latestBeat.estimatedEPS.toFixed(2)}` : '\u2014';
            latestItems.push(`<div class="latest-data-row earnings-eps-row"><span class="month-label">${epsLabel}:</span><span class="month-value"><span class="earnings-actual">$${latestBeat.actualEPS.toFixed(2)}</span> <span class="earnings-vs">vs ${est}</span> <span class="earnings-surprise-pill ${surpriseClass}" title="EPS surprise">${beatIcon} ${sign}${surprise.toFixed(1)}%</span></span></div>`);
        } else if (indicator.revenueGrowth != null) {
            const growthSign = indicator.revenueGrowth >= 0 ? '+' : '';
            latestItems.push(`<div class="latest-data-row"><span class="month-label">Rev Growth:</span><span class="month-value">${growthSign}${(indicator.revenueGrowth * 100).toFixed(1)}% YoY</span></div>`);
        }

        const latestDataHtml = latestItems.join('');

        // --- Card Expanded: Historical table & Key Fundamentals ---
        let historyDataHtml = '';

        // 0. Next scheduled report (date is on the face; expand keeps Est. EPS)
        if (indicator.nextEarningsDate) {
            hasHistory = true;
            const nextDate = new Date(indicator.nextEarningsDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
            const nextStats = [{ label: 'Date', value: nextDate, tip: 'Next scheduled earnings report' }];
            if (indicator.estimatedNextEPS != null) {
                nextStats.push({ label: 'Est. EPS', value: `$${indicator.estimatedNextEPS.toFixed(2)}`, tip: 'Consensus EPS estimate for the next report' });
            }
            const nextStatsHtml = nextStats.map(s => `
                <div class="stat-item" title="${s.tip}">
                    <span class="stat-label">${s.label}</span>
                    <span class="stat-value">${s.value}</span>
                </div>
            `).join('');
            historyDataHtml += `<div class="earnings-subheading">Next Report</div><div class="earnings-stats-grid">${nextStatsHtml}</div>`;
        }

        // 1. Quarterly financials table (SEC filings)
        if (quarterly.length > 0) {
            hasHistory = true;
            const tableId = `earnings-qtr-${String(indicator.ticker || indicator.name || 'x').replace(/[^a-z0-9]/gi, '').toLowerCase()}`;

            const quarterRows = quarterly.map((q, index) => {
                const dateLabel = formatQuarterLabel(q.quarterEnd) || q.quarterEnd || '';
                const filingForm = q.form || '10-Q';
                const isEvent = filingForm !== '10-Q' && filingForm !== '10-K';
                const filingDate = q.filingDate || q.quarterEnd || '';
                const filedOn = filingDate ? new Date(filingDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : '';
                const filingUrl = q.exhibitUrl || q.filingUrl;
                const rowTitle = isEvent
                    ? `View ${filingForm} Exhibit 99.1 (${filedOn})`
                    : `View SEC ${filingForm} filing (${filedOn})`;

                const netIncomeClass = q.netIncome === undefined || q.netIncome === null
                    ? ''
                    : (q.netIncome >= 0 ? 'earnings-positive' : 'earnings-negative');

                const operatingIncomeClass = q.operatingIncome === undefined || q.operatingIncome === null
                    ? ''
                    : (q.operatingIncome >= 0 ? 'earnings-positive' : 'earnings-negative');

                const freeCashFlowClass = q.freeCashFlow === undefined || q.freeCashFlow === null
                    ? ''
                    : (q.freeCashFlow >= 0 ? 'earnings-positive' : 'earnings-negative');

                const filingLink = filingUrl
                    ? `<a href="${filingUrl}" target="_blank" rel="noopener noreferrer" class="sec-filing-link" title="${rowTitle}">${dateLabel} <span class="form-badge">${filingForm}</span></a>`
                    : `${dateLabel} <span class="form-badge">${filingForm}</span>`;

                // Highlight the most recent quarter
                const isLatest = index === 0;
                const rowClass = isLatest ? 'quarterly-latest' : '';

                return `<tr class="${rowClass}">
                    <th scope="row">${filingLink}</th>
                    <td title="Total Revenue">${formatAmount(q.totalRevenue)}</td>
                    <td class="${netIncomeClass}" title="Net Income">${formatAmount(q.netIncome)}</td>
                    <td class="${operatingIncomeClass}" title="Operating Income">${formatAmount(q.operatingIncome)}</td>
                    <td title="Capital Expenditures">${formatAmount(q.capitalExpenditures)}</td>
                    <td class="${freeCashFlowClass}" title="Free Cash Flow">${formatAmount(q.freeCashFlow)}</td>
                </tr>`;
            }).join('');

            historyDataHtml += `<div class="quarterly-section" tabindex="0" role="region" aria-labelledby="${tableId}">
                <table class="quarterly-table">
                    <caption id="${tableId}" class="earnings-subheading">Quarterly Financials</caption>
                    <thead>
                        <tr>
                            <th scope="col">Qtr</th>
                            <th scope="col">Revenue</th>
                            <th scope="col">Net Inc.</th>
                            <th scope="col">Op. Inc.</th>
                            <th scope="col">CapEx</th>
                            <th scope="col">FCF</th>
                        </tr>
                    </thead>
                    <tbody>${quarterRows}</tbody>
                </table>
            </div>`;
        }

        // 1b. Quarterly Revenue Growth Highlights (QoQ and YoY per quarter)
        if (quarterly.length > 0) {
            hasHistory = true;
            const growthRows = quarterly.map((q, index) => {
                const dateLabel = formatQuarterLabel(q.quarterEnd) || q.quarterEnd || '';
                const rev = q.totalRevenue;
                if (rev == null) return '';

                // QoQ: vs immediately preceding quarter
                let qoqHtml = '';
                if (index < quarterly.length - 1) {
                    const prev = quarterly[index + 1].totalRevenue;
                    if (prev != null && prev !== 0) {
                        const pct = ((rev - prev) / Math.abs(prev)) * 100;
                        const sign = pct >= 0 ? '+' : '';
                        const cls = pct >= 0 ? 'earnings-positive' : 'earnings-negative';
                        qoqHtml = `<span class="${cls}">${sign}${pct.toFixed(1)}%</span>`;
                    }
                }

                // YoY: vs same quarter prior year
                let yoyHtml = '';
                const qDate = new Date(q.quarterEnd + 'T00:00:00Z');
                if (!Number.isNaN(qDate.getTime())) {
                    const targetMonth = qDate.getUTCMonth();
                    const targetYear = qDate.getUTCFullYear() - 1;
                    const match = quarterly.find(pq => {
                        if (!pq.quarterEnd || pq.totalRevenue == null) return false;
                        const pd = new Date(pq.quarterEnd + 'T00:00:00Z');
                        return !Number.isNaN(pd.getTime()) && pd.getUTCMonth() === targetMonth && pd.getUTCFullYear() === targetYear;
                    });
                    if (match) {
                        const pct = ((rev - match.totalRevenue) / Math.abs(match.totalRevenue)) * 100;
                        const sign = pct >= 0 ? '+' : '';
                        const cls = pct >= 0 ? 'earnings-positive' : 'earnings-negative';
                        yoyHtml = `<span class="${cls}">${sign}${pct.toFixed(1)}%</span>`;
                    }
                }

                return `<div class="earnings-growth-row">
                    <span class="growth-quarter">${dateLabel}</span>
                    <span class="growth-rev">${formatAmount(rev)}</span>
                    <span class="growth-qoq">${qoqHtml || '\u2014'}</span>
                    <span class="growth-yoy">${yoyHtml || '\u2014'}</span>
                </div>`;
            }).filter(Boolean).join('');

            if (growthRows) {
                historyDataHtml += `<div class="earnings-subheading">Revenue Growth</div>
                    <div class="earnings-growth-header">
                        <span>Quarter</span><span>Revenue</span><span>QoQ</span><span>YoY</span>
                    </div>
                    <div class="earnings-growth-list">${growthRows}</div>`;
            }
        }

        // 1c. Quarterly Operating Metrics (compute intensity, operating margin)
        if (quarterly.length > 0) {
            const metricRows = quarterly.map((q, index) => {
                const dateLabel = formatQuarterLabel(q.quarterEnd) || q.quarterEnd || '';
                const rev = q.totalRevenue;
                if (rev == null || rev === 0) return '';

                const computeCost = q.computeInfrastructure;
                const computePerDollar = computeCost != null
                    ? `<span class="${computeCost > rev ? 'earnings-negative' : 'earnings-positive'}">$${(computeCost / rev).toFixed(2)}</span>`
                    : '\u2014';

                const opMargin = q.operatingMargin != null
                    ? `<span class="${q.operatingMargin >= 0 ? 'earnings-positive' : 'earnings-negative'}">${(q.operatingMargin * 100).toFixed(1)}%</span>`
                    : '\u2014';

                return `<div class="earnings-growth-row">
                    <span class="growth-quarter">${dateLabel}</span>
                    <span class="growth-rev">${computePerDollar}</span>
                    <span class="growth-qoq">${opMargin}</span>
                    <span class="growth-yoy"></span>
                </div>`;
            }).filter(Boolean).join('');

            if (metricRows) {
                historyDataHtml += `<div class="earnings-subheading">Operating Metrics</div>
                    <div class="earnings-growth-header">
                        <span>Quarter</span><span>Compute / $1 Rev</span><span>Op. Margin</span><span></span>
                    </div>
                    <div class="earnings-growth-list">${metricRows}</div>`;
            }
        }

        // 1d. Revenue Mix (consumption-based vs subscription-based)
        if (indicator.revenueMix) {
            const mix = indicator.revenueMix;
            const mixRows = Object.entries(mix)
                .filter(([key]) => key !== 'source' && key !== 'notes')
                .map(([period, data]) => {
                    const label = period === 'h1_2026' ? 'H1 2026' : period;
                    const cb = data.consumptionBased != null ? formatAmount(data.consumptionBased) : '\u2014';
                    const sb = data.subscriptionBased != null ? formatAmount(data.subscriptionBased) : '\u2014';
                    const cbPct = data.consumptionPct != null ? `${data.consumptionPct}%` : '';
                    const sbPct = data.subscriptionPct != null ? `${data.subscriptionPct}%` : '';
                    return `<div class="earnings-growth-row">
                        <span class="growth-quarter">${label}</span>
                        <span class="growth-rev">${cb} <span style="font-size:0.6rem;color:var(--text-muted)">${cbPct}</span></span>
                        <span class="growth-qoq">${sb} <span style="font-size:0.6rem;color:var(--text-muted)">${sbPct}</span></span>
                        <span class="growth-yoy"></span>
                    </div>`;
                }).join('');

            if (mixRows) {
                historyDataHtml += `<div class="earnings-subheading">Revenue Mix</div>
                    <div class="earnings-growth-header">
                        <span>Period</span><span>Consumption</span><span>Subscription</span><span></span>
                    </div>
                    <div class="earnings-growth-list">${mixRows}</div>`;
            }
        }

        // 2. Recent earnings surprises (EPS beat/miss track record)
        if (reportedRecent.length > 0) {
            hasHistory = true;
            const surpriseRows = reportedRecent.map(entry => {
                const val = parseFloat(entry.surprisePercent);
                const sign = val >= 0 ? '+' : '';
                const dateLabel = entry.reportedDate ? new Date(entry.reportedDate + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }) : '';
                const surpriseClass = val >= 0 ? 'surprise-positive' : 'surprise-negative';
                const act = entry.actualEPS != null ? `$${entry.actualEPS.toFixed(2)}` : '\u2014';
                const est = entry.estimatedEPS != null ? `$${entry.estimatedEPS.toFixed(2)}` : '\u2014';
                return `<div class="earnings-surprise-item">
                    <span class="surprise-date">${dateLabel}</span>
                    <span class="surprise-values">Act: <strong>${act}</strong> vs Est: ${est}</span>
                    <span class="surprise-badge ${surpriseClass}">${sign}${val.toFixed(1)}%</span>
                </div>`;
            }).join('');
            historyDataHtml += `<div class="earnings-subheading">EPS Surprises</div><div class="earnings-surprise-list">${surpriseRows}</div>`;
        }

        // 3. Key Fundamentals (Grouped by category)
        const valuationStats = [];
        const profitabilityStats = [];
        const cashFlowStats = [];
        const otherStats = [];

        // Valuation metrics
        if (indicator.marketCap) {
            valuationStats.push({ label: 'Mkt Cap', value: formatAmount(indicator.marketCap), tip: 'Share price times shares outstanding' });
        }
        if (indicator.forwardPE != null) {
            valuationStats.push({ label: 'Fwd P/E', value: indicator.forwardPE.toFixed(1), tip: 'Forward price-to-earnings ratio' });
        }
        if (indicator.targetMeanPrice != null) {
            const rec = indicator.recommendationKey ? ` ${indicator.recommendationKey.toUpperCase()}` : '';
            valuationStats.push({ label: 'Target', value: `$${indicator.targetMeanPrice.toFixed(0)}${rec}`, tip: 'Consensus analyst price target and recommendation' });
        }

        // Profitability metrics
        if (indicator.profitMargins != null) {
            profitabilityStats.push({ label: 'Profit Marg', value: `${(indicator.profitMargins * 100).toFixed(1)}%`, tip: 'Net profit divided by revenue' });
        }
        if (indicator.grossMargins != null) {
            profitabilityStats.push({ label: 'Gross Marg', value: `${(indicator.grossMargins * 100).toFixed(1)}%`, tip: 'Gross profit divided by revenue' });
        }
        if (indicator.revenueGrowth != null) {
            const sign = indicator.revenueGrowth >= 0 ? '+' : '';
            const growthClass = indicator.revenueGrowth >= 0 ? 'earnings-positive' : 'earnings-negative';
            profitabilityStats.push({ label: 'YoY Growth', value: `<span class="${growthClass}">${sign}${(indicator.revenueGrowth * 100).toFixed(1)}%</span>`, tip: 'Year-over-year revenue growth rate' });
        }

        // Cash Flow metrics
        if (indicator.freeCashflow != null) {
            cashFlowStats.push({ label: 'FCF', value: formatAmount(indicator.freeCashflow), tip: 'Operating cash flow minus capital expenditures' });
        }
        if (indicator.totalCash != null && indicator.totalDebt != null) {
            cashFlowStats.push({ label: 'Cash/Debt', value: `${formatAmount(indicator.totalCash)} / ${formatAmount(indicator.totalDebt)}`, tip: 'Total cash vs total debt on balance sheet' });
        }

        // Other metrics
        if (indicator.fiftyTwoWeekLow != null && indicator.fiftyTwoWeekHigh != null) {
            otherStats.push({ label: '52W Range', value: `$${indicator.fiftyTwoWeekLow.toFixed(0)}–$${indicator.fiftyTwoWeekHigh.toFixed(0)}`, tip: '52-week low and high stock price' });
        }
        if (indicator.dividendYield != null && indicator.dividendYield > 0) {
            otherStats.push({ label: 'Div Yield', value: `${indicator.dividendYield.toFixed(2)}%`, tip: 'Annual dividend yield' });
        }

        const renderStatsGroup = (stats, groupName) => {
            if (stats.length === 0) return '';
            const statsHtml = stats.map(s => `
                <div class="stat-item" title="${s.tip}">
                    <span class="stat-label">${s.label}</span>
                    <span class="stat-value">${s.value}</span>
                </div>
            `).join('');
            return `<div class="earnings-subheading">${groupName}</div><div class="earnings-stats-grid">${statsHtml}</div>`;
        };

        if (valuationStats.length > 0 || profitabilityStats.length > 0 || cashFlowStats.length > 0 || otherStats.length > 0) {
            hasHistory = true;
            historyDataHtml += renderStatsGroup(valuationStats, 'Valuation');
            historyDataHtml += renderStatsGroup(profitabilityStats, 'Profitability');
            historyDataHtml += renderStatsGroup(cashFlowStats, 'Cash Flow');
            historyDataHtml += renderStatsGroup(otherStats, 'Other');
        }

        return { latestDataHtml, historyDataHtml, hasHistory };
    }

    // --- Registry setup ---
    registry.register('fomc', (indicator) => renderFOMC(indicator)).register('recession', (indicator) => renderRecession(indicator)).register('prediction', (indicator) => renderPrediction(indicator)).register('sports', (indicator) => renderSports(indicator)).register('venezuela', (indicator) => renderVenezuela(indicator)).register('hormuz', (indicator) => renderHormuz(indicator)).register('politicalPoll', (indicator) => renderPoliticalPoll(indicator)).register('earnings', (indicator) => renderEarnings(indicator)).register('interestOnDebt', (indicator, MONTHS, MONTH_LABELS) => renderInterestOnDebt(indicator, MONTHS, MONTH_LABELS)).register('standard', (indicator, MONTHS, MONTH_LABELS) => renderStandard(indicator, MONTHS, MONTH_LABELS)).registerFallback((indicator, MONTHS, MONTH_LABELS) => renderStandard(indicator, MONTHS, MONTH_LABELS));
    return { registry, collectMonthlyData, collectSparklineValues };
})();

function htmlAttr(value) {
    return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


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
    if (indicator.name === 'Interest on Debt') return 'interestOnDebt';
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

const INLINE_CHANGE_IDS = new Set(['total-nonfarm-employment', 'job-openings', 'private-employment']);

function hasInlineMonthlyChange(indicator) {
    return INLINE_CHANGE_IDS.has(indicator.id);
}

function buildExtraHtml(indicator, dataItem, MONTHS) {
    let extraHtml = '';
    if (hasInlineMonthlyChange(indicator)) {
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
    if (hasInlineMonthlyChange(indicator)) {
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
    const safeTitle = String(title || label || '').replace(/"/g, '&quot;');
    const accessibleName = `${label ? label + ' ' : ''}${changeInfo.formatted}`.replace(/"/g, '&quot;');
    const metricLabel = label ? `<span class="change-metric-title" aria-hidden="true">${label}</span>` : '';
    return `<div class="change-metric-block"><button type="button" class="change-metric-btn ${changeInfo.cssClass}" title="${safeTitle}" aria-label="${accessibleName}">${metricLabel}<span class="change-metric-value">${changeInfo.formatted}</span></button></div>`;
}

// --- Card Creation ---

const NEW_BADGE_WINDOW_MS = 5 * 24 * 60 * 60 * 1000;

/* Single source of truth for the "New" badge so other views (Latest Updates)
   can pin badge cards to the top of their lists. */
function isIndicatorNew(indicator) {
    if (!indicator) return false;
    const withinWindow = indicator.lastUpdated && (Date.now() - new Date(indicator.lastUpdated).getTime()) < NEW_BADGE_WINDOW_MS;
    if (!withinWindow) return false;
    if (indicator.category === 'Earnings' && typeof indicator.isNew === 'boolean') {
        return indicator.isNew;
    }
    if (typeof indicator.newMonth === 'boolean') {
        // Set by the monthly data fetchers: true only when a brand-new month
        // was added, false for revisions to existing months or revision-less
        // re-fetches. This is what the "New" badge should actually mean.
        return indicator.newMonth;
    }
    return true;
}

/* NFL game cards get a week badge instead, so they never count as "New". */
function showsNewBadge(indicator) {
    return isIndicatorNew(indicator) && !indicator.game_time_iso;
}

function createIndicatorCard(indicator, MONTHS, MONTH_LABELS, DATA_ATTRS) {
    const momChange = calculateMoMChange(indicator, MONTHS);
    const yoyChange = calculateYoYChange(indicator, MONTHS);
    const indicatorType = detectIndicatorType(indicator);
    const { latestDataHtml, historyDataHtml, hasHistory } = renderIndicatorData(indicator, indicatorType, MONTHS, MONTH_LABELS);
    const url = indicator.url || '#';
    const explanation = indicator.explanation || '';
    const changeIndicators = buildChangeIndicators(momChange, yoyChange, indicator);
    let sparklineValues = [];
    if (indicatorType === 'standard') {
        sparklineValues = IndicatorRenderers.collectSparklineValues(indicator, MONTHS);
    } else if (indicatorType === 'hormuz' && indicator.daily) {
        sparklineValues = Object.entries(indicator.daily).sort(([a], [b]) => new Date(a) - new Date(b)).map(([, v]) => parseFloat(v)).filter(v => !isNaN(v));
    } else if (indicatorType === 'earnings' && Array.isArray(indicator.priceHistory)) {
        sparklineValues = indicator.priceHistory.map(entry => entry && parseFloat(entry.close)).filter(value => !Number.isNaN(value));
    }

    let latestMonthTag = '';
    if (indicatorType === 'standard' || indicatorType === 'interestOnDebt') {
        try {
            const monthlyData = IndicatorRenderers.collectMonthlyData(indicator, MONTHS, MONTH_LABELS);
            if (monthlyData && monthlyData.length > 0) {
                const latest = monthlyData[0];
                latestMonthTag = latest.label;
            }
        } catch (e) {
            latestMonthTag = '';
        }
    }

    return buildIndicatorCardHTML({ indicator, DATA_ATTRS, url, explanation, changeIndicators, latestDataHtml, historyDataHtml, hasHistory, sparklineValues, latestMonthTag });
}

function buildChangeIndicators(momChange, yoyChange, indicator) {
    let result = '';
    if (indicator.category === 'Earnings') {
        const quarterly = indicator.quarterlyFinancials || [];
        if (quarterly.length >= 2 && quarterly[0].totalRevenue && quarterly[1].totalRevenue) {
            const r0 = quarterly[0].totalRevenue;
            const r1 = quarterly[1].totalRevenue;
            const qoq = ((r0 - r1) / Math.abs(r1)) * 100;
            const qoqInfo = formatChangeIndicator(qoq);
            result += buildChangeMetricButton('QoQ', qoqInfo, 'Quarter-over-Quarter Revenue (SEC)');
        }
        if (quarterly.length >= 1 && quarterly[0].quarterEnd && quarterly[0].totalRevenue) {
            const d0 = new Date(quarterly[0].quarterEnd + 'T00:00:00Z');
            const r0 = quarterly[0].totalRevenue;
            let yoyPast = null;
            for (let i = 1; i < quarterly.length; i++) {
                const past = quarterly[i];
                if (past.quarterEnd && past.totalRevenue) {
                    const dp = new Date(past.quarterEnd + 'T00:00:00Z');
                    const diffDays = Math.abs((d0.getTime() - dp.getTime()) / (24 * 3600 * 1000) - 365);
                    if (diffDays <= 50) {
                        yoyPast = past;
                        break;
                    }
                }
            }
            // A quarter taken from an earnings release carries its own
            // prior-year comparative, because no 10-Q exists for it yet.
            if (!yoyPast && quarterly[0].priorYear && quarterly[0].priorYear.totalRevenue) {
                yoyPast = quarterly[0].priorYear;
            }
            if (yoyPast) {
                const yoy = ((r0 - yoyPast.totalRevenue) / Math.abs(yoyPast.totalRevenue)) * 100;
                const yoyInfo = formatChangeIndicator(yoy);
                result += buildChangeMetricButton('YoY', yoyInfo, 'Year-over-Year Revenue (SEC)');
            }
        }
        return result;
    }
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

function cleanCompanyName(name) {
    if (!name) return '';
    if (name.includes('Space') && name.includes('Exploration')) return 'SpaceX';
    let c = name.replace(/,?\s*(?:Inc\.?|Corp\.?|Corporation|Co\.?|Company|Holdings|Technologies|LLC|Ltd\.?)\b.*$/i, '').trim();
    c = c.replace(/^The\s+/i, '');
    return c;
}

/* A date-only value is a calendar day, not an instant. Parsing it as UTC and
   reading local getters shifts the label a day back for viewers west of UTC
   (SEC filing dates would land one day early). */
function relativeTime(date) {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    if (diff < 2592000) return Math.floor(diff / 604800) + 'w ago';
    if (diff < 31536000) return Math.floor(diff / 2592000) + 'mo ago';
    return Math.floor(diff / 31536000) + 'y ago';
}

function formatUpdatedDate(value) {
    const raw = String(value || '');
    const date = /^\\d{4}-\\d{2}-\\d{2}$/.test(raw)
        ? new Date(raw + 'T00:00:00')
        : new Date(raw);
    if (Number.isNaN(date.getTime())) return '';
    const iso = date.toISOString();
    const ago = relativeTime(date);
    return `<time class="indicator-date" datetime="${iso}" title="${iso}">${ago}</time>`;
}

function buildIndicatorCardHTML({ indicator, DATA_ATTRS, url, explanation, changeIndicators, latestDataHtml, historyDataHtml, hasHistory, sparklineValues, latestMonthTag }) {
    /* Cards inherit the accent from their category (see theme.css accent map). */
    const accentStyle = '';
    const isNew = isIndicatorNew(indicator);

    const domainLabel = (u) => {
        try { const p = new URL(u).hostname.split('.'); return p.slice(-2).join('.'); } catch { return 'Source'; }
    };
    const sourceLinks = [
        `<a href="${url}" target="_blank" rel="noopener noreferrer">${indicator.agency}</a>`,
        indicator.source_url ? `<a href="${indicator.source_url}" target="_blank" rel="noopener noreferrer">${domainLabel(indicator.source_url)}</a>` : '',
        indicator.portwatch_url ? `<a href="${indicator.portwatch_url}" target="_blank" rel="noopener noreferrer">PortWatch</a>` : '',
        indicator.category === 'Prediction Markets' && indicator.kalshi_url ? `<a href="${indicator.kalshi_url}" target="_blank" rel="noopener noreferrer">Kalshi</a>` : '',
        indicator.category === 'Prediction Markets' && indicator.polymarket_url && indicator.polymarket_url !== url ? `<a href="${indicator.polymarket_url}" target="_blank" rel="noopener noreferrer">Polymarket</a>` : ''
    ].filter(Boolean).join(' &middot; ');

    const whyHtml = explanation && indicator.category !== 'Earnings'
        ? `<div class="indicator-explanation-header">Why this matters</div><div class="indicator-explanation-body">${explanation}</div>`
        : (indicator.category === 'Earnings' && indicator.company
            ? `<div class="indicator-explanation-header">About</div><div class="indicator-explanation-body">${explanation}</div>`
            : '');

    // For earnings cards, combine Source with Quick Links
    let sourceSection = '';
    if (indicator.category === 'Earnings') {
        const quickActions = [];
        if (indicator.ticker) {
            quickActions.push(`<a href="https://www.perplexity.ai/finance/${indicator.ticker}" target="_blank" rel="noopener noreferrer" class="quick-action-link">Perplexity</a>`);
        }
        if (indicator.url) {
            quickActions.push(`<a href="${indicator.url}" target="_blank" rel="noopener noreferrer" class="quick-action-link">Yahoo</a>`);
        }
        if (indicator.ticker) {
            const googleUrl = indicator.googleFinanceUrl || `https://www.google.com/finance/quote/${indicator.ticker}`;
            quickActions.push(`<a href="${googleUrl}" target="_blank" rel="noopener noreferrer" class="quick-action-link">Google</a>`);
        }
        if (indicator.quarterlyFinancials && indicator.quarterlyFinancials.length > 0 && indicator.quarterlyFinancials[0].filingUrl) {
            quickActions.push(`<a href="${indicator.quarterlyFinancials[0].filingUrl}" target="_blank" rel="noopener noreferrer" class="quick-action-link">SEC</a>`);
        }

        const actionsHtml = quickActions.length > 0 ? quickActions.join('<span class="quick-action-sep">·</span>') : sourceLinks;
        sourceSection = `<div class="indicator-explanation-header">Source & Links</div><div class="indicator-explanation-body">${actionsHtml}</div>`;
    } else {
        sourceSection = `<div class="indicator-explanation-header">Source</div><div class="indicator-explanation-body">${sourceLinks}</div>`;
    }

    const explanationHtml = `<div class="indicator-explanation">${whyHtml}${sourceSection}</div>`;

    const updatedHtml = indicator.lastUpdated
        ? `Updated <span class="indicator-date">${formatUpdatedDate(indicator.lastUpdated)}</span>`
        : '';

    /* Rows whose label + value run long (money supply, market caps, transits)
       keep the compact headline size so they never ellipsize. */
    const decoratedLatestHtml = latestDataHtml.replace(/<div class="latest-data-row">([\s\S]*?)<\/div>/g, (match, inner) => {
        const text = inner.replace(/<[^>]*>/g, '');
        return text.length > 17 ? `<div class="latest-data-row long-value">${inner}</div>` : match;
    });

    const nameTitle = String(indicator.company || indicator.name || '').replace(/"/g, '&quot;');

    // For earnings cards, show company name only (no ticker)
    let displayName = indicator.name;
    if (indicator.category === 'Earnings' && indicator.company) {
        displayName = cleanCompanyName(indicator.company);
    }

    const indicatorNameAttr = htmlAttr(indicator.name);
    const badgeUrl = `financials.html?indicator=${encodeURIComponent(indicator.name)}`;

    const badges = [
        (isNew && !indicator.game_time_iso) ? `<a href="${badgeUrl}" class="badge-link new-badge" data-indicator-name="${indicatorNameAttr}" data-sort-key="new" data-sort-value="1">New</a>` : '',
        (latestMonthTag && !indicator.game_time_iso && indicator.category !== 'Prediction Markets' && indicator.category !== 'Earnings') ? `<a href="${badgeUrl}" class="badge-link latest-month-badge" data-indicator-name="${indicatorNameAttr}" data-sort-key="month" data-sort-value="${htmlAttr(latestMonthTag)}">${latestMonthTag}</a>` : '',
        (indicator.game_time_iso && indicator.week) ? `<a href="${badgeUrl}" class="badge-link week-badge" data-indicator-name="${indicatorNameAttr}" data-sort-key="week" data-sort-value="${indicator.week}">W${indicator.week}</a>` : '',
        indicator.result ? `<a href="${badgeUrl}" class="badge-link game-final-badge" data-indicator-name="${indicatorNameAttr}" data-sort-key="final" data-sort-value="1">Final</a>` : ''
    ].filter(Boolean).join('');

    return `<div class="indicator${indicator.category === 'Earnings' ? ' earnings-card' : ''}" ${DATA_ATTRS.INDICATOR_NAME}="${indicator.name.replace(/"/g, '&quot;')}"${accentStyle}><div class="indicator-header"><div class="indicator-name" title="${nameTitle}">${displayName}${badges}</div><div class="indicator-actions"><button class="chart-btn" title="View Interactive Chart" aria-label="View chart"><i data-lucide="bar-chart-3"></i></button>${(hasHistory || indicator.category === 'Prediction Markets') ? `<button class="expand-toggle" aria-label="Toggle explanation"><i data-lucide="chevron-down"></i></button>` : ''}</div></div>${updatedHtml ? `<div class="indicator-agency">${updatedHtml}</div>` : ''}${changeIndicators ? `<div class="change-indicators">${changeIndicators}</div>` : ''}<div class="indicator-content">${decoratedLatestHtml}${sparklineValues.length > 2 ? `<div class="sparkline-container"><canvas data-sparkline='${JSON.stringify(sparklineValues)}'></canvas></div>` : ''}${(hasHistory || indicator.category === 'Prediction Markets') ? `<div class="data-rows-container">${historyDataHtml}</div>` : ''}${explanationHtml}</div></div>`;
}


// --- Sparkline rendering (lightweight canvas-only, no Chart.js dependency) ---
function hexToRgb(color) {
    if (!color) return null;
    const value = color.trim();
    const named = { 'var(--logo-teal)': '44, 95, 90' };
    if (named[value]) return named[value];
    const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!hex) return null;
    let h = hex[1];
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const int = parseInt(h, 16);
    return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
}

function drawSparkline(canvas) {
    try {
        const values = JSON.parse(canvas.dataset.sparkline);
        if (!values || values.length < 3) return false;
        const container = canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return false;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const minVal = Math.min(...values), maxVal = Math.max(...values);
        const range = maxVal - minVal;
        const lineWidth = 1.5;
        const inset = lineWidth / 2;
        const innerW = width - inset * 2;
        const innerH = height - inset * 2;

        // Tint the trace with the card's accent so categories stay distinguishable.
        const cardStyle = getComputedStyle(container.closest('.indicator') || container);
        const accent = (cardStyle.getPropertyValue('--indicator-accent') || cardStyle.getPropertyValue('--category-accent')).trim();
        const rgb = hexToRgb(accent) || '44, 95, 90';

        // Create gradient fill
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, `rgba(${rgb}, 0.12)`);
        gradient.addColorStop(1, `rgba(${rgb}, 0)`);

        // Calculate points (edge-to-edge: only a half-line inset so the
        // stroke is flush with the card border instead of clipped)
        const points = values.map((val, i) => ({
            x: inset + (i / (values.length - 1)) * innerW,
            y: range > 0 ? inset + (1 - (val - minVal) / range) * innerH : inset + innerH / 2
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
        ctx.strokeStyle = `rgba(${rgb}, 0.18)`;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.stroke();
        return true;
    } catch (e) { /* skip broken sparklines */ return false; }
}

function renderSparklines() {
    const canvases = document.querySelectorAll('.sparkline-container canvas[data-sparkline]');
    const draw = canvas => {
        if (canvas._sparklineRendered) return true;
        const drawn = drawSparkline(canvas);
        canvas._sparklineRendered = drawn;
        return drawn;
    };

    if (!('IntersectionObserver' in window)) {
        canvases.forEach(draw);
        return;
    }

    /* Cards use content-visibility, so an off-screen card reports its
       contain-intrinsic-size. Wait until a card is on screen so the
       sparkline is drawn at its real size. */
    if (sparklineObserver) sparklineObserver.disconnect();
    sparklineObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            if (draw(entry.target)) sparklineObserver.unobserve(entry.target);
        });
    }, { rootMargin: '300px 0px' });

    canvases.forEach(canvas => {
        if (canvas._sparklineRendered) return;
        sparklineObserver.observe(canvas);
    });
}

let sparklineObserver = null;
let sparklineResizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(sparklineResizeTimer);
    sparklineResizeTimer = setTimeout(() => {
        document.querySelectorAll('.sparkline-container canvas[data-sparkline]').forEach(canvas => {
            canvas._sparklineRendered = false;
        });
        renderSparklines();
    }, 200);
}, { passive: true });
