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
        lightness = 32;
    } else if (percentage >= 5) {
        hue = 25;
        saturation = 100;
        lightness = 40;
    } else if (percentage >= 3) {
        hue = 55;
        saturation = 90;
        lightness = 45;
    } else if (percentage >= 1.5) {
        hue = 130;
        saturation = 80;
        lightness = 42;
    } else {
        hue = 200;
        saturation = 75;
        lightness = 48;
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
                <div style="display: flex; flex-direction: column; gap: 3px; width: 110px; max-height: 150px; overflow-y: auto;" data-firm-holdings="${firmIdx}">
                    ${firmHoldings.slice(0, 10).map(h => `
                        <div style="background: var(--bg-secondary); padding: 4px 6px; border-radius: 2px; font-size: 11px; display: flex; align-items: center; justify-content: space-between;">
                            <div>
                                <div style="font-weight: 600; color: var(--text-primary); font-size: 12px;">${h.ticker}</div>
                                <div style="color: var(--text-muted); font-size: 9px;">${h.pct}% of portfolio</div>
                            </div>
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

            // Update holdings list
            const holdingsList = card.querySelector(`[data-firm-holdings="${firmIdx}"]`);
            if (holdingsList) {
                holdingsList.innerHTML = displayHoldings.slice(0, 10).map((h, idx) => `
                    <div class="holding-item" data-holding-index="${idx}" data-pct="${h.pct}" style="background: var(--bg-secondary); padding: 4px 6px; border-radius: 2px; font-size: 11px; transition: all 0.2s; display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <div style="font-weight: 600; color: var(--text-primary); font-size: 12px;">${h.ticker}</div>
                            <div style="color: var(--text-muted); font-size: 9px;">${h.pct}% of portfolio</div>
                        </div>
                    </div>
                `).join('');

                // Add click handlers for holdings
                holdingsList.querySelectorAll('.holding-item').forEach((item) => {
                    item.addEventListener('click', (e) => {
                        e.preventDefault();
                        const holdingIndex = parseInt(item.dataset.holdingIndex);
                        
                        // Highlight the holding item in the list
                        holdingsList.querySelectorAll('.holding-item').forEach(h => {
                            h.style.background = 'var(--bg-secondary)';
                            h.style.borderLeft = 'none';
                            h.style.opacity = '1';
                            h.querySelectorAll('div').forEach(div => {
                                if (div.style.fontWeight === '600') {
                                    div.style.color = 'var(--text-primary)';
                                } else if (div.style.fontSize === '9px') {
                                    div.style.color = 'var(--text-muted)';
                                }
                            });
                        });
                        const pct = item.dataset.pct;
                        item.style.background = 'var(--bg-secondary)';
                        item.style.borderLeft = '3px solid';
                        item.style.borderImage = `linear-gradient(to top, ${getColorByValue(pct)} 0%, ${getColorByValue(pct)} ${Math.min(pct * 10, 100)}%, var(--border-color) ${Math.min(pct * 10, 100)}%, var(--border-color) 100%) 0 0 0 1`;
                        item.style.opacity = '1';
                        item.querySelectorAll('div').forEach(div => {
                            if (div.style.fontWeight === '600') {
                                div.style.color = 'var(--text-primary)';
                            } else if (div.style.fontSize === '9px') {
                                div.style.color = 'var(--text-muted)';
                            }
                        });
                        
                        const chartInstance = window[`chart-${firmIdx}Chart`];
                        if (chartInstance) {
                            // Reset all segments to full opacity
                            chartInstance.data.datasets[0].backgroundColor = displayHoldings.slice(0, 10).map(h => getColorByValue(h.pct));
                            // Highlight clicked segment with increased opacity/brightness
                            const colors = displayHoldings.slice(0, 10).map((h, i) => {
                                if (i === holdingIndex) return getColorByValue(h.pct);
                                return getColorByValue(h.pct).replace(')', ', 0.3)').replace('hsl(', 'hsla(');
                            });
                            chartInstance.data.datasets[0].backgroundColor = colors;
                            chartInstance.update();
                        }
                    });
                });
            }

            // Update chart
            const chartCanvas = document.getElementById(`chart-${firmIdx}`);
            if (chartCanvas && window[`chart-${firmIdx}Chart`]) {
                const chartInstance = window[`chart-${firmIdx}Chart`];
                const chartData = displayHoldings.slice(0, 10);
                chartInstance.data.labels = chartData.map(h => h.ticker);
                chartInstance.data.datasets[0].data = chartData.map(h => h.value / 1000000);
                chartInstance.data.datasets[0].backgroundColor = chartData.map(h => getColorByValue(h.pct));
                chartInstance.data.datasets[0].spacing = 4;
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

        // Initialize display with event handlers
        updateFirmDisplay();

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
                            borderColor: 'transparent',
                            borderWidth: 2,
                            spacing: 4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        onClick: (event, elements) => {
                            if (elements.length > 0) {
                                const index = elements[0].index;
                                const holdingItem = card.querySelector(`[data-holding-index="${index}"]`);
                                if (holdingItem) holdingItem.click();
                            }
                        },
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
                window[`chart-${firmIdx}Chart`] = chartInstance;

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
