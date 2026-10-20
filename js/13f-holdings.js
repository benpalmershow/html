// 13F Holdings functionality

let firmData = null;
let allHoldings = [];
let firmShortNames = [];
let previousData = {};

async function load13FData() {
    try {
        const data = await Services.dataService.fetchJSON('json/13f-holdings.json');
        firmData = data.firms;
        allHoldings = data.holdings;
        previousData = data.previous || {};
        firmShortNames = data.firms.map(f => f.shortName);
        initializeFirmCards();
    } catch (error) {
        console.error('Could not load 13F holdings data:', error);
    }
}

function getBgColor() {
    return getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim();
}

function hexToRgba(hex, alpha = 1) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getColorByValue(percentage) {
    if (percentage >= 8) {
        return '#E63946';
    } else if (percentage >= 5) {
        return '#FF8C42';
    } else if (percentage >= 3) {
        return '#FACC15';
    } else if (percentage >= 1.5) {
        return '#33AA66';
    } else {
        return '#3399CC';
    }
}
function getFilingDate(firmIdx) {
    // Extract filing date from firm data or use default
    if (firmData && firmData[firmIdx] && firmData[firmIdx].filingDate) {
        const parts = String(firmData[firmIdx].filingDate).split('-');
        const month = parseInt(parts[1], 10);
        const day = parseInt(parts[2], 10);
        if (!isNaN(month) && !isNaN(day)) {
            return month + '/' + day;
        }
    }
    // Default for older firms
    return '11/26';
}


function isETF(holding) {
    const name = holding.name.toUpperCase();
    
    const etfIssuers = [
        'ISHARES', 'VANGUARD', 'SPDR', 'INVESCO',
        'STRATEGIC TR', 'PROSHARES', 'VANECK', 'GLOBAL X', 'KRANESHARES',
        'SIMPLIFY', 'WISDOMTREE', 'TEUCRIUM', 'FIRST TR', 'ABERDEEN', 'ABRDN',
        'DIMENSIONAL', 'GRANITESHARES', 'INNOVATOR', 'STRIVE', 'MIDDAG',
        'PIMCO', 'STATE STR', 'EXCHANGE TRADED', 'SELECT SECTOR',
        'SERIES', 'FDS', 'FD VI', 'PORTFOLIO', 'T ROWE PRICE',
        'COLUMBIA ETF', 'COHEN & STEERS', 'YIELDMAX', 'BITWISE',
        'GRAYSCALE', 'COINSHARES', 'ARK', 'MIDDAG'
    ];
    if (etfIssuers.some(issuer => name.includes(issuer))) {
        return true;
    }
    
    const stockIndicators = ['INC', 'CORP', 'PLC', 'LTD', 'A S F', 'CO'];
    if (stockIndicators.some(indicator => name.includes(indicator))) {
        return false;
    }
    
    const etfKeywords = ['ETF', 'TRUST', 'FUND', 'INDEX', 'SPDR', 'ISHARES', 'VANGUARD', 'INVESCO', 'DIMENSIONAL'];
    if (etfKeywords.some(keyword => name.includes(keyword))) {
        return true;
    }
    
    return false;
}

function getPriorSnapshot(firmIdx) {
    if (!firmData || !firmData[firmIdx]) return null;
    const snapshot = previousData[firmData[firmIdx].name];
    return snapshot && snapshot.holdings ? snapshot : null;
}

function formatAum(value) {
    if (value >= 1e9) return '$' + (value / 1e9).toFixed(1) + 'B';
    if (value >= 1e6) return '$' + (value / 1e6).toFixed(1) + 'M';
    if (value >= 1e3) return '$' + (value / 1e3).toFixed(1) + 'K';
    return '$' + value.toFixed(0);
}

function formatShares(shares) {
    if (!shares) return '0';
    if (shares >= 1e9) return (shares / 1e9).toFixed(2) + 'B';
    if (shares >= 1e6) return (shares / 1e6).toFixed(1) + 'M';
    if (shares >= 1e3) return (shares / 1e3).toFixed(1) + 'K';
    return String(shares);
}

