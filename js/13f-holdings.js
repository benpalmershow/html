// 13F Holdings functionality

let firmData = null;
let allHoldings = [];
let firmShortNames = [];

async function load13FData() {
    try {
        const data = await Services.dataService.fetchJSON('json/13f-holdings.json');
        firmData = data.firms;
        allHoldings = data.holdings;
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
        const date = new Date(firmData[firmIdx].filingDate);
        return (date.getMonth() + 1) + '/' + date.getDate();
    }
    // Default for older firms
    return '11/26';
}


function isETF(holding) {
    const name = holding.name.toUpperCase();
    const stockIndicators = ['INC', 'CORP', 'CLASS A', 'CLASS B', 'A S F'];
    if (stockIndicators.some(indicator => name.includes(indicator))) {
        return false;
    }
    const etfIndicators = ['ETF', 'TRUST', 'FUND', 'INDEX', 'SPDR', 'ISHARES', 'VANGUARD', 'INVESCO', 'DIMENSIONAL'];
    if (etfIndicators.some(indicator => name.includes(indicator))) {
        return true;
    }
    return false;
}

function createFirmCardHTML(firmIdx, firmName, totalValue, firmHoldings, description) {
    return `
        <div class="indicator-header">
            <div class="firm-card-title">${firmName}</div>
            <div class="indicator-actions">
                ${description ? `<button class="info-btn" title="Show firm description" aria-label="Show firm description" data-explanation="${description.replace(/"/g, '&quot;')}"><i data-lucide="info" class="info-icon" style="width: 16px; height: 16px;"></i></button>` : ''}
            </div>
        </div>
        <div class="firm-card-info">
            <div>AUM: $${(totalValue / 1000000).toFixed(1)}M</div>
            <div>Filed: ${getFilingDate(firmIdx)}</div>
        </div>
        <div class="firm-filter-buttons">
            <button class="firm-filter-btn firm-filter-${firmIdx}-all active" data-firm="${firmIdx}" data-filter="all">All</button>
            <button class="firm-filter-btn firm-filter-${firmIdx}-etf" data-firm="${firmIdx}" data-filter="etf">ETF</button>
            <button class="firm-filter-btn firm-filter-${firmIdx}-stock" data-firm="${firmIdx}" data-filter="stock">Stock</button>
        </div>
        <div class="indicator-content">
            <div class="firm-chart-container">
                <div class="firm-holdings-list" data-firm-holdings="${firmIdx}">
                    ${firmHoldings.slice(0, 10).map(h => `
                        <div class="holding-item">
                             <div class="holding-ticker"><a href="${h.link || 'https://www.perplexity.ai/finance/' + h.ticker}" target="_blank" rel="noopener noreferrer">${h.ticker}</a></div>
                            <div class="holding-name">${h.name}</div>
                            <div class="holding-pct">${h.pct}%</div>
                        </div>
                    `).join('')}
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

        const card = document.createElement('div');
        card.className = 'indicator';
        card.setAttribute('data-indicator-name', firmShortNames[firmIdx]);
        card.innerHTML = createFirmCardHTML(firmIdx, firmShortNames[firmIdx], totalValue, firmHoldings, description);
        container.appendChild(card);

        // Store state for this firm
        const firmState = {
            filter: 'all'
        };

        // Update display function
        function updateFirmDisplay() {
            let displayHoldings = [...firmHoldings];

            // Apply filter
            if (firmState.filter === 'etf') {
                displayHoldings = displayHoldings.filter(h => isETF(h));
            } else if (firmState.filter === 'stock') {
                displayHoldings = displayHoldings.filter(h => !isETF(h));
            }

            // Sort by value (descending)
            displayHoldings.sort((a, b) => b.value - a.value);

            // Update holdings list
            const holdingsList = card.querySelector(`[data-firm-holdings="${firmIdx}"]`);
            if (holdingsList) {
                holdingsList.innerHTML = displayHoldings.slice(0, 10).map((h, idx) => `
                    <div class="holding-item" data-holding-index="${idx}" data-pct="${h.pct}">
                         <div class="holding-ticker"><a href="${h.link || 'https://www.perplexity.ai/finance/' + h.ticker}" target="_blank" rel="noopener noreferrer">${h.ticker}</a></div>
                         <div class="holding-name">${h.name}</div>
                         <div class="holding-pct">${h.pct}%</div>
                     </div>
                `).join('');

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

            // Update button states
            card.querySelectorAll('.firm-filter-btn').forEach(btn => {
                const isActive = btn.dataset.filter === firmState.filter;
                btn.classList.toggle('active', isActive);
            });
        }

        // Setup button handlers
        card.querySelectorAll('.firm-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                firmState.filter = btn.dataset.filter;
                updateFirmDisplay();
            });
        });

        // Initialize display with event handlers
        updateFirmDisplay();
    }

    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}

document.addEventListener('click', function(e) {
    const infoBtn = e.target.closest('.info-btn');
    if (!infoBtn) return;
    e.preventDefault();
    e.stopPropagation();
    const explanation = infoBtn.getAttribute('data-explanation');
    if (!explanation) return;
    if (typeof showExplanationTooltip === 'function') {
        showExplanationTooltip(infoBtn, explanation);
    }
});

// Auto-initialize when script loads
document.addEventListener('DOMContentLoaded', load13FData);
