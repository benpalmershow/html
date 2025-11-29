// 13F Holdings functionality

let firmData = null;
let allHoldings = [];
let firmShortNames = [];

async function load13FData() {
    try {
        const response = await fetch('/json/13f-holdings.json', {
            headers: { 'Accept': 'application/json' },
            cache: 'no-cache'
        });
        if (!response.ok) throw new Error('Failed to load 13F data');
        const data = await response.json();
        firmData = data.firms;
        allHoldings = data.holdings;
        firmShortNames = data.firms.map(f => f.shortName);
        initializeFirmCards();
    } catch (error) {
        console.error('Could not load 13F holdings data:', error);
    }
}

function getColorByValue(percentage) {
    let hue, saturation, lightness;

    if (percentage >= 8) {
        hue = 0;
        saturation = 100;
        lightness = 40;
    } else if (percentage >= 5) {
        hue = 30;
        saturation = 90;
        lightness = 45;
    } else if (percentage >= 3) {
        hue = 60;
        saturation = 80;
        lightness = 50;
    } else if (percentage >= 1.5) {
        hue = 120;
        saturation = 70;
        lightness = 50;
    } else {
        hue = 240;
        saturation = 60;
        lightness = 55;
    }
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

function isETF(holding) {
    const name = holding.name.toUpperCase();
    const etfIndicators = ['ETF', 'TRUST', 'FUND', 'INDEX', 'SPDR', 'ISHARES', 'VANGUARD', 'INVESCO', 'DIMENSIONAL'];
    if (etfIndicators.some(indicator => name.includes(indicator))) {
        return true;
    }
    const stockIndicators = ['INC', 'CORP', 'CLASS A', 'CLASS B', 'A S F'];
    if (stockIndicators.some(indicator => name.includes(indicator))) {
        return false;
    }
    return false;
}

function createFirmCardHTML(firmIdx, firmName, totalValue, firmHoldings, description) {
    return `
        <div class="indicator-header">
            <div style="font-weight: 600; color: var(--text-primary); font-size: 0.95rem;">${firmName}</div>
            <div class="indicator-actions">
                <button class="expand-toggle firm-expand-${firmIdx}" style="display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; cursor: pointer; background: transparent; border: none; padding: 0; color: var(--text-muted); transition: all 0.2s;">
                    <i data-lucide="info" style="width: 16px; height: 16px;"></i>
                </button>
            </div>
        </div>
        <div style="display: flex; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.75rem; font-size: 0.85rem; color: var(--text-muted); padding: 0 0.5rem;">
            <div>AUM: $${(totalValue / 1000000).toFixed(1)}M</div>
            <div>Filed: 11/26</div>
        </div>
        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; padding: 0 0.5rem; flex-wrap: wrap; font-size: 0.75rem;">
            <button class="firm-filter-btn firm-filter-${firmIdx}-all" data-firm="${firmIdx}" data-filter="all" style="padding: 4px 8px; background: var(--accent-primary); color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.75rem; font-weight: 500;">All</button>
            <button class="firm-filter-btn firm-filter-${firmIdx}-etf" data-firm="${firmIdx}" data-filter="etf" style="padding: 4px 8px; background: transparent; color: var(--text-muted); border: 1px solid var(--border-color); border-radius: 3px; cursor: pointer; font-size: 0.75rem;">ETF</button>
            <button class="firm-filter-btn firm-filter-${firmIdx}-stock" data-firm="${firmIdx}" data-filter="stock" style="padding: 4px 8px; background: transparent; color: var(--text-muted); border: 1px solid var(--border-color); border-radius: 3px; cursor: pointer; font-size: 0.75rem;">Stock</button>
        </div>
        <div class="indicator-content">
            <div style="display: flex; gap: 8px; align-items: flex-start; flex-wrap: wrap;">
                <div style="display: flex; flex-direction: column; gap: 3px; width: 110px;" data-firm-holdings="${firmIdx}">
                    ${firmHoldings.slice(0, 5).map(h => `
                        <div style="background: var(--bg-secondary); border-left: 3px solid ${getColorByValue(h.pct)}; padding: 4px 6px; border-radius: 2px; font-size: 11px;">
                            <div style="font-weight: 600; color: var(--text-primary); font-size: 12px;">${h.ticker}</div>
                            <div style="color: var(--text-muted); font-size: 9px;">${h.pct}% of portfolio</div>
                        </div>
                    `).join('')}
                </div>
                <div style="position: relative; height: 150px; width: 100%; max-width: 180px; flex: 1; min-width: 150px;">
                    <canvas id="chart-${firmIdx}"></canvas>
                </div>
            </div>
            <div class="data-rows-container firm-description-${firmIdx}">
                <div style="padding: 8px 0; border-top: 1px solid var(--border-color); margin-top: 8px; font-size: 0.85rem; color: var(--text-muted); line-height: 1.5;">
                    ${description || ''}
                </div>
            </div>
        </div>
    `;
}

function initializeFirmCards() {
    const container = document.getElementById('firmCardsContainer');
    if (!container) return;

    for (let firmIdx = 0; firmIdx < 5; firmIdx++) {
        const firmHoldings = allHoldings.filter(h => h.firmIndex === firmIdx).sort((a, b) => b.value - a.value);

        if (firmHoldings.length === 0) continue;

        const totalValue = firmHoldings.reduce((sum, h) => sum + h.value, 0);
        const description = firmData && firmData[firmIdx] ? firmData[firmIdx].description : '';

        const card = document.createElement('div');
        card.className = 'indicator';
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

            // Update holdings list (no links on mobile to prevent accidental navigation)
            const holdingsList = card.querySelector(`[data-firm-holdings="${firmIdx}"]`);
            if (holdingsList) {
                const isMobile = window.innerWidth < 769;
                holdingsList.innerHTML = displayHoldings.slice(0, 5).map(h => {
                    const holdingHtml = `<div style="background: var(--bg-secondary); border-left: 3px solid ${getColorByValue(h.pct)}; padding: 4px 6px; border-radius: 2px; font-size: 11px; transition: all 0.2s; hover: opacity 0.8;">
                        <div style="font-weight: 600; color: var(--text-primary); font-size: 12px;">${h.ticker}</div>
                        <div style="color: var(--text-muted); font-size: 9px;">${h.pct}% of portfolio</div>
                    </div>`;
                    
                    if (isMobile) {
                        return holdingHtml;
                    } else {
                        return `<a href="https://finance.yahoo.com/quote/${h.ticker}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; cursor: pointer;">${holdingHtml}</a>`;
                    }
                }).join('');
            }

            // Update chart
            const chartCanvas = document.getElementById(`chart-${firmIdx}`);
            if (chartCanvas && window[`chart-${firmIdx}Chart`]) {
                const chartInstance = window[`chart-${firmIdx}Chart`];
                const chartData = displayHoldings.slice(0, 10);
                chartInstance.data.labels = chartData.map(h => h.ticker);
                chartInstance.data.datasets[0].data = chartData.map(h => h.value / 1000000);
                chartInstance.data.datasets[0].backgroundColor = chartData.map(h => getColorByValue(h.pct));
                chartInstance.update();
            }

            // Update button states
            card.querySelectorAll('.firm-filter-btn').forEach(btn => {
                const isActive = btn.dataset.filter === firmState.filter;
                btn.style.background = isActive ? 'var(--accent-primary)' : 'transparent';
                btn.style.color = isActive ? 'white' : 'var(--text-muted)';
                btn.style.border = isActive ? 'none' : '1px solid var(--border-color)';
                btn.style.fontWeight = isActive ? '500' : 'normal';
            });
        }

        // Setup button handlers
        card.querySelectorAll('.firm-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                firmState.filter = btn.dataset.filter;
                updateFirmDisplay();
            });
        });

        setTimeout(() => {
            const ctx = document.getElementById(`chart-${firmIdx}`);
            if (ctx && typeof Chart !== 'undefined') {
                const chartData = firmHoldings.slice(0, 10);
                const chartInstance = new Chart(ctx.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: chartData.map(h => h.ticker),
                        datasets: [{
                            data: chartData.map(h => h.value / 1000000),
                            backgroundColor: chartData.map(h => getColorByValue(h.pct)),
                            borderColor: '#fdf6e8',
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    label: function (context) {
                                        return `$${context.parsed.toFixed(1)}M`;
                                    }
                                }
                            }
                        }
                    }
                });

                // Handle chart interactions: mobile shows tooltip only, desktop click navigates
                let lastTouchTime = 0;

                ctx.addEventListener('touchstart', () => {
                    lastTouchTime = Date.now();
                }, { passive: true });

                // Desktop only: click to navigate
                ctx.onclick = function (evt) {
                    // Prevent navigation if click came from touch (within 500ms of last touch)
                    if (Date.now() - lastTouchTime < 500) return;
                    
                    const points = chartInstance.getElementsAtEventForMode(evt, 'nearest', { intersect: true }, true);
                    if (points.length > 0) {
                        const ticker = chartData[points[0].index].ticker;
                        window.open('https://finance.yahoo.com/quote/' + ticker, '_blank');
                    }
                };
                ctx.style.cursor = 'pointer';
            }
        }, 0);
    }

    document.addEventListener('click', function (e) {
        const expandBtn = e.target.closest('.expand-toggle');
        if (expandBtn) {
            const card = expandBtn.closest('.indicator');
            card.classList.toggle('expanded');
        }
    });

    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 100);
    }
}