// Quarter-over-quarter change for a single position.
function holdingChange(holding, priorSnapshot) {
    if (!priorSnapshot) return null;

    const prior = holding.cusip ? priorSnapshot.holdings[holding.cusip] : null;
    if (!prior) {
        return { label: 'NEW', className: 'change-new', title: 'New position this quarter' };
    }

    const valueChange = prior.value ? ((holding.value - prior.value) / prior.value) * 100 : null;
    const shareChange = prior.shares ? ((holding.shares - prior.shares) / prior.shares) * 100 : null;

    const shareText = shareChange === null
        ? 'position size unknown'
        : `Shares ${formatShares(prior.shares)} \u2192 ${formatShares(holding.shares)} (${shareChange > 0 ? '+' : ''}${shareChange.toFixed(1)}%)`;

    if (valueChange === null) {
        return { label: '\u2014', className: 'change-flat', title: shareText };
    }

    const rounded = Math.abs(valueChange) < 0.05 ? 0 : valueChange;
    const className = rounded > 0 ? 'change-positive' : rounded < 0 ? 'change-negative' : 'change-flat';
    const arrow = rounded > 0 ? '\u25b2' : rounded < 0 ? '\u25bc' : '\u2014';
    const label = rounded === 0 ? '\u2014' : `${arrow} ${Math.abs(rounded).toFixed(1)}%`;

    return { label, className, title: shareText };
}

function buildHoldingItem(holding, priorSnapshot, index) {
    const safeName = HtmlUtils.escapeHtml(holding.name);
    const safeTicker = HtmlUtils.escapeHtml(holding.ticker);
    const isValidLink = holding.link && typeof holding.link === 'string' && (holding.link.startsWith('https://') || holding.link.startsWith('http://'));
    const safeLink = isValidLink ? holding.link : 'https://www.perplexity.ai/finance/' + safeName;

    // Check if ticker is a CIK number (10 digits) or if it looks like a number
    const isCIK = /^\d{10}$/.test(holding.ticker) || /^\d+$/.test(holding.ticker);
    const displayTicker = isCIK ? '' : safeTicker;
    const displayText = isCIK ? safeName : displayTicker;

    const change = holdingChange(holding, priorSnapshot);
    const changeHtml = change
        ? `<span class="holding-change ${change.className}" title="${HtmlUtils.escapeHtml(change.title)}">${change.label}</span>`
        : '';

    return `
        <div class="holding-item" data-holding-index="${index}" data-pct="${holding.pct}" style="--pct-width: ${Math.min(holding.pct * 2, 100)}%; --pct-color: ${getColorByValue(holding.pct)};">
             <div class="holding-ticker"><a href="${safeLink}" target="_blank" rel="noopener noreferrer" title="${safeName}">${displayText}</a></div>
            <div class="holding-name">${safeName}</div>
            ${changeHtml}
            <div class="holding-pct">${holding.pct}%</div>
        </div>
    `;
}

