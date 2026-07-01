// Indicator card creation and rendering

const IndicatorRenderers = (function () {
    'use strict';

    const registry = new Services.Registry('IndicatorRenderers');

    // --- Shared data extraction helpers (SRP) ---

    function calculateTrend(currentValue, previousValue) {
        if (!currentValue || !previousValue) return null;
        const current = parseFloat(currentValue);
        const previous = parseFloat(previousValue);
        if (isNaN(current) || isNaN(previous)) return null;
        const change = current - previous;
        const changePercent = previous > 0 ? ((change / previous) * 100).toFixed(1) : 0;
        return { direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral', change: change.toFixed(0), changePercent };
    }

    function formatDateShort(date) {
        return new Date(date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    }

    function trendArrow(trend) {
        if (!trend) return '';
        const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→';
        const color = trend.direction === 'up' ? '#22c55e' : trend.direction === 'down' ? '#ef4444' : '#9ca3af';
        return `<span class="trend-arrow" style="color: ${color};">${arrow}${Math.abs(trend.change)}¢</span>`;
    }

    function collectMonthlyData(indicator, MONTHS, MONTH_LABELS) {
        const yearKeys = Object.keys(indicator).filter(key => /^\d{4}$/.test(key)).map(key => parseInt(key)).sort((a, b) => b - a);
        const availableData = [];
        MONTHS.forEach((month, index) => {
            let value = null, year = null;
            for (const yr of yearKeys) { if (indicator[yr] && indicator[yr][month] !== undefined) { value = indicator[yr][month]; year = yr; break; } }
            if (value === null) { value = indicator[month]; year = null; }
            if (isValidData(value)) availableData.push({ month, label: MONTH_LABELS[index], value, index, year });
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
        if (indicator.rate_hold_odds && indicator.rate_cut_odds && indicator.rate_hike_odds) {
            const holdProb = parseFloat(indicator.rate_hold_odds), cutProb = parseFloat(indicator.rate_cut_odds), hikeProb = parseFloat(indicator.rate_hike_odds);
            let holdTrend = null, cutTrend = null, hikeTrend = null;
            let sortedProbabilities = null;
            if (indicator.probabilities && typeof indicator.probabilities === 'object') {
                sortedProbabilities = Object.entries(indicator.probabilities).sort(([a], [b]) => new Date(b) - new Date(a));
                if (sortedProbabilities.length > 1) {
                    const previous = sortedProbabilities[1][1];
                    holdTrend = calculateTrend(indicator.rate_hold_odds, previous.rate_hold_odds);
                    cutTrend = calculateTrend(indicator.rate_cut_odds, previous.rate_cut_odds);
                    hikeTrend = calculateTrend(indicator.rate_hike_odds, previous.rate_hike_odds);
                }
            }


            latestDataHtml = `
                <div class="prediction-bar-container" style="margin-top: 4px;">
                    <div class="fomc-stacked-bar-row">
                        <div class="fomc-stacked-bar-track">
                            <div class="fomc-segment fomc-hold" style="width: ${holdProb}%;" title="Hold: ${indicator.rate_hold_odds}">
                                <span class="fomc-segment-label">${indicator.rate_hold_odds}</span>
                                ${trendArrow(holdTrend)}
                            </div>
                            <div class="fomc-segment fomc-hike" style="width: ${hikeProb}%;" title="Hike: ${indicator.rate_hike_odds}">
                                <span class="fomc-segment-label">${indicator.rate_hike_odds}</span>
                                ${trendArrow(hikeTrend)}
                            </div>
                            <div class="fomc-segment fomc-cut" style="width: ${cutProb}%;" title="Cut: ${indicator.rate_cut_odds}">
                                <span class="fomc-segment-label">${indicator.rate_cut_odds}</span>
                                ${trendArrow(cutTrend)}
                            </div>
                        </div>
                    </div>
                    <div class="fomc-legend">
                        <span class="fomc-legend-item"><span class="fomc-legend-color fomc-hold"></span>Hold</span>
                        <span class="fomc-legend-item"><span class="fomc-legend-color fomc-hike"></span>Hike</span>
                        <span class="fomc-legend-item"><span class="fomc-legend-color fomc-cut"></span>Cut</span>
                    </div>
                </div>`;

            if (sortedProbabilities && sortedProbabilities.length > 1) {
                hasHistory = true;
                historyDataHtml = sortedProbabilities.slice(1).map(([date, probs], index) => {
                    const dateLabel = formatDateShort(date);
                    const hold = probs.rate_hold_odds || '—', cut = probs.rate_cut_odds || '—', hike = probs.rate_hike_odds || '—';
                    const prevEntry = sortedProbabilities[index + 2];
                    let trendHtml = '';
                    if (prevEntry) {
                        const prevProbs = prevEntry[1];
                        const holdTrend = calculateTrend(hold, prevProbs.rate_hold_odds);
                        if (holdTrend) {
                            const arrow = holdTrend.direction === 'up' ? '↑' : holdTrend.direction === 'down' ? '↓' : '→';
                            const color = holdTrend.direction === 'up' ? '#22c55e' : holdTrend.direction === 'down' ? '#ef4444' : '#9ca3af';
                            trendHtml = `<span class="trend-arrow-small" style="color: ${color};">${arrow}</span>`;
                        }
                    }
                    return `<div class="prediction-history-row prediction-history-row-inline"><span class="prediction-history-date prediction-history-date-inline">${dateLabel}</span><div class="prediction-history-content"><div class="prediction-history-item"><span class="prediction-hold-value">${hold}</span>${trendHtml}</div><div class="prediction-history-item"><span class="prediction-hike-value">${hike}</span></div><div class="prediction-history-item"><span class="prediction-cut-value">${cut}</span></div></div></div>`;
                }).join('');
            }
        } else {
            if (indicator.rate_hold_odds) rows.push(`<span class="month-label">Hold:</span> <span class="month-value">${indicator.rate_hold_odds}</span>`);
            if (indicator.rate_cut_odds) rows.push(`<span class="month-label">Cut:</span> <span class="month-value">${indicator.rate_cut_odds}</span>`);
            if (indicator.rate_hike_odds) rows.push(`<span class="month-label">Hike:</span> <span class="month-value">${indicator.rate_hike_odds}</span>`);
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
                let yesTrend = null, noTrend = null;
                if (sorted.length > 1) {
                    const previous = sorted[1][1];
                    yesTrend = calculateTrend(latest[1].yes, previous.yes);
                    noTrend = calculateTrend(latest[1].no, previous.no);
                }
                const containerClass = useDualBarClass ? 'prediction-bar-container prediction-dual-bar' : 'prediction-bar-container';
                latestDataHtml = `
                    <div class="${containerClass}">
                        <div class="prediction-bar-row prediction-bar-row-inline">
                            <span class="prediction-value">${latest[1].yes}</span>
                            ${trendArrow(yesTrend)}
                            <div class="prediction-bar-track prediction-bar-track-inline">
                                <div class="prediction-bar-fill yes-bar" style="width: ${yesProb}%; height: 100%;" title="${latest[1].yes} Yes"></div>
                                <div class="prediction-bar-fill no-bar" style="width: ${noProb}%; position: absolute; right: 0; height: 100%;" title="${latest[1].no} No"></div>
                            </div>
                            <span class="prediction-value-left">${latest[1].no}</span>
                            ${trendArrow(noTrend)}
                        </div>
                    </div>`;
            }

            if (sorted.length > 1) {
                hasHistory = true;
                historyDataHtml = sorted.slice(1).map(([date, probs], index) => {
                    const yesProb = parseFloat(probs.yes), noProb = parseFloat(probs.no);
                    const dateLabel = formatDateShort(date);
                    const prevEntry = sorted[index + 2];
                    let trendHtml = '';
                    if (prevEntry) {
                        const prevProbs = prevEntry[1];
                        const yesTrend = calculateTrend(probs.yes, prevProbs.yes);
                        if (yesTrend) {
                            const arrow = yesTrend.direction === 'up' ? '↑' : yesTrend.direction === 'down' ? '↓' : '→';
                            const color = yesTrend.direction === 'up' ? '#22c55e' : yesTrend.direction === 'down' ? '#ef4444' : '#9ca3af';
                            trendHtml = `<span class="trend-arrow-small" style="color: ${color};">${arrow}</span>`;
                        }
                    }
                    return `<div class="prediction-history-row prediction-history-row-inline"><span class="prediction-history-date prediction-history-date-inline">${dateLabel}</span><div class="prediction-history-content"><div class="prediction-history-item"><span class="prediction-yes-value">${probs.yes}</span>${trendHtml}</div><div class="prediction-history-item"><span class="prediction-no-value">${probs.no}</span></div></div></div>`;
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
                            <div class="prediction-bar-fill yes-bar" style="width: ${yesProb}%; height: 100%;" title="${indicator.yes_probability} Yes"></div>
                            <div class="prediction-bar-fill no-bar" style="width: ${noProb}%; position: absolute; right: 0; height: 100%;" title="${indicator.no_probability} No"></div>
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
                    const probValue = parseFloat(prob);
                    html += `<div class="prediction-bar-row"><span class="prediction-bar-label" style="min-width: ${labelWidth}; font-size: ${fontSize};">${name}</span><div class="prediction-bar-track"><div class="prediction-bar-fill yes-bar" style="width: ${probValue}%; display: flex; align-items: center; justify-content: flex-start; padding-left: 8px; color: white; font-size: ${fontSize}; font-weight: bold;">${prob}</div></div></div>`;
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
                const probValue = parseFloat(prob);
                latestDataHtml += `<div class="prediction-bar-row"><span class="prediction-bar-label" style="min-width: 90px;">${name}</span><div class="prediction-bar-track"><div class="prediction-bar-fill yes-bar" style="width: ${probValue}%; display: flex; align-items: center; justify-content: flex-start; padding-left: 8px; color: white; font-size: 12px; font-weight: bold;">${prob}</div></div></div>`;
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
        const dailyEntries = indicator.daily && typeof indicator.daily === 'object' ? Object.entries(indicator.daily).sort(([a], [b]) => new Date(b) - new Date(a)) : [];
        const latestEntry = dailyEntries[0], previousEntry = dailyEntries[1];
        const latestCount = latestEntry ? parseInt(latestEntry[1], 10) : null;
        const prevCount = previousEntry ? parseInt(previousEntry[1], 10) : null;
        const latestDateStr = latestEntry ? new Date(latestEntry[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '\u2014';
        const capacityPct = latestCount !== null ? Math.min(Math.round((latestCount / PRECRISIS_NORMAL) * 100), 100) : 0;
        const propKeys = indicator.probabilities ? Object.keys(indicator.probabilities).sort((a, b) => new Date(b) - new Date(a)) : [];
        const currentPropKey = propKeys[0];
        const currentProp = currentPropKey ? indicator.probabilities[currentPropKey] : null;

        const latestDataHtml = `<div class="hormuz-card"><div class="hormuz-top-row"><span class="hormuz-count-num">${latestCount !== null ? latestCount : '\u2014'}</span><span class="hormuz-count-unit">/day</span><span class="hormuz-status-badge">Blockade</span></div><div class="hormuz-capacity-row" title="vs pre-crisis baseline of ~${PRECRISIS_NORMAL}/day"><div class="hormuz-capacity-track"><div class="hormuz-capacity-fill ${capacityPct < 20 ? 'hormuz-capacity--critical' : capacityPct < 50 ? 'hormuz-capacity--low' : 'hormuz-capacity--normal'}" style="width: ${capacityPct}%"></div></div><span class="hormuz-capacity-text">${capacityPct}% · ${latestDateStr}</span></div></div>`;

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
                historyDataHtml += `<div class="hormuz-daily-item ${isLow ? 'hormuz-daily--low' : ''}"><span class="hormuz-daily-date">${dateStr}</span><span class="hormuz-daily-count">${count}</span>${snap?.vesselsAttacked ? `<span class="hormuz-daily-badge">⚠ ${snap.vesselsAttacked}</span>` : ''}</div>`;
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

    // --- Registry setup ---
    registry.register('fomc', (indicator) => renderFOMC(indicator)).register('recession', (indicator) => renderRecession(indicator)).register('prediction', (indicator) => renderPrediction(indicator)).register('sports', (indicator) => renderSports(indicator)).register('venezuela', (indicator) => renderVenezuela(indicator)).register('hormuz', (indicator) => renderHormuz(indicator)).register('politicalPoll', (indicator) => renderPoliticalPoll(indicator)).register('standard', (indicator, MONTHS, MONTH_LABELS) => renderStandard(indicator, MONTHS, MONTH_LABELS)).registerFallback((indicator, MONTHS, MONTH_LABELS) => renderStandard(indicator, MONTHS, MONTH_LABELS));
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
    const probabilities = indicator.probabilities || indicator.propabilities;
    if (probabilities && typeof probabilities === 'object') {
        const firstEntry = Object.values(probabilities)[0];
        if (firstEntry && !firstEntry.yes && !firstEntry.no) return 'venezuela';
        return 'prediction';
    }
    if (indicator.candidates && typeof indicator.candidates === 'object') return 'venezuela';
    if (indicator.name === 'KY-04 Massie v. Gallrein') return 'politicalPoll';
    if (indicator.yes_probability && indicator.no_probability) return 'prediction';
    if (indicator.name === 'Strait of Hormuz Daily Transits') return 'hormuz';
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

// --- Change Metric Button builder ---

function buildChangeMetricButton(label, changeInfo, title) {
    const iconName = changeInfo.direction > 0 ? 'arrow-up-right' : changeInfo.direction < 0 ? 'arrow-down-right' : 'minus';
    const topSection = label ? `<span class="change-metric-title">${label}</span>` : '';
    const valueWithoutSign = changeInfo.formatted.replace(/^[+\-]/, '');
    const valueWithIcon = `<i data-lucide="${iconName}" style="display: inline; width: 0.85em; height: 0.85em; vertical-align: -0.05em; margin-right: 2px;"></i>${valueWithoutSign}`;
    return `<div class="change-metric-block"><button type="button" class="change-metric-btn ${changeInfo.cssClass}" title="${title.replace(/"/g, '&quot;')}">${topSection}<span class="change-metric-value">${valueWithIcon}</span></button></div>`;
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
    const isBudgetDeficitIndicator = indicator.name.includes('Budget Deficit');
    const momChangeValue = momChange.percentChange;
    const momInfo = formatChangeIndicator(momChangeValue);
    const changeLabel = indicator.change_label || 'MoM';
    result += buildChangeMetricButton(changeLabel, momInfo, changeLabel + ' change');
    if (yoyChange !== null) {
        const yoyChangeValue = isUnemploymentIndicator ? -yoyChange.percentChange : isBudgetDeficitIndicator ? -yoyChange.percentChange : yoyChange.percentChange;
        const yoyInfo = formatChangeIndicator(yoyChangeValue);
        result += buildChangeMetricButton('YoY', yoyInfo, 'Year over Year');
    }
    return result;
}

function buildIndicatorCardHTML({ indicator, DATA_ATTRS, url, explanation, changeIndicators, latestDataHtml, historyDataHtml, hasHistory, sparklineValues }) {
    const accent = indicator.color || 'var(--logo-teal)';
    const isNew = indicator.lastUpdated && (Date.now() - new Date(indicator.lastUpdated).getTime()) < (3 * 24 * 60 * 60 * 1000);
    return `<div class="indicator" ${DATA_ATTRS.INDICATOR_NAME}="${indicator.name.replace(/"/g, '&quot;')}" style="--indicator-accent: ${accent};"><div class="indicator-header"><div class="indicator-name">${indicator.name}${isNew ? '<span class="new-badge">New</span>' : ''}</div><div class="indicator-actions">${explanation ? `<button class="info-btn" title="Show explanation" aria-label="Show explanation" ${DATA_ATTRS.EXPLANATION}="${explanation.replace(/"/g, '&quot;')}"><i data-lucide="info" class="info-icon"></i></button>` : ''}${indicator.category !== 'Prediction Markets' ? `<button class="chart-btn" title="View Interactive Chart" aria-label="View chart"><i data-lucide="bar-chart-3" class="chart-icon"></i></button>` : ''}${hasHistory ? `<button class="expand-toggle" aria-label="Toggle history"><i data-lucide="chevron-down"></i></button>` : ''}</div></div><div class="indicator-agency">Source: <a href="${url}" target="_blank" rel="noopener noreferrer">${indicator.agency}</a>${indicator.portwatch_url ? ` | <a href="${indicator.portwatch_url}" target="_blank" rel="noopener noreferrer">PortWatch</a>` : ''}${indicator.category === 'Prediction Markets' && indicator.kalshi_url ? ` | <a href="${indicator.kalshi_url}" target="_blank" rel="noopener noreferrer">Kalshi</a>` : ''}${indicator.category === 'Prediction Markets' && indicator.polymarket_url ? ` | <a href="${indicator.polymarket_url}" target="_blank" rel="noopener noreferrer">Polymarket</a>` : ''}${indicator.lastUpdated ? ` | <span class="indicator-date">${new Date(indicator.lastUpdated).getMonth() + 1}/${new Date(indicator.lastUpdated).getDate()}</span>` : ''}</div>${changeIndicators ? `<div class="change-indicators">${changeIndicators}</div>` : ''}<div class="indicator-content">${latestDataHtml}<div class="explanation-text" style="display: none; margin-top: 8px; padding: 8px; background: var(--bg-secondary, #f5f5f5); border-radius: 4px; font-size: 0.9em; color: var(--text-secondary, #666);"></div>${hasHistory ? `<div class="data-rows-container">${historyDataHtml}</div>` : ''}</div>${sparklineValues.length > 2 ? `<div class="sparkline-container"><canvas data-sparkline='${JSON.stringify(sparklineValues)}'></canvas></div>` : ''}</div>`;
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
            
            // Draw fill area
            ctx.beginPath();
            ctx.moveTo(points[0].x, height);
            points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.lineTo(points[points.length - 1].x, height);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();
            
            // Draw line
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                const xc = (points[i].x + points[i - 1].x) / 2;
                const yc = (points[i].y + points[i - 1].y) / 2;
                ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
            }
            ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            ctx.strokeStyle = 'rgba(44, 95, 90, 0.18)';
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        } catch (e) { /* skip broken sparklines */ }
    });
}
