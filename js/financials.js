// Financials Dashboard Module
// Main dashboard functionality

let financialData = null;

// Collapsible functionality
function toggleCollapse(sectionId) {
    const content = document.getElementById(sectionId + '-content');
    const toggle = document.getElementById(sectionId + '-toggle');

    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        toggle.classList.remove('collapsed');
        toggle.textContent = '▼';
    } else {
        content.classList.add('collapsed');
        toggle.classList.add('collapsed');
        toggle.textContent = '▲';
    }
}

async function fetchFinancialData() {
    const paths = [
        '/html/json/financials-data.json',
        '/json/financials-data.json',
    ];

    // Use Promise.any for better performance - returns first successful fetch
    try {
        const fetchPromises = paths.map(async path => {
            const response = await fetch(path, {
                headers: {
                    'Accept': 'application/json'
                },
                cache: 'no-cache'
            });
            if (!response.ok) throw new Error(`Failed to fetch from ${path}`);
            return response.json();
        });

        financialData = await Promise.any(fetchPromises);
        initializeDashboard();
    } catch (error) {
        // If all promises were rejected
        console.error('Could not load financial data from any path:', error);
        document.getElementById('categories').innerHTML =
            '<div class="error">Error loading financial data. Please try again later.</div>';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getChangeClass(change) {
    if (change === "—" || change === "0" || change === "0.00") return 'change-neutral';
    if (change.startsWith('+')) return 'change-positive';
    if (change.startsWith('-')) return 'change-negative';
    return 'change-neutral';
}

function getArrowClass(change) {
    if (change === "—" || change === "0" || change === "0.00") return '';
    if (change.startsWith('+')) return 'arrow-up';
    if (change.startsWith('-')) return 'arrow-down';
    return '';
}

// Helper function to extract numeric value from string
function extractNumericValue(value) {
    if (!value || value === '' || value.startsWith('TBD') || value === '—') return null;

    // Remove common prefixes and suffixes
    let cleanValue = value.toString()
        .replace(/[$,%]/g, '') // Remove $ and %
        .replace(/[+\-]/g, '') // Remove + and - signs
        .replace(/[A-Za-z]/g, '') // Remove letters (M, B, etc.)
        .trim();

    // Handle special cases like "134,391M" -> "134391"
    if (value.includes('M')) {
        cleanValue = cleanValue.replace(/M$/, '');
    }
    if (value.includes('B')) {
        cleanValue = cleanValue.replace(/B$/, '');
    }

    const num = parseFloat(cleanValue);
    return isNaN(num) ? null : num;
}

// Calculate Month-over-Month (MoM) change
function calculateMoMChange(indicator) {
    const months = ['february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october',
        'november', 'december'
    ];
    let currentValue = null;
    let previousValue = null;
    let currentRawValue = '';

    // Find the latest available value and the previous one
    for (let i = months.length - 1; i >= 0; i--) {
        const month = months[i];
        const value = indicator[month];

        if (value && value !== '' && !value.startsWith('TBD')) {
            if (currentValue === null) {
                currentValue = extractNumericValue(value);
                currentRawValue = value;
            } else if (previousValue === null) {
                previousValue = extractNumericValue(value);
                break;
            }
        }
    }

    if (currentValue === null || previousValue === null || previousValue === 0) {
        return null;
    }

    const change = ((currentValue - previousValue) / previousValue) * 100;
    const numberChange = currentValue - previousValue;

    // Return both percentage change and number change
    return {
        percentChange: change,
        numberChange: numberChange,
        currentRawValue: currentRawValue
    };
}

// Calculate all monthly changes for all indicators
function calculateAllMonthlyChanges(indicator) {
    const months = ['february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october',
        'november', 'december'
    ];
    const changes = [];

    for (let i = 1; i < months.length; i++) {
        const currentMonth = months[i];
        const previousMonth = months[i - 1];

        const currentValue = extractNumericValue(indicator[currentMonth]);
        const previousValue = extractNumericValue(indicator[previousMonth]);

        if (currentValue !== null && previousValue !== null) {
            const change = currentValue - previousValue;

            // Format the change based on the type of indicator
            let formattedChange;
            if (Math.abs(change) >= 1000) {
                // For large numbers (like employment), use thousands separator
                formattedChange = change >= 0 ? `+${change.toLocaleString()}` : change.toLocaleString();
            } else {
                // For smaller numbers, use decimal places if needed
                formattedChange = change >= 0 ? `+${change.toFixed(2)}` : change.toFixed(2);
                // Remove unnecessary .00
                formattedChange = formattedChange.replace('.00', '');
            }

            changes.push({
                month: currentMonth,
                change: change,
                formatted: formattedChange
            });
        }
    }

    return changes;
}

// Calculate Year-over-Year (YoY) change (comparing to same month last year)
// For now, we'll use a simplified approach since we don't have last year's data
function calculateYoYChange(indicator) {
    // This would require historical data from previous years
    // For now, return null to indicate no YoY data available
    return null;
}

// Format change percentage
function formatChange(change) {
    if (change === null) return '—';
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
}

// Indicator explanations are now loaded from financials-data.json

function createIndicatorCard(indicator) {
    const months = ['march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november',
        'december'
    ];
    const monthLabels = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let dataRows = '';

    // Calculate MoM and YoY changes
    const momChange = calculateMoMChange(indicator);
    const yoyChange = calculateYoYChange(indicator);

    // Special handling for FOMC BPS indicator
    if (indicator.name.includes('FOMC') && indicator.name.includes('Rate Decision') && indicator
        .bps_probabilities) {
        dataRows +=
            `<div class="data-row"><span class="month-label">Next Meeting:</span> <span class="month-value">${indicator.next_meeting || ''}</span></div>`;
        Object.entries(indicator.bps_probabilities).forEach(([bps, prob]) => {
            if (prob && prob !== '') {
                dataRows += `
                            <div class="data-row">
                                <span class="month-label">${bps}:</span>
                                <span class="month-value">${prob}</span>
                            </div>
                        `;
            }
        });
    }
    // Special handling for Recession probability
    else if (indicator.name.includes('Recession')) {
        if (indicator.yes_probability) {
            dataRows +=
                `<div class="data-row"><span class="month-label">Yes:</span> <span class="month-value">${indicator.yes_probability}</span></div>`;
        }
        if (indicator.no_probability) {
            dataRows +=
                `<div class="data-row"><span class="month-label">No:</span> <span class="month-value">${indicator.no_probability}</span></div>`;
        }
    }
    // Special handling for NFL predictions (Kalshi style)
    else if (indicator.name.includes('@')) {
        if (indicator.game_title) {
            dataRows +=
                `<div class="data-row"><span class="month-label">Game:</span> <span class="month-value">${indicator.game_title}</span></div>`;
        }
        if (indicator.game_time) {
            if (indicator.game_time_iso) {
                // For games with ISO timestamp, show a countdown timer with fallback text
                const gameTimeAttr = indicator.game_time_iso;
                dataRows +=
                    `<div class="data-row"><span class="month-label">Time:</span> <span class="month-value"><span class="game-countdown" data-game-time="${gameTimeAttr}">${indicator.game_time}</span></span></div>`;
            } else {
                // For games without ISO timestamp, show the game time as static text
                dataRows +=
                    `<div class="data-row"><span class="month-label">Time:</span> <span class="month-value">${indicator.game_time}</span></div>`;
            }
        }
        if (indicator.week) {
            dataRows +=
                `<div class="data-row"><span class="month-label">Week:</span> <span class="month-value">${indicator.week}</span></div>`;
        }

        // Show team win odds
        const teamKeys = Object.keys(indicator).filter(key => key.endsWith('_win_odds'));
        teamKeys.forEach(key => {
            const teamName = key.replace('_win_odds', '').toUpperCase();
            dataRows +=
                `<div class="data-row"><span class="month-label">${teamName} Win:</span> <span class="month-value">${indicator[key]}</span></div>`;
        });

        if (indicator.total_points) {
            dataRows +=
                `<div class="data-row"><span class="month-label">Total:</span> <span class="month-value">${indicator.total_points}</span></div>`;
        }
    } else if ((indicator.name === 'Total Nonfarm Employment' && indicator.agency === 'FRED') ||
        (indicator.name === 'Job Openings')) {
        // Special handling for Total Nonfarm Employment and Job Openings - show job changes inline
        const monthlyChanges = calculateAllMonthlyChanges(indicator);
        const changesMap = {};
        monthlyChanges.forEach(change => {
            changesMap[change.month] = change;
        });

        months.forEach((month, index) => {
            const value = indicator[month];
            const label = monthLabels[index] || month;
            if (value && value !== '') {
                // Determine formatted change (if available)
                const changeObj = changesMap[month];
                let changeHtml = '';
                if (changeObj) {
                    // Use the formatted string from calculateAllMonthlyChanges
                    const formatted = changeObj.formatted;
                    // Style positive/negative
                    const changeClass = (changeObj.change >= 0) ? 'change-positive' :
                        'change-negative';
                    changeHtml =
                        `<span class="month-change ${changeClass}" style="margin-left:8px; font-weight:600;">${formatted}</span>`;
                }

                // Render the row with numeric value and right-aligned monthly change
                dataRows += `
                                <div class="data-row">
                                    <span class="month-label">${label}:</span>
                                    <span class="month-value">${value}${changeHtml}</span>
                                </div>
                            `;
            }
        });
    } else if (indicator.name === 'CPI' && indicator.agency === 'BLS') {
        // Special handling for CPI - show YoY changes inline
        const cpiYoyData = {
            'march': '3.2%',
            'april': '3.4%',
            'may': '3.3%',
            'june': '3.0%',
            'july': '2.9%',
            'august': '2.5%'
        };

        months.forEach((month, index) => {
            const value = indicator[month];
            const label = monthLabels[index] || month;
            if (value && value !== '') {
                const yoy = cpiYoyData[month] ?
                    `<span class="month-change" style="margin-left:8px; font-weight:600;">${cpiYoyData[month]}</span>` :
                    '';
                dataRows += `
                                <div class="data-row">
                                    <span class="month-label">${label}:</span>
                                    <span class="month-value">${value}${yoy}</span>
                                </div>
                            `;
            }
        });
    } else {
        months.forEach((month, index) => {
            const value = indicator[month];
            const label = monthLabels[index] || month;
            if (value && value !== '') {
                dataRows += `
                                <div class="data-row">
                                    <span class="month-label">${label}:</span>
                                    <span class="month-value">${value}</span>
                                </div>
                            `;
            }
        });
    }

    const url = indicator.url || '#';
    const explanation = indicator.explanation || '';

    // Create change indicators section
    let changeIndicators = '';

    // MoM change
    if (momChange !== null) {
        const momFormatted = formatChange(momChange.percentChange);
        let changeText = `MoM: ${momFormatted}`;

        // Add number change for employment indicators
        if ((indicator.name === 'Private Employment' && indicator.agency === 'ADP') ||
            (indicator.name === 'Total Nonfarm Employment' && indicator.agency === 'FRED') ||
            (indicator.name === 'Job Openings')) {
            const numberChange = momChange.numberChange;
            const changeSign = numberChange >= 0 ? '+' : '';
            const formattedNumber = numberChange.toLocaleString();

            // Add number change for employment indicators
            changeText += ` (${changeSign}${formattedNumber})`;
        }

        const arrowIcon = momChange.percentChange >= 0 ? '<i data-lucide="arrow-up-right"></i>' :
            '<i data-lucide="arrow-down-right"></i>';
        const title = indicator.name === 'Total Nonfarm Employment' ?
            "Latest monthly change in nonfarm payroll employment" :
            "Month-over-Month (MoM) change calculated from available data.";

        changeIndicators += `
                    <div class="change-indicator ${getChangeClass(momFormatted)}" title="${title}">
                        <span class="arrow-icon">${arrowIcon}</span> ${changeText}
                    </div>
                `;
    }

    // YoY change (placeholder for future implementation)
    if (yoyChange !== null) {
        const yoyFormatted = formatChange(yoyChange);
        const yoyArrowIcon = yoyChange >= 0 ? '<i data-lucide="arrow-up-right"></i>' :
            '<i data-lucide="arrow-down-right"></i>';
        changeIndicators += `
                    <div class="change-indicator ${getChangeClass(yoyFormatted)}" title="Year-over-Year (YoY) change.">
                        <span class="arrow-icon">${yoyArrowIcon}</span> YoY: ${yoyFormatted}
                    </div>
                `;
    }

    return `
                <div class="indicator" data-indicator-name="${indicator.name.replace(/"/g, '&quot;')}">
                    <div class="indicator-name">
                        ${indicator.name}
                        ${explanation ? `<i data-lucide="info" class="info-icon" data-explanation="${explanation.replace(/"/g, '&quot;')}" title="Show explanation"></i>` : ''}
                        ${indicator.category !== 'Prediction Markets' ? `<i data-lucide="bar-chart-3" class="chart-icon" title="View Interactive Chart"></i>` : ''}
                    </div>
                    <div class="indicator-agency">
                        Source: <a href="${url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">${indicator.agency}</a>
                        ${indicator.category === 'Prediction Markets' && indicator.kalshi_url ? ` | <a href="${indicator.kalshi_url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">Kalshi</a>` : ''}
                        ${indicator.category === 'Prediction Markets' && indicator.polymarket_url ? ` | <a href="${indicator.polymarket_url}" target="_blank" rel="noopener noreferrer" style="color: var(--text-muted); text-decoration: underline;">Polymarket</a>` : ''}
                    </div>
                    ${dataRows}
                    <div class="change-indicators">
                        ${changeIndicators}
                    </div>
                    <div class="explanation-text" style="display: none; margin-top: 8px; padding: 8px; background: var(--bg-secondary, #f5f5f5); border-radius: 4px; font-size: 0.9em; color: var(--text-secondary, #666);"></div>
                </div>
            `;
}

// Category icons mapping with Lucide icons
const categoryIcons = {
    'Employment Indicators': '<i data-lucide="users" class="filter-icon"></i>',
    'Housing Market': '<i data-lucide="home" class="filter-icon"></i>',
    'Business Indicators': '<i data-lucide="briefcase" class="filter-icon"></i>',
    'Consumer Indicators': '<i data-lucide="shopping-cart" class="filter-icon"></i>',
    'Trade & Tariffs': '<i data-lucide="ship" class="filter-icon"></i>',
    'Government': '<i data-lucide="landmark" class="filter-icon"></i>',
    'Commodities': '<i data-lucide="package" class="filter-icon"></i>',
    'Prediction Markets': '<i data-lucide="trending-up" class="filter-icon"></i>'
};

function setupInfoIconHandlers() {
    document.querySelectorAll('.info-icon').forEach(icon => {
        icon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const indicator = this.closest('.indicator');
            const explanationDiv = indicator.querySelector('.explanation-text');
            const explanation = this.dataset.explanation;

            if (explanationDiv.style.display === 'none') {
                explanationDiv.textContent = explanation;
                explanationDiv.style.display = 'block';
                this.style.color = 'var(--primary-color, #2C5F5A)';
            } else {
                explanationDiv.style.display = 'none';
                this.style.color = 'var(--text-muted)';
            }
        });
    });
}

function setupJobsIconHandlers() {
    document.querySelectorAll('.jobs-icon').forEach(icon => {
        icon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const indicator = this.closest('.indicator');
            const dataRows = indicator.querySelectorAll('.data-row');

            // Check if job changes are already showing
            const isShowingChanges = indicator.dataset.showingJobChanges === 'true';

            if (!isShowingChanges) {
                // Find the indicator data
                const indicatorData = financialData.indices.find(item =>
                    item.name === 'Total Nonfarm Employment' && item.agency === 'FRED'
                );

                if (indicatorData) {
                    const monthlyChanges = calculateAllMonthlyChanges(indicatorData);
                    const months = ['march', 'april', 'may', 'june', 'july', 'august'];
                    const monthLabels = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

                    // Create a map of changes by month
                    const changesMap = {};
                    monthlyChanges.forEach(change => {
                        changesMap[change.month] = change;
                    });

                    // Add job changes to existing month rows
                    dataRows.forEach(row => {
                        const monthLabel = row.querySelector('.month-label');
                        const monthValue = row.querySelector('.month-value');

                        if (monthLabel && monthValue) {
                            const monthText = monthLabel.textContent.trim().replace(
                                ':', '');
                            const monthIndex = monthLabels.indexOf(monthText);

                            if (monthIndex >= 0) {
                                const monthKey = months[monthIndex];
                                const change = changesMap[monthKey];

                                if (change) {
                                    const changeClass = change.change >= 0 ?
                                        'change-positive' :
                                        'change-negative';
                                    const arrowIcon = change.change >= 0 ? '↗' :
                                        '↘';

                                    // Add small job change text to the right
                                    const jobChangeSpan = document.createElement(
                                        'span');
                                    jobChangeSpan.className = 'job-change-inline';
                                    jobChangeSpan.innerHTML =
                                        ` <span class="${changeClass}" style="font-size: 0.75em; margin-left: 8px; opacity: 0.8;">${arrowIcon}${change.formatted}</span>`;
                                    monthValue.appendChild(jobChangeSpan);
                                }
                            }
                        }
                    });

                    indicator.dataset.showingJobChanges = 'true';
                    this.style.color = 'var(--logo-orange, #D4822A)';
                }
            } else {
                // Remove job changes
                dataRows.forEach(row => {
                    const jobChangeSpan = row.querySelector('.job-change-inline');
                    if (jobChangeSpan) {
                        jobChangeSpan.remove();
                    }
                });

                indicator.dataset.showingJobChanges = 'false';
                this.style.color = 'var(--logo-orange, #D4822A)';
            }
        });
    });
}

function renderDashboard(filterCategory = 'all') {
    const categoriesContainer = document.getElementById('categories');
    const categories = [...new Set(financialData.indices.map(item => item.category))];

    let html = '';

    categories.forEach(category => {
        if (filterCategory !== 'all' && category !== filterCategory) return;

        const categoryIndicators = financialData.indices.filter(item => item.category === category);
        const icon = categoryIcons[category] || '<i data-lucide="bar-chart-2"></i>';

        html += `
                    <div class="category" data-category="${category}">
                        <h2 class="category-title">
                            <span class="category-icon">${icon}</span>
                            <span class="category-name">${category}</span>
                        </h2>
                        <div class="indicators-grid">
                            ${categoryIndicators.map(indicator => createIndicatorCard(indicator)).join('')}
                        </div>
                    </div>
                `;
    });

    categoriesContainer.innerHTML = html;

    // Re-initialize Lucide icons after updating the content
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // Add click event listeners for info icons
    setupInfoIconHandlers();
    setupChartIconHandlers();

    // Initialize countdown timers after rendering
    if (typeof updateAllCountdowns === 'function') {
        updateAllCountdowns();
    }
}

function setupFilters() {
    const filtersContainer = document.getElementById('filters');
    const categories = [...new Set(financialData.indices.map(item => item.category))];

    // Clear existing filter buttons
    filtersContainer.innerHTML = '';

    // Create the 'All' button with icon and text
    const allButton = document.createElement('button');
    allButton.className = 'filter-btn active';
    allButton.dataset.category = 'all';
    allButton.setAttribute('aria-label', 'All');
    allButton.innerHTML = `
                    <i data-lucide="list" class="filter-icon"></i>
                    <span class="filter-text">All</span>
                `;
    allButton.setAttribute('data-tooltip', 'All');
    filtersContainer.appendChild(allButton);

    // Create category filter buttons with icon and text (text shown on hover)
    categories.forEach(category => {
        const button = document.createElement('button');
        button.className = 'filter-btn';
        const icon = categoryIcons[category] || '<i data-lucide="bar-chart-2"></i>';
        button.innerHTML = `
                        <span class="filter-icon">${icon}</span>
                        <span class="filter-text">${category}</span>
                    `;
        button.dataset.category = category;
        button.setAttribute('aria-label', category);
        button.setAttribute('data-tooltip', category);
        filtersContainer.appendChild(button);
    });

    // Tooltip logic for hover and mobile/touch
    let tooltip = document.getElementById('filter-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'filter-tooltip';

        // Apply all styles at once to ensure they stick
        Object.assign(tooltip.style, {
            position: 'fixed',
            pointerEvents: 'none',
            zIndex: '2147483647',
            background: 'rgba(44,95,90,0.97)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '0.9em',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            transition: 'opacity 0.2s ease',
            opacity: '0',
            display: 'none',
            whiteSpace: 'nowrap',
            maxWidth: '200px',
            textAlign: 'center',
            isolation: 'isolate',
            transform: 'translateZ(0)',
            willChange: 'transform, opacity',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            WebkitTransform: 'translateZ(0)',
            WebkitPerspective: '1000',
            perspective: '1000px'
        });

        document.body.appendChild(tooltip);
    }

    function showTooltip(text, x, y) {
        tooltip.textContent = text;
        tooltip.style.display = 'block';

        // Get actual tooltip dimensions after setting text
        const tooltipRect = tooltip.getBoundingClientRect();
        const tooltipWidth = tooltipRect.width;

        // Center the tooltip horizontally and position it above the button
        tooltip.style.left = Math.max(10, x - tooltipWidth / 2) + 'px';
        tooltip.style.top = (y - 40) + 'px';
        tooltip.style.opacity = '1';

        // Force reflow and ensure tooltip is on top
        tooltip.style.zIndex = '2147483647';
        tooltip.style.position = 'fixed';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.isolation = 'isolate';
        tooltip.style.transform = 'translateZ(0)';
    }

    function hideTooltip() {
        tooltip.style.opacity = '0';
        tooltip.style.display = 'none';
        tooltip.dataset.activeButton = '';
    }

    // Combined click handler for filter buttons and tooltips
    filtersContainer.addEventListener('click', function (e) {
        const btn = e.target.closest('.filter-btn');
        if (btn) {
            // Handle tooltip toggle on double-click or long press
            if (e.detail === 2 && btn.dataset.tooltip) { // Double-click
                const rect = btn.getBoundingClientRect();
                tooltip.dataset.activeButton = btn.dataset.category;

                requestAnimationFrame(() => {
                    showTooltip(btn.dataset.tooltip, rect.left + rect.width / 2, rect.top);
                });

                // Auto-hide after 3 seconds
                setTimeout(() => {
                    if (tooltip.dataset.activeButton === btn.dataset.category) {
                        hideTooltip();
                    }
                }, 3000);
                return;
            }

            // Handle filter change (single click)
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            btn.classList.add('active');
            renderDashboard(btn.dataset.category);

            // Hide any existing tooltip
            hideTooltip();
        }
    });

    // Hide tooltip when clicking outside
    document.addEventListener('click', function (e) {
        if (!filtersContainer.contains(e.target)) {
            hideTooltip();
        }
    });

    // Initialize Lucide icons after creating filter buttons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
}

function initializeDashboard() {
    document.getElementById('lastUpdated').textContent =
        `Last Updated: ${formatDate(financialData.lastUpdated)}`;
    setupFilters();
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilter = urlParams.get('filter') || 'all';
    // Set active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.category === initialFilter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderDashboard(initialFilter);
    setupModalHandlers();
}

// Chart overlay functionality
function setupChartIconHandlers() {
    document.querySelectorAll('.chart-icon').forEach(icon => {
        icon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const indicator = this.closest('.indicator');
            const indicatorName = indicator.dataset.indicatorName;

            // Toggle the chart overlay on the card
            toggleChartOverlay(indicator, indicatorName);
        });
    });
}

// Toggle chart overlay on card
function toggleChartOverlay(indicator, indicatorName) {
    // Check if overlay already exists
    let overlay = indicator.querySelector('.chart-overlay');

    if (overlay) {
        // If overlay is visible, hide it
        if (overlay.classList.contains('show')) {
            hideChartOverlay(overlay);
        } else {
            // If overlay exists but hidden, show it
            showChartOverlay(indicator, indicatorName, overlay);
        }
    } else {
        // Create new overlay
        createChartOverlay(indicator, indicatorName);
    }
}

// Create new chart overlay
function createChartOverlay(indicator, indicatorName) {
    const overlay = document.createElement('div');
    overlay.className = 'chart-overlay';
    overlay.innerHTML = `
        <div class="chart-overlay-header">
            <h4 class="chart-overlay-title">
                <i data-lucide="bar-chart-3"></i>
                ${indicatorName}
            </h4>
            <button class="chart-overlay-close">&times;</button>
        </div>
        <div class="chart-overlay-body">
            <div class="chart-overlay-loading">
                <div class="chart-overlay-loading-spinner"></div>
                <span>Loading chart...</span>
            </div>
        </div>
    `;

    // Add to indicator
    indicator.appendChild(overlay);

    // Setup close handler
    const closeBtn = overlay.querySelector('.chart-overlay-close');
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideChartOverlay(overlay);
    });

    // Click outside overlay to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            hideChartOverlay(overlay);
        }
    });

    // Show overlay and load chart
    showChartOverlay(indicator, indicatorName, overlay);
}

// Show chart overlay with animation
function showChartOverlay(indicator, indicatorName, overlay) {
    // Hide any other open overlays first
    document.querySelectorAll('.chart-overlay.show').forEach(otherOverlay => {
        if (otherOverlay !== overlay) {
            hideChartOverlay(otherOverlay);
        }
    });

    // Show current overlay
    overlay.classList.add('show');

    // Load chart data
    loadChartInOverlay(indicator, indicatorName, overlay);

    // Update chart icon state
    const chartIcon = indicator.querySelector('.chart-icon');
    if (chartIcon) {
        chartIcon.classList.add('active');
    }
}

// Hide chart overlay with animation
function hideChartOverlay(overlay) {
    overlay.classList.remove('show');

    // Remove active state from chart icon
    const indicator = overlay.closest('.indicator');
    const chartIcon = indicator.querySelector('.chart-icon');
    if (chartIcon) {
        chartIcon.classList.remove('active');
    }

    // Remove overlay from DOM after animation
    setTimeout(() => {
        if (overlay.parentNode && !overlay.classList.contains('show')) {
            overlay.parentNode.removeChild(overlay);
        }
    }, 300);
}

// Load chart data into overlay
async function loadChartInOverlay(indicator, indicatorName, overlay) {
    const body = overlay.querySelector('.chart-overlay-body');

    try {
        // Get chart configuration
        const chartConfig = await getChartConfig(indicatorName);

        if (chartConfig && chartConfig.data) {
            // Remove loading indicator
            const loading = body.querySelector('.chart-overlay-loading');
            if (loading) loading.remove();

            // Create canvas for chart
            const canvas = document.createElement('canvas');
            canvas.className = 'chart-overlay-canvas';
            canvas.id = `overlay-${indicatorName.replace(/\s+/g, '-').toLowerCase()}-chart`;
            body.appendChild(canvas);

            // Initialize chart
            const chartInstance = initializeChartInOverlay(chartConfig, canvas);

            if (chartInstance) {
                // Store chart instance for cleanup
                overlay._chartInstance = chartInstance;
            }
        } else {
            // Show error state
            showOverlayError(body, 'Chart data not available');
        }
    } catch (error) {
        console.error('Error loading chart in overlay:', error);
        showOverlayError(body, 'Error loading chart');
    }
}

// Show error in overlay
function showOverlayError(body, message) {
    const loading = body.querySelector('.chart-overlay-loading');
    if (loading) loading.remove();

    body.innerHTML = `
        <div class="chart-overlay-error">
            <div class="chart-overlay-error-icon">📊</div>
            <p>${message}</p>
        </div>
    `;
}

// Initialize chart within overlay container
function initializeChartInOverlay(chartConfig, canvas) {
    if (!chartConfig.data) return null;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (window[canvas.id + 'Chart']) {
        window[canvas.id + 'Chart'].destroy();
    }

    // Create new chart with overlay-optimized options
    const chartInstance = new Chart(ctx, {
        type: 'line',
        data: chartConfig.data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 5,
                    right: 5,
                    bottom: 5,
                    left: 5
                }
            },
            animation: {
                duration: 600,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: false // Hide legend in overlay for space
                },
                title: {
                    display: false // Hide title in overlay
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#2C5F5A',
                    borderWidth: 1,
                    padding: 8,
                    titleFont: {
                        size: 11
                    },
                    bodyFont: {
                        size: 11
                    },
                    boxPadding: 4,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 4,
                        padding: 2,
                        font: {
                            size: 9
                        }
                    }
                },
                y: {
                    display: true,
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.03)',
                        drawBorder: false
                    },
                    ticks: {
                        padding: 2,
                        font: {
                            size: 9
                        },
                        callback: function (value) {
                            if (value >= 1000) {
                                return (value / 1000).toFixed(1) + 'K';
                            }
                            return value.toLocaleString();
                        }
                    },
                    position: 'right'
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });

    window[canvas.id + 'Chart'] = chartInstance;
    return chartInstance;
}

// Real-time data update system
class RealTimeChartManager {
    constructor() {
        this.activeCharts = new Map(); // Store active chart instances
        this.updateIntervals = new Map(); // Store update intervals
        this.dataSources = new Map(); // Store data source configurations
        this.isRealTimeEnabled = true; // Global real-time toggle
        this.updateFrequency = 30000; // Default: 30 seconds

        this.initializeDataSources();
        this.setupRealTimeControls();
    }

    // Initialize data sources for different indicators
    initializeDataSources() {
        this.dataSources = new Map([
            ['Shipping Container Rate (China-US 40ft)', {
                type: 'freightos',
                url: 'https://www.freightos.com/freight-resources/freightos-baltic-index/',
                updateInterval: 300000, // 5 minutes - Freightos updates daily
                lastUpdate: null
            }],
            ['CPI', {
                type: 'bls',
                url: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
                seriesId: 'CUUR0000SA0', // CPI for All Urban Consumers
                updateInterval: 86400000, // 24 hours - BLS updates monthly
                lastUpdate: null
            }],
            ['PPI', {
                type: 'bls',
                url: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
                seriesId: 'WPUFD4', // PPI for Final Demand
                updateInterval: 86400000, // 24 hours - BLS updates monthly
                lastUpdate: null
            }],
            ['Jobs Added', {
                type: 'bls',
                url: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
                seriesId: 'CES0000000001', // Total Nonfarm Employment
                updateInterval: 86400000, // 24 hours - BLS updates monthly
                lastUpdate: null
            }],
            ['Jobless Claims', {
                type: 'fred',
                url: 'https://api.stlouisfed.org/fred/series/observations',
                seriesId: 'ICSA', // Initial Claims
                updateInterval: 604800000, // 7 days - DOL updates weekly
                lastUpdate: null
            }],
            ['Housing Starts', {
                type: 'census',
                url: 'https://api.census.gov/data/timeseries/construction/housing',
                updateInterval: 2592000000, // 30 days - Census updates monthly
                lastUpdate: null
            }],
            ['New Home Sales', {
                type: 'census',
                url: 'https://api.census.gov/data/timeseries/construction/sales',
                updateInterval: 2592000000, // 30 days - Census updates monthly
                lastUpdate: null
            }],
            ['Industrial Production Index', {
                type: 'fed',
                url: 'https://www.federalreserve.gov/releases/g17/current/',
                updateInterval: 2592000000, // 30 days - Fed updates monthly
                lastUpdate: null
            }],
            ['Small Business Optimism Index', {
                type: 'nfib',
                url: 'https://www.nfib.com/news/monthly_report/sbet/',
                updateInterval: 2592000000, // 30 days - NFIB updates monthly
                lastUpdate: null
            }],
            ['Copper Futures', {
                type: 'market',
                url: 'https://finance.yahoo.com/quote/HG=F',
                symbol: 'HG=F',
                updateInterval: 60000, // 1 minute - Market data updates frequently
                lastUpdate: null
            }],
            ['Lumber Futures', {
                type: 'market',
                url: 'https://finance.yahoo.com/quote/LBS=F',
                symbol: 'LBS=F',
                updateInterval: 60000, // 1 minute - Market data updates frequently
                lastUpdate: null
            }],
            ['Gold Futures', {
                type: 'market',
                url: 'https://finance.yahoo.com/quote/GC=F',
                symbol: 'GC=F',
                updateInterval: 60000, // 1 minute - Market data updates frequently
                lastUpdate: null
            }],
            ['Silver Futures', {
                type: 'market',
                url: 'https://finance.yahoo.com/quote/SI=F',
                symbol: 'SI=F',
                updateInterval: 60000, // 1 minute - Market data updates frequently
                lastUpdate: null
            }],
            ['Oil Futures', {
                type: 'market',
                url: 'https://finance.yahoo.com/quote/CL=F',
                symbol: 'CL=F',
                updateInterval: 60000, // 1 minute - Market data updates frequently
                lastUpdate: null
            }],
            ['Unemployment Rate', {
                type: 'fred',
                url: 'https://api.stlouisfed.org/fred/series/observations',
                seriesId: 'UNRATE', // Unemployment Rate
                updateInterval: 86400000, // 24 hours - BLS updates monthly
                lastUpdate: null
            }],
            ['Federal Funds Rate', {
                type: 'fred',
                url: 'https://api.stlouisfed.org/fred/series/observations',
                seriesId: 'FEDFUNDS', // Federal Funds Rate
                updateInterval: 86400000, // 24 hours - Fed updates monthly
                lastUpdate: null
            }],
            ['GDP', {
                type: 'fred',
                url: 'https://api.stlouisfed.org/fred/series/observations',
                seriesId: 'GDP', // Gross Domestic Product
                updateInterval: 7776000000, // 90 days - BEA updates quarterly
                lastUpdate: null
            }]
        ]);
    }

    // Setup real-time controls in the modal
    setupRealTimeControls() {
        // Real-time controls removed - charts update automatically based on data source intervals
        // This method is kept for future extensibility but no longer adds UI controls
    }

    // Start real-time updates for active charts
    startRealTimeUpdates() {
        this.activeCharts.forEach((chartInstance, indicatorName) => {
            this.startChartUpdates(indicatorName, chartInstance);
        });
    }

    // Stop real-time updates
    stopRealTimeUpdates() {
        this.updateIntervals.forEach((interval) => {
            clearInterval(interval);
        });
        this.updateIntervals.clear();
    }

    // Restart real-time updates with new frequency
    restartRealTimeUpdates() {
        this.stopRealTimeUpdates();
        if (this.isRealTimeEnabled) {
            this.startRealTimeUpdates();
        }
    }

    // Start updates for a specific chart
    startChartUpdates(indicatorName, chartInstance) {
        const dataSource = this.dataSources.get(indicatorName);
        if (!dataSource) return;

        // Clear existing interval
        if (this.updateIntervals.has(indicatorName)) {
            clearInterval(this.updateIntervals.get(indicatorName));
        }

        // Start new update interval
        const interval = setInterval(() => {
            this.updateChartData(indicatorName, chartInstance);
        }, dataSource.updateInterval || this.updateFrequency);

        this.updateIntervals.set(indicatorName, interval);

        // Initial update
        this.updateChartData(indicatorName, chartInstance);
    }

    // Update chart data from real-time sources
    async updateChartData(indicatorName, chartInstance) {
        const dataSource = this.dataSources.get(indicatorName);
        if (!dataSource) return;

        try {
            let newData = null;

            switch (dataSource.type) {
                case 'market':
                    newData = await this.fetchMarketData(indicatorName);
                    break;
                case 'bls':
                    newData = await this.fetchBLSData(dataSource.seriesId);
                    break;
                case 'fed':
                    newData = await this.fetchFedData(indicatorName);
                    break;
                case 'census':
                    newData = await this.fetchCensusData(indicatorName);
                    break;
                case 'freightos':
                    newData = await this.fetchFreightosData();
                    break;
                case 'fred':
                    newData = await this.fetchFREDData(dataSource.seriesId);
                    break;
                case 'yahoo':
                    newData = await this.fetchYahooFinanceData(dataSource.symbol);
                    break;
                default:
                    break;
            }

            if (newData) {
                // Update chart with new data
                chartInstance.data = newData;
                chartInstance.update('active');
                dataSource.lastUpdate = new Date();
            }
        } catch (error) {
            console.error(`Error updating chart data for ${indicatorName}:`, error);
        }
    }

    // Fetch market data from Yahoo Finance
    async fetchMarketData(indicatorName) {
        try {
            const dataSource = this.dataSources.get(indicatorName);
            if (!dataSource || !dataSource.symbol) return null;

            // Use Yahoo Finance API (requires CORS proxy in production)
            const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${dataSource.symbol}?range=1d&interval=1m`);
            const data = await response.json();

            if (data.chart && data.chart.result && data.chart.result[0]) {
                const result = data.chart.result[0];
                const timestamps = result.timestamp;
                const prices = result.indicators.quote[0].close;

                // Get last 30 minutes of data
                const last30Prices = prices.slice(-30);
                const last30Timestamps = timestamps.slice(-30);

                const labels = last30Timestamps.map(ts => new Date(ts * 1000).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }));

                return {
                    labels: labels,
                    datasets: [{
                        label: indicatorName,
                        data: last30Prices,
                        borderColor: '#2C5F5A',
                        backgroundColor: 'rgba(44, 95, 90, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                };
            }
        } catch (error) {
            console.error(`Error fetching market data for ${indicatorName}:`, error);
            throw error;
        }

        return null;
    }

    // Fetch BLS data using their public API
    async fetchBLSData(seriesId) {
        try {
            // BLS public API (free, no key required for limited usage)
            const response = await fetch(`https://api.bls.gov/publicAPI/v2/timeseries/data/${seriesId}?startyear=2024&endyear=2024`);
            const data = await response.json();

            if (data.Results && data.Results.series && data.Results.series[0]) {
                const series = data.Results.series[0].data;
                const chartData = series.slice(0, 6).reverse(); // Get last 6 months

                const labels = chartData.map(item => {
                    const month = parseInt(item.period);
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return monthNames[month - 1];
                });

                const values = chartData.map(item => parseFloat(item.value));

                // Add current month as "Live" if available
                const currentMonth = new Date().getMonth();
                const currentMonthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][currentMonth];

                if (!labels.includes(currentMonthName)) {
                    labels.push('Live');
                    // For demo, add a small variation to last known value
                    const lastValue = values[values.length - 1];
                    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
                    values.push(parseFloat((lastValue * (1 + variation)).toFixed(2)));
                }

                return {
                    labels: labels,
                    datasets: [{
                        label: this.getBLSLabel(seriesId),
                        data: values,
                        borderColor: '#2C5F5A',
                        backgroundColor: 'rgba(44, 95, 90, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                };
            }
        } catch (error) {
            console.error(`Error fetching BLS data for ${seriesId}:`, error);
            throw error;
        }

        return null;
    }

    // Fetch Federal Reserve data
    async fetchFedData(indicatorName) {
        try {
            // Federal Reserve Economic Data (FRED) - free API
            const seriesIds = {
                'Industrial Production Index': 'INDPRO',
                'Federal Funds Rate': 'FEDFUNDS',
                'Unemployment Rate': 'UNRATE'
            };

            const seriesId = seriesIds[indicatorName];
            if (!seriesId) return null;

            // Use FRED API (free, no key required for limited usage)
            const response = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=free&file_type=json&limit=6&sort_order=desc`);
            const data = await response.json();

            if (data.observations && data.observations.length > 0) {
                const observations = data.observations.slice(0, 6).reverse();

                const labels = observations.map(obs => {
                    const date = new Date(obs.date);
                    return date.toLocaleDateString('en-US', {
                        month: 'short'
                    });
                });

                const values = observations.map(obs => parseFloat(obs.value));

                // Add current month as "Live" if available
                const currentMonth = new Date().toLocaleDateString('en-US', {
                    month: 'short'
                });
                if (!labels.includes(currentMonth)) {
                    labels.push('Live');
                    const lastValue = values[values.length - 1];
                    const variation = (Math.random() - 0.5) * 0.01; // ±0.5% variation
                    values.push(parseFloat((lastValue * (1 + variation)).toFixed(2)));
                }

                return {
                    labels: labels,
                    datasets: [{
                        label: indicatorName,
                        data: values,
                        borderColor: '#2C5F5A',
                        backgroundColor: 'rgba(44, 95, 90, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                };
            }
        } catch (error) {
            console.error(`Error fetching Fed data for ${indicatorName}:`, error);
            throw error;
        }

        return null;
    }

    // Fetch Census Bureau data
    async fetchCensusData(indicatorName) {
        try {
            // Census Bureau API (free, no key required)
            const endpoints = {
                'Housing Starts': 'https://api.census.gov/data/timeseries/construction/housing?get=cell_value,time_slot_id,time_slot_name&for=us:*&time=2024',
                'New Home Sales': 'https://api.census.gov/data/timeseries/construction/sales?get=cell_value,time_slot_id,time_slot_name&for=us:*&time=2024'
            };

            const endpoint = endpoints[indicatorName];
            if (!endpoint) return null;

            const response = await fetch(endpoint);
            const data = await response.json();

            if (data && data.length > 1) {
                // Parse Census data (skip header row)
                const observations = data.slice(1).slice(0, 6);

                const labels = observations.map(obs => {
                    const timeSlot = obs[2]; // time_slot_name
                    return timeSlot;
                });

                const values = observations.map(obs => parseFloat(obs[0])); // cell_value

                // Add current period as "Live" if available
                const currentPeriod = this.getCurrentCensusPeriod();
                if (!labels.includes(currentPeriod)) {
                    labels.push('Live');
                    const lastValue = values[values.length - 1];
                    const variation = (Math.random() - 0.5) * 0.05; // ±2.5% variation
                    values.push(parseFloat((lastValue * (1 + variation)).toFixed(3)));
                }

                return {
                    labels: labels,
                    datasets: [{
                        label: indicatorName,
                        data: values,
                        borderColor: '#D4822A',
                        backgroundColor: 'rgba(212, 130, 42, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                };
            }
        } catch (error) {
            console.error(`Error fetching Census data for ${indicatorName}:`, error);
            throw error;
        }

        return null;
    }

    // Fetch Freightos shipping data
    async fetchFreightosData() {
        try {
            // Freightos doesn't have a public API, so we'll use web scraping simulation
            // In production, you would need to partner with Freightos or use their data feeds

            // For now, we'll simulate with realistic variations based on market conditions
            const baseValues = [5.2, 5.45, 5.6, 5.75, 6.1, 5.8];

            // Simulate realistic market variations based on supply/demand factors
            const marketFactors = this.getShippingMarketFactors();
            const variation = (marketFactors.demand - marketFactors.supply) * 0.1;
            const newValue = baseValues[baseValues.length - 1] * (1 + variation);

            return {
                labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Live'],
                datasets: [{
                    label: 'Container Rate ($K)',
                    data: [...baseValues, parseFloat(newValue.toFixed(2))],
                    borderColor: '#1D3F3B',
                    backgroundColor: 'rgba(29, 63, 59, 0.15)',
                    tension: 0.4,
                    fill: true
                }]
            };
        } catch (error) {
            console.error('Error fetching Freightos data:', error);
            throw error;
        }
    }

    // Fetch FRED data (Federal Reserve Economic Data)
    async fetchFREDData(seriesId) {
        try {
            // FRED API (free, no key required for limited usage)
            const response = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=free&file_type=json&limit=6&sort_order=desc`);
            const data = await response.json();

            if (data.observations && data.observations.length > 0) {
                const observations = data.observations.slice(0, 6).reverse();

                const labels = observations.map(obs => {
                    const date = new Date(obs.date);
                    return date.toLocaleDateString('en-US', {
                        month: 'short'
                    });
                });

                const values = observations.map(obs => parseFloat(obs.value));

                // Add current period as "Live"
                const currentPeriod = new Date().toLocaleDateString('en-US', {
                    month: 'short'
                });
                if (!labels.includes(currentPeriod)) {
                    labels.push('Live');
                    const lastValue = values[values.length - 1];
                    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
                    values.push(parseFloat((lastValue * (1 + variation)).toFixed(2)));
                }

                return {
                    labels: labels,
                    datasets: [{
                        label: this.getFREDLabel(seriesId),
                        data: values,
                        borderColor: '#87C5BE',
                        backgroundColor: 'rgba(135, 197, 190, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                };
            }
        } catch (error) {
            console.error(`Error fetching FRED data for ${seriesId}:`, error);
            throw error;
        }

        return null;
    }

    // Fetch Yahoo Finance data for additional market instruments
    async fetchYahooFinanceData(symbol) {
        try {
            // Use Yahoo Finance API (requires CORS proxy in production)
            const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`);
            const data = await response.json();

            if (data.chart && data.chart.result && data.chart.result[0]) {
                const result = data.chart.result[0];
                const timestamps = result.timestamp;
                const prices = result.indicators.quote[0].close;

                // Get last hour of data
                const lastHourPrices = prices.slice(-12); // 5-minute intervals
                const lastHourTimestamps = timestamps.slice(-12);

                const labels = lastHourTimestamps.map(ts => new Date(ts * 1000).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                }));

                return {
                    labels: labels,
                    datasets: [{
                        label: symbol,
                        data: lastHourPrices,
                        borderColor: '#2C5F5A',
                        backgroundColor: 'rgba(44, 95, 90, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                };
            }
        } catch (error) {
            console.error(`Error fetching Yahoo Finance data for ${symbol}:`, error);
            throw error;
        }

        return null;
    }

    // Get BLS label for series ID
    getBLSLabel(seriesId) {
        const labels = {
            'CUUR0000SA0': 'CPI (All Urban Consumers)',
            'CES0000000001': 'Total Nonfarm Employment',
            'WPUFD4': 'PPI (Final Demand)'
        };
        return labels[seriesId] || seriesId;
    }

    // Get FRED label for series ID
    getFREDLabel(seriesId) {
        const labels = {
            'UNRATE': 'Unemployment Rate',
            'FEDFUNDS': 'Federal Funds Rate',
            'GDP': 'Gross Domestic Product',
            'INDPRO': 'Industrial Production Index',
            'ICSA': 'Initial Jobless Claims'
        };
        return labels[seriesId] || seriesId;
    }

    // Get current Census period
    getCurrentCensusPeriod() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        return `${year}${month.toString().padStart(2, '0')}`;
    }

    // Simulate shipping market factors
    getShippingMarketFactors() {
        // Simulate realistic market conditions
        return {
            demand: Math.random() * 0.4 + 0.8, // 0.8-1.2
            supply: Math.random() * 0.3 + 0.7  // 0.7-1.0
        };
    }

    // Register a chart for real-time updates
    registerChart(indicatorName, chartInstance) {
        this.activeCharts.set(indicatorName, chartInstance);
        this.startChartUpdates(indicatorName, chartInstance);
    }

    // Unregister a chart from real-time updates
    unregisterChart(indicatorName) {
        if (this.updateIntervals.has(indicatorName)) {
            clearInterval(this.updateIntervals.get(indicatorName));
            this.updateIntervals.delete(indicatorName);
        }
        this.activeCharts.delete(indicatorName);
    }
}

// Create global real-time manager instance
const realTimeManager = new RealTimeChartManager();

// Chart configuration system
const chartConfigs = {
    'Manufacturing PMI': {
        type: 'chartjs',
        icon: 'briefcase',
        title: 'Manufacturing PMI - Factory Activity',
        chartContent: `
            <div>
                <canvas id="manufacturingPmiChart"></canvas>
            </div>
        `
    },
    'Median Home Price': {
        type: 'chartjs',
        icon: 'home',
        title: 'Median Home Price - Housing Market Values',
        chartContent: `
            <div>
                <canvas id="medianPriceChart"></canvas>
            </div>
        `
    },
    'Monthly Budget Deficit': {
        type: 'chartjs',
        icon: 'landmark',
        title: 'Federal Budget Deficit - Government Finances',
        chartContent: `
            <div>
                <canvas id="budgetChart"></canvas>
            </div>
        `
    },
    'Monthly Retail Sales': {
        type: 'chartjs',
        icon: 'shopping-cart',
        title: 'Retail Sales - Consumer Spending',
        chartContent: `
            <div>
                <canvas id="retailChart"></canvas>
            </div>
        `
    },
    'New Orders': {
        type: 'chartjs',
        icon: 'briefcase',
        title: 'Manufacturing New Orders - Business Demand',
        chartContent: `
            <div>
                <canvas id="ordersChart"></canvas>
            </div>
        `
    },
    'Pending Home Sales Index': {
        type: 'chartjs',
        icon: 'home',
        title: 'Pending Home Sales - Future Market Activity',
        chartContent: `
            <div>
                <canvas id="pendingChart"></canvas>
            </div>
        `
    },
    'Personal Consumption Expenditures (PCE)': {
        type: 'chartjs',
        icon: 'shopping-cart',
        title: 'Personal Consumption Expenditures - Consumer Spending',
        chartContent: `
            <div>
                <canvas id="pceChart"></canvas>
            </div>
        `
    },
    'Southern Border Encounters': {
        type: 'chartjs',
        icon: 'users',
        title: 'Border Encounters - Migration Trends',
        chartContent: `
            <div>
                <canvas id="borderChart"></canvas>
            </div>
        `
    },
    'Tariff Revenue': {
        type: 'chartjs',
        icon: 'landmark',
        title: 'Tariff Revenue - Trade Policy Income',
        chartContent: `
            <div>
                <canvas id="tariffChart"></canvas>
            </div>
        `
    },
    'Tax Revenue': {
        type: 'chartjs',
        icon: 'landmark',
        title: 'Federal Tax Revenue - Government Income',
        chartContent: `
            <div>
                <canvas id="taxChart"></canvas>
            </div>
        `
    },
    'Trade Deficit': {
        type: 'chartjs',
        icon: 'ship',
        title: 'Trade Deficit - Import/Export Balance',
        chartContent: `
            <div>
                <canvas id="tradeChart"></canvas>
            </div>
        `
    },
    'Treasury Debt Level': {
        type: 'chartjs',
        icon: 'landmark',
        title: 'National Debt Level - Government Obligations',
        chartContent: `
            <div>
                <canvas id="debtChart"></canvas>
            </div>
        `
    },
    'Used Vehicle Value Index': {
        type: 'chartjs',
        icon: 'shopping-cart',
        title: 'Used Vehicle Values - Auto Market Trends',
        chartContent: `
            <div>
                <canvas id="vehicleChart"></canvas>
            </div>
        `
    },
    'Chicago Fed Survey of Economic Conditions': {
        type: 'chartjs',
        icon: 'briefcase',
        title: 'Chicago Fed Survey of Economic Conditions - Regional Business Activity',
        chartContent: `
            <div>
                <canvas id="cfsecChart"></canvas>
            </div>
        `
    }
};

function getChartConfig(indicatorName) {
    // Create chart data from financial data
    const indicatorData = financialData.indices.find(item => item.name.trim().toLowerCase() === indicatorName.trim().toLowerCase());
    if (!indicatorData) return null;

    function createChartData(indicatorData) {
        const months = ['march', 'april', 'may', 'june', 'july', 'august'];
        const monthLabels = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

        const labels = [];
        const values = [];

        months.forEach((month, index) => {
            const value = indicatorData[month];
            if (value && value !== '' && !value.startsWith('TBD')) {
                const numValue = extractNumericValue(value);
                if (numValue !== null) {
                    labels.push(monthLabels[index]);
                    values.push(numValue);
                }
            }
        });

        // Add current month estimate
        const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
        if (!labels.includes(currentMonth)) {
            labels.push('Live');
            const lastValue = values[values.length - 1];
            if (lastValue) {
                const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
                values.push(parseFloat((lastValue * (1 + variation)).toFixed(2)));
            }
        }

        return {
            labels: labels,
            datasets: [{
                label: indicatorName,
                data: values,
                borderColor: '#2C5F5A',
                backgroundColor: 'rgba(44, 95, 90, 0.1)',
                tension: 0.4,
                fill: true
            }]
        };
    }

    const data = createChartData(indicatorData);
    if (!data) return null;

    const config = {
        type: 'chartjs',
        data: data
    };

    // Customize colors for specific charts
    const dataset = config.data.datasets[0];
    if (indicatorName === 'CPI') {
        dataset.borderColor = '#1D3F3B';
        dataset.backgroundColor = 'rgba(29, 63, 59, 0.15)';
    } else if (indicatorName === 'PPI') {
        dataset.borderColor = '#5A9D96';
        dataset.backgroundColor = 'rgba(90, 157, 150, 0.15)';
    } else if (indicatorName === 'Housing Starts') {
        dataset.borderColor = '#B56A18';
        dataset.backgroundColor = 'rgba(181, 106, 24, 0.15)';
    } else if (indicatorName === 'New Home Sales') {
        dataset.borderColor = '#E8955D';
        dataset.backgroundColor = 'rgba(232, 149, 93, 0.1)';
    } else if (indicatorName === 'Industrial Production Index') {
        dataset.borderColor = '#1D3F3B';
        dataset.backgroundColor = 'rgba(29, 63, 59, 0.15)';
    } else if (indicatorName === 'Small Business Optimism Index') {
        dataset.borderColor = '#5A9D96';
        dataset.backgroundColor = 'rgba(90, 157, 150, 0.15)';
    } else if (indicatorName === 'Jobless Claims') {
        dataset.borderColor = '#B56A18';
        dataset.backgroundColor = 'rgba(181, 106, 24, 0.15)';
    } else if (indicatorName === 'Job Openings') {
        dataset.borderColor = '#E8955D';
        dataset.backgroundColor = 'rgba(232, 149, 93, 0.1)';
    } else if (indicatorName === 'Private Employment') {
        dataset.borderColor = '#1D3F3B';
        dataset.backgroundColor = 'rgba(29, 63, 59, 0.15)';
    } else if (indicatorName === 'Total Nonfarm Employment') {
        dataset.borderColor = '#2C5F5A';
        dataset.backgroundColor = 'rgba(44, 95, 90, 0.15)';
    } else if (indicatorName === 'Affordability Index') {
        dataset.borderColor = '#F8F4E6';
        dataset.backgroundColor = 'rgba(248, 244, 230, 0.1)';
    } else if (indicatorName === 'Housing Market Index') {
        dataset.borderColor = '#5A9D96';
        dataset.backgroundColor = 'rgba(90, 157, 150, 0.15)';
    } else if (indicatorName === 'Existing Home Sales') {
        dataset.borderColor = '#B56A18';
        dataset.backgroundColor = 'rgba(181, 106, 24, 0.15)';
    } else if (indicatorName === 'Number of Days on Market (Median)') {
        dataset.borderColor = '#E8955D';
        dataset.backgroundColor = 'rgba(232, 149, 93, 0.1)';
    } else if (indicatorName === 'Copper Futures') {
        dataset.borderColor = '#B56A18';
        dataset.backgroundColor = 'rgba(181, 106, 24, 0.15)';
    } else if (indicatorName === 'Lumber Futures') {
        dataset.borderColor = '#E8955D';
        dataset.backgroundColor = 'rgba(232, 149, 93, 0.1)';
    } else if (indicatorName === '20ft Equivalents (TEUs)') {
        dataset.borderColor = '#5A9D96';
        dataset.backgroundColor = 'rgba(90, 157, 150, 0.15)';
    } else if (indicatorName === '10-yr Treasury Yield') {
        dataset.borderColor = '#1D3F3B';
        dataset.backgroundColor = 'rgba(29, 63, 59, 0.15)';
    } else if (indicatorName === '30-yr Mortgage Rate') {
        dataset.borderColor = '#B56A18';
        dataset.backgroundColor = 'rgba(181, 106, 24, 0.15)';
    } else if (indicatorName === 'Case-Shiller National Home Price Index') {
        dataset.borderColor = '#E8955D';
        dataset.backgroundColor = 'rgba(232, 149, 93, 0.1)';
    } else if (indicatorName === 'Composite PMI (Flash)') {
        dataset.borderColor = '#5A9D96';
        dataset.backgroundColor = 'rgba(90, 157, 150, 0.15)';
    } else if (indicatorName === 'Construction Spending') {
        dataset.borderColor = '#D4822A';
        dataset.backgroundColor = 'rgba(212, 130, 42, 0.1)';
    } else if (indicatorName === 'Consumer Confidence') {
        dataset.borderColor = '#87C5BE';
        dataset.backgroundColor = 'rgba(135, 197, 190, 0.1)';
    } else if (indicatorName === 'Consumer Sentiment') {
        dataset.borderColor = '#2C5F5A';
        dataset.backgroundColor = 'rgba(44, 95, 90, 0.15)';
    } else if (indicatorName === 'Dollar Value Index') {
        dataset.borderColor = '#1D3F3B';
        dataset.backgroundColor = 'rgba(29, 63, 59, 0.15)';
    } else if (indicatorName === 'Employment Trends Index') {
        dataset.borderColor = '#5A9D96';
        dataset.backgroundColor = 'rgba(90, 157, 150, 0.15)';
    } else if (indicatorName === 'Interest on Debt') {
        dataset.borderColor = '#E8955D';
        dataset.backgroundColor = 'rgba(232, 149, 93, 0.1)';
    } else if (indicatorName === 'Lagging Economic Index') {
        dataset.borderColor = '#D4822A';
        dataset.backgroundColor = 'rgba(212, 130, 42, 0.1)';
    } else if (indicatorName === 'Leading Economic Indicator') {
        dataset.borderColor = '#87C5BE';
        dataset.backgroundColor = 'rgba(135, 197, 190, 0.1)';
    } else if (indicatorName === 'Manufacturing PMI') {
        dataset.borderColor = '#1D3F3B';
        dataset.backgroundColor = 'rgba(29, 63, 59, 0.15)';
    } else if (indicatorName === 'Median Home Price') {
        dataset.borderColor = '#5A9D96';
        dataset.backgroundColor = 'rgba(90, 157, 150, 0.15)';
    } else if (indicatorName === 'Monthly Budget Deficit') {
        dataset.borderColor = '#B56A18';
        dataset.backgroundColor = 'rgba(181, 106, 24, 0.15)';
    } else if (indicatorName === 'Monthly Retail Sales') {
        dataset.borderColor = '#E8955D';
        dataset.backgroundColor = 'rgba(232, 149, 93, 0.1)';
    } else if (indicatorName === 'New Orders') {
        dataset.borderColor = '#87C5BE';
        dataset.backgroundColor = 'rgba(135, 197, 190, 0.1)';
    } else if (indicatorName === 'Pending Home Sales Index') {
        dataset.borderColor = '#1D3F3B';
        dataset.backgroundColor = 'rgba(29, 63, 59, 0.15)';
    } else if (indicatorName === 'Personal Consumption Expenditures (PCE)') {
        dataset.borderColor = '#5A9D96';
        dataset.backgroundColor = 'rgba(90, 157, 150, 0.15)';
    } else if (indicatorName === 'Southern Border Encounters') {
        dataset.borderColor = '#B56A18';
        dataset.backgroundColor = 'rgba(181, 106, 24, 0.15)';
    } else if (indicatorName === 'Tariff Revenue') {
        dataset.borderColor = '#E8955D';
        dataset.backgroundColor = 'rgba(232, 149, 93, 0.1)';
    } else if (indicatorName === 'Tax Revenue') {
        dataset.borderColor = '#D4822A';
        dataset.backgroundColor = 'rgba(212, 130, 42, 0.1)';
    } else if (indicatorName === 'Trade Deficit') {
        dataset.borderColor = '#87C5BE';
        dataset.backgroundColor = 'rgba(135, 197, 190, 0.1)';
    } else if (indicatorName === 'Treasury Debt Level') {
        dataset.borderColor = '#1D3F3B';
        dataset.backgroundColor = 'rgba(29, 63, 59, 0.15)';
    } else if (indicatorName === 'Used Vehicle Value Index') {
        dataset.borderColor = '#B56A18';
        dataset.backgroundColor = 'rgba(181, 106, 24, 0.15)';
    } else if (indicatorName === 'Chicago Fed Survey of Economic Conditions') {
        dataset.borderColor = '#2C5F5A';
        dataset.backgroundColor = 'rgba(44, 95, 90, 0.15)';
    } else {
        // Default
        dataset.borderColor = '#2C5F5A';
        dataset.backgroundColor = 'rgba(44, 95, 90, 0.1)';
    }
    dataset.tension = 0.4;
    dataset.fill = true;

    // Special case for 'Jobs Added' which is a line chart with specific colors and hardcoded data
    if (indicatorName === 'Jobs Added') {
        config.data = {
            labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
            datasets: [{
                label: 'Jobs Added (Thousands)',
                data: [120, 158, 19, 14, 73, 22],
                borderColor: '#2C5F5A',
                backgroundColor: 'rgba(44, 95, 90, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#2C5F5A',
                pointBorderColor: '#2C5F5A',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        };
    }

    return config;
}

// Initialize Chart.js charts
function initializeChart(chartConfig) {
    if (chartConfig.type === 'chartjs' && chartConfig.data) {
        // Wait for DOM to be ready
        setTimeout(() => {
            const canvasId = chartConfig.chartContent.match(/id=\"([^\"]+)\"/)?.[1];
            if (canvasId) {
                const canvas = document.getElementById(canvasId);
                if (canvas) {
                    const ctx = canvas.getContext('2d');

                    // Destroy existing chart if it exists
                    if (window[canvasId + 'Chart']) {
                        window[canvasId + 'Chart'].destroy();
                    }

                    // Create new chart
                    const chartInstance = new Chart(ctx, {
                        type: 'line',
                        data: chartConfig.data,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: {
                                padding: {
                                    top: 5,
                                    right: 5,
                                    bottom: 5,
                                    left: 5
                                }
                            },
                            animation: {
                                duration: 800,
                                easing: 'easeInOutQuart'
                            },
                            plugins: {
                                legend: {
                                    position: 'top',
                                    align: 'center',
                                    labels: {
                                        usePointStyle: true,
                                        padding: 8,
                                        boxWidth: 6,
                                        font: {
                                            size: 10
                                        }
                                    }
                                },
                                title: {
                                    display: true,
                                    padding: {
                                        bottom: 5
                                    }
                                },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    padding: 8,
                                    titleFont: {
                                        size: 10
                                    },
                                    bodyFont: {
                                        size: 10
                                    },
                                    boxPadding: 4
                                },
                                datalabels: {
                                    display: false
                                },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    titleColor: '#fff',
                                    bodyColor: '#fff',
                                    borderColor: '#2C5F5A',
                                    borderWidth: 1,
                                    callbacks: {
                                        label: function (context) {
                                            let label = context.dataset.label || '';
                                            if (label) {
                                                label += ': ';
                                            }
                                            if (context.parsed.y !== null) {
                                                label += new Intl.NumberFormat('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }).format(context.parsed.y);
                                            }
                                            return label;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    grid: {
                                        display: false,
                                        drawBorder: false
                                    },
                                    ticks: {
                                        maxRotation: 0,
                                        autoSkip: true,
                                        maxTicksLimit: 6,
                                        padding: 2,
                                        font: {
                                            size: 9
                                        }
                                    }
                                },
                                y: {
                                    beginAtZero: false,
                                    grid: {
                                        color: 'rgba(0, 0, 0, 0.03)',
                                        drawBorder: false
                                    },
                                    ticks: {
                                        padding: 2,
                                        font: {
                                            size: 9
                                        },
                                        callback: function (value) {
                                            return value.toLocaleString();
                                        }
                                    },
                                    position: 'right'
                                }
                            },
                            interaction: {
                                mode: 'nearest',
                                axis: 'x',
                                intersect: false
                            }
                        }
                    });

                    window[canvasId + 'Chart'] = chartInstance;
                    return chartInstance;
                }
            }
        }, 100);
    }
    return null;
}

// Setup modal close functionality
function setupModalHandlers() {
    const modal = document.getElementById('chartModal');
    const closeBtn = document.getElementById('closeChartModal');

    // Close button click
    closeBtn.addEventListener('click', function () {
        modal.style.display = 'none';

        // Unregister charts when modal is closed
        realTimeManager.activeCharts.forEach((chartInstance, indicatorName) => {
            realTimeManager.unregisterChart(indicatorName);
        });
    });

    // Click outside modal to close
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.style.display = 'none';

            // Unregister charts when modal is closed
            realTimeManager.activeCharts.forEach((chartInstance, indicatorName) => {
                realTimeManager.unregisterChart(indicatorName);
            });
        }
    });

    // ESC key to close
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';

            // Unregister charts when modal is closed
            realTimeManager.activeCharts.forEach((chartInstance, indicatorName) => {
                realTimeManager.unregisterChart(indicatorName);
            });
        }
    });
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function () {
    fetchFinancialData();
    // Initialize Lucide icons when DOM is ready
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});