function createFirmCardHTML(firmIdx, firmName, totalValue, firmHoldings, description) {
    const topPositions = firmHoldings.slice(0, 5);
    const concentrationPct = topPositions.reduce((sum, h) => sum + h.pct, 0);
    const priorSnapshot = getPriorSnapshot(firmIdx);

    let aumDelta = '';
    if (priorSnapshot && priorSnapshot.total) {
        const delta = ((totalValue - priorSnapshot.total) / priorSnapshot.total) * 100;
        const deltaClass = delta > 0 ? 'change-positive' : delta < 0 ? 'change-negative' : 'change-flat';
        const arrow = delta > 0 ? '\u25b2' : delta < 0 ? '\u25bc' : '\u2014';
        aumDelta = `<span class="firm-delta ${deltaClass}">${arrow} ${Math.abs(delta).toFixed(1)}%</span>`;
    }

    const period = firmData && firmData[firmIdx] ? firmData[firmIdx].period : null;
    const periodRow = period
        ? `<div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px;">
            <span style="color: var(--text-secondary); font-size: 0.8rem;">Period:</span>
            <span style="color: var(--text-primary); font-weight: 600; font-size: 0.8rem;">${HtmlUtils.escapeHtml(period)}</span>
        </div>`
        : '';

    const firmDetails = `
        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border-color);">
            <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px;">
                <span style="color: var(--text-secondary); font-size: 0.8rem;">AUM:</span>
                <span style="color: var(--logo-teal); font-weight: 600; font-size: 0.8rem;">${formatAum(totalValue)}${aumDelta}</span>
            </div>
            ${periodRow}
            <div style="display: flex; justify-content: space-between; gap: 12px; margin-bottom: 4px;">
                <span style="color: var(--text-secondary); font-size: 0.8rem;">Filed:</span>
                <span style="color: var(--text-primary); font-weight: 600; font-size: 0.8rem;">${getFilingDate(firmIdx)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; gap: 12px;">
                <span style="color: var(--text-secondary); font-size: 0.8rem;">Top 5:</span>
                <span style="color: var(--logo-orange); font-weight: 600; font-size: 0.8rem;">${concentrationPct.toFixed(1)}%</span>
            </div>
        </div>
    `;

    return `
        <div class="indicator-header">
            <div class="firm-card-title">${HtmlUtils.escapeHtml(firmName)}</div>
            <div class="indicator-actions">
                <button class="firm-sort-toggle" aria-label="Sort holdings" data-firm="${firmIdx}"><i data-lucide="arrow-up-down"></i></button>
                <button class="expand-toggle" aria-label="Toggle firm details"><i data-lucide="chevron-down"></i></button>
            </div>
        </div>
        <div class="indicator-explanation">
            <div class="indicator-explanation-header">Firm details</div>
            <div class="indicator-explanation-body">
                ${firmDetails}
                ${description || ''} ${/* description may contain intentional HTML from trusted JSON source */''}
            </div>
        </div>
        <div class="indicator-content">
            <div class="data-rows-container">
                <div class="firm-chart-container">
                    <div class="firm-filter-buttons">
                        <button class="firm-filter-btn active" data-filter="all" data-firm="${firmIdx}">All</button>
                        <button class="firm-filter-btn" data-filter="etf" data-firm="${firmIdx}">ETFs</button>
                        <button class="firm-filter-btn" data-filter="stock" data-firm="${firmIdx}">Stocks</button>
                    </div>
                    <div class="firm-holdings-list" data-firm-holdings="${firmIdx}">
                        ${firmHoldings.slice(0, 13).map((h, idx) => buildHoldingItem(h, priorSnapshot, idx)).join('')}
                    </div>
                    <div class="firm-empty-state" style="display: none;">
                        <div class="empty-state-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M4 19h16"></path>
                                <path d="M7 16V9"></path>
                                <path d="M12 16V5"></path>
                                <path d="M17 16v-7"></path>
                            </svg>
                        </div>
                        <div class="empty-state-text">No holdings match this filter</div>
                    </div>
                    <div class="firm-show-more" style="display: ${firmHoldings.length > 13 ? 'flex' : 'none'};">
                        <button class="firm-show-more-btn" data-firm="${firmIdx}">Show more</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function initializeFirmCards() {
    const container = document.getElementById('firmCardsContainer');
    if (!container) return;

    container.innerHTML = '';

    // Sort firms by filing date (newest first), then by name for consistency
    const sortedFirmIndices = firmData.map((firm, index) => index)
        .sort((a, b) => {
            // Get filing dates or use default for comparison
            const dateA = firmData[a].filingDate ? new Date(firmData[a].filingDate) : new Date('2025-11-26');
            const dateB = firmData[b].filingDate ? new Date(firmData[b].filingDate) : new Date('2025-11-26');
            // Sort by date descending (newest first)
            return dateB - dateA;
        });

    for (let sortIdx = 0; sortIdx < sortedFirmIndices.length; sortIdx++) {
        const firmIdx = sortedFirmIndices[sortIdx];
        const firmHoldings = allHoldings.filter(h => h.firmIndex === firmIdx).sort((a, b) => b.value - a.value);

        if (firmHoldings.length === 0) continue;

        const totalValue = firmHoldings.reduce((sum, h) => sum + h.value, 0);
        const description = firmData && firmData[firmIdx] ? firmData[firmIdx].description : '';
        const priorSnapshot = getPriorSnapshot(firmIdx);

        const card = document.createElement('div');
        card.className = 'indicator';
        card.setAttribute('data-indicator-name', firmShortNames[firmIdx]);
        card.innerHTML = createFirmCardHTML(firmIdx, firmShortNames[firmIdx], totalValue, firmHoldings, description);
        container.appendChild(card);

        // Store state for this firm
        const firmState = {
            filter: 'all',
            sort: 'pct',
            showMore: false
        };

        const sortOptions = ['pct', 'value', 'name'];
        const sortLabels = { pct: 'percentage', value: 'value', name: 'name' };

        function updateFirmDisplay() {
            let displayHoldings = [...firmHoldings];

            // Apply filter
            if (firmState.filter === 'etf') {
                displayHoldings = displayHoldings.filter(h => isETF(h));
            } else if (firmState.filter === 'stock') {
                displayHoldings = displayHoldings.filter(h => !isETF(h));
            }

            // Apply sort
            if (firmState.sort === 'pct') {
                displayHoldings.sort((a, b) => b.pct - a.pct);
            } else if (firmState.sort === 'value') {
                displayHoldings.sort((a, b) => b.value - a.value);
            } else if (firmState.sort === 'name') {
                displayHoldings.sort((a, b) => a.name.localeCompare(b.name));
            }

            // Determine how many to show
            const showCount = firmState.showMore ? displayHoldings.length : Math.min(13, displayHoldings.length);

            // Update holdings list
            const holdingsList = card.querySelector(`[data-firm-holdings="${firmIdx}"]`);
            const emptyState = card.querySelector('.firm-empty-state');
            const showMoreDiv = card.querySelector('.firm-show-more');
            const showMoreBtn = card.querySelector('.firm-show-more-btn');
            const sortToggle = card.querySelector('.firm-sort-toggle');

            if (holdingsList) {
                if (displayHoldings.length === 0) {
                    holdingsList.style.display = 'none';
                    if (emptyState) emptyState.style.display = 'block';
                    if (showMoreDiv) showMoreDiv.style.display = 'none';
                } else {
                    holdingsList.style.display = 'flex';
                    if (emptyState) emptyState.style.display = 'none';

                    holdingsList.innerHTML = displayHoldings.slice(0, showCount).map((h, idx) =>
                        buildHoldingItem(h, priorSnapshot, idx)).join('');

                    // Show/hide "Show more" button
                    if (showMoreDiv && showMoreBtn) {
                        if (displayHoldings.length > 13) {
                            showMoreDiv.style.display = 'flex';
                            showMoreBtn.textContent = firmState.showMore ? 'Show less' : `Show more (${displayHoldings.length - 13})`;
                        } else {
                            showMoreDiv.style.display = 'none';
                        }
                    }

                    // Add click handlers for holdings
                    holdingsList.querySelectorAll('.holding-item').forEach((item) => {
                        item.addEventListener('click', (e) => {
                            // If the click originated from a link, allow default navigation
                            if (e.target.closest('a')) return;
                            e.preventDefault();
                            const holdingIndex = parseInt(item.dataset.holdingIndex);

                            // Highlight the holding item in the list
                            holdingsList.querySelectorAll('.holding-item').forEach(h => {
                                h.classList.remove('highlighted');
                                h.style.borderLeft = '';
                                h.style.borderImage = '';
                            });
                            const pct = item.dataset.pct;
                            item.classList.add('highlighted');
                            item.style.borderLeft = `3px solid ${getColorByValue(pct)}`;
                        });
                    });
                }
            }

            // Update filter button states
            card.querySelectorAll('.firm-filter-btn').forEach(btn => {
                const isActive = btn.dataset.filter === firmState.filter;
                btn.classList.toggle('active', isActive);
            });

            // Update sort toggle title
            if (sortToggle) {
                sortToggle.title = `Sort by ${sortLabels[firmState.sort]}`;
            }
        }

        // Setup filter button handlers
        card.querySelectorAll('.firm-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                firmState.filter = btn.dataset.filter;
                firmState.showMore = false; // Reset show more when filtering
                updateFirmDisplay();
            });
        });

        // Setup sort toggle handler - cycles through sort options
        const sortToggle = card.querySelector('.firm-sort-toggle');
        if (sortToggle) {
            // Initialize with default sort
            sortToggle.title = `Sort by ${sortLabels[firmState.sort]}`;

            sortToggle.addEventListener('click', () => {
                const currentIndex = sortOptions.indexOf(firmState.sort);
                const nextIndex = (currentIndex + 1) % sortOptions.length;
                firmState.sort = sortOptions[nextIndex];
                updateFirmDisplay();
            });
        }

        // Setup show more button handler
        const showMoreBtn = card.querySelector('.firm-show-more-btn');
        if (showMoreBtn) {
            showMoreBtn.addEventListener('click', () => {
                firmState.showMore = !firmState.showMore;
                updateFirmDisplay();
            });
        }

        // Initialize display with event handlers
        updateFirmDisplay();
    }

    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

// Note: load13FData is triggered lazily by financials.js (ensureLoad13F)
// when the 13F section scrolls into view. No auto-init needed here.
