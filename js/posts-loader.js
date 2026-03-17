// Monolithic Posts Loader - Simplified & Consolidated
// Replaces the previous module-based architecture for better performance and simplicity

/* =========================================
   1. UTILITIES & CONFIG
   ========================================= */

const CONFIG = {
    INITIAL_LOAD: 10,
    BATCH_SIZE: 10,
    POSTS_JSON_URL: 'json/posts.json',
    ARTICLES_JSON_URL: 'json/articles.json'
};

const getLiveChartColors = () => {
    const isDark = document.documentElement.classList.contains('dark-mode');
    return {
        PRIMARY: isDark ? '#87c5be' : '#2C5F5A',
        PRIMARY_FILL: isDark ? 'rgba(135, 197, 190, 0.1)' : 'rgba(44, 95, 90, 0.1)',
        SECONDARY: isDark ? '#a0a9b8' : '#6c757d',
        ACCENT: '#D4822A',
        ERROR: '#e53935',
        GRID: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        TEXT: isDark ? '#a0a9b8' : '#6c757d'
    };
};

const CHART_CONFIG = {
    TENSION: 0.4,
    BORDER_WIDTH: 2
};

const INDICATOR_CONFIGS = {
    'Lumber Futures': { yMin: 500, yMax: 720 },
    'Consumer Sentiment': { yMin: 45, yMax: 65 }
};

/* =========================================
   2. TIME FORMATTER
   ========================================= */

function formatTimeAgo(dateString) {
    const postDate = new Date(dateString);
    if (isNaN(postDate)) return 'recently';

    const now = new Date();
    const diffMs = now - postDate;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
}

function startTimeUpdates() {
    if (window._timeUpdateInterval) return;
    window._timeUpdateInterval = setInterval(() => {
        document.querySelectorAll('.announcement-card').forEach(card => {
            const dateStr = card.getAttribute('data-date');
            if (dateStr) {
                const timeEl = card.querySelector('.post-time');
                if (timeEl) timeEl.textContent = formatTimeAgo(dateStr);
            }
        });
    }, 60000);
}

/* =========================================
   3. MARKDOWN PARSER
   ========================================= */

function parseFrontmatter(md) {
    const metadata = {};
    const match = md.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    if (!match) return { metadata, contentMd: md.trim() };
    const [, frontmatter, contentMd] = match;
    frontmatter.split('\n').forEach(line => {
        const colon = line.indexOf(':');
        if (colon > -1) {
            const key = line.slice(0, colon).trim();
            let val = line.slice(colon + 1).trim();
            if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
            metadata[key] = val;
        }
    });
    return { metadata, contentMd: contentMd.trim() };
}

async function parseMarkdownFile(fileUrl) {
    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const md = await response.text();
        return parseMarkdownContent(md);
    } catch (err) {
        console.error('Failed to fetch', fileUrl, err);
        return { content: '', metadata: {} };
    }
}

function parseMarkdownContent(md) {
    const { metadata, contentMd } = parseFrontmatter(md);
    let html = contentMd;
    if (window.marked && typeof window.marked.parse === 'function') {
        try {
            html = window.marked.parse(contentMd);
        } catch (e) {
            console.error('Markdown parse error:', e);
        }
    }
    return { content: html, metadata };
}

async function processBadges(html) {
    // Template: {{badge:Indicator Name}} - calculates MoM from financials-data
    const badgeRegex = /\{\{badge:([^}]+)\}\}/g;
    
    // Load financial data if not cached
    if (!window._financialsData) {
        try {
            const response = await fetch('json/financials-data.json');
            if (response.ok) {
                window._financialsData = await response.json();
            }
        } catch (e) {
            console.error('Failed to load financials data for badges:', e);
            return html;
        }
    }
    
    const data = window._financialsData;
    if (!data || !data.indices) return html;
    
    return html.replace(badgeRegex, (match, indicatorName) => {
        const name = indicatorName.trim();
        const indicator = data.indices.find(i => i.name === name);
        
        if (!indicator) return match;
        
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const yearKeys = Object.keys(indicator).filter(k => /^\d{4}$/.test(k)).sort((a,b) => b-a);
        
        let current = null, previous = null, currentMonth = -1, currentYear = null;
        
        // Find latest value - search from most recent year, going backwards through months
        for (const year of yearKeys) {
            if (!indicator[year] || typeof indicator[year] !== 'object') continue;
            
            for (let i = months.length - 1; i >= 0; i--) {
                const month = months[i];
                const rawVal = indicator[year][month];
                if (!rawVal) continue;
                const val = parseFloat(String(rawVal).replace(/[$,%KM]/g, ''));
                if (!isNaN(val)) {
                    current = val;
                    currentMonth = i;
                    currentYear = year;
                    break;
                }
            }
            if (current !== null) break; // Found latest value
        }
        
        // If no nested year data found, check flat structure
        if (current === null) {
            for (let i = months.length - 1; i >= 0; i--) {
                const month = months[i];
                const rawVal = indicator[month];
                if (!rawVal) continue;
                const val = parseFloat(String(rawVal).replace(/[$,%KM]/g, ''));
                if (!isNaN(val)) {
                    current = val;
                    currentMonth = i;
                    currentYear = null; // Flat structure, no year
                    break;
                }
            }
        }
        
        // Find previous month value - go back one month from current
        if (current !== null && currentMonth >= 0) {
            if (currentYear === null) {
                // Using flat structure - previous month is just the previous entry in flat keys
                if (currentMonth > 0) {
                    const prevMonth = months[currentMonth - 1];
                    const rawVal = indicator[prevMonth];
                    if (rawVal) {
                        const val = parseFloat(String(rawVal).replace(/[$,%KM]/g, ''));
                        if (!isNaN(val)) previous = val;
                    }
                }
            } else {
                // Using nested year structure
                if (currentMonth > 0) {
                    // Previous month is in same year
                    const prevMonth = months[currentMonth - 1];
                    const rawVal = indicator[currentYear][prevMonth];
                    if (rawVal) {
                        const val = parseFloat(String(rawVal).replace(/[$,%KM]/g, ''));
                        if (!isNaN(val)) previous = val;
                    }
                } else if (currentMonth === 0) {
                    // Previous month is December - check flat structure first (previous year's data)
                    const rawVal = indicator['december'];
                    if (rawVal) {
                        const val = parseFloat(String(rawVal).replace(/[$,%KM]/g, ''));
                        if (!isNaN(val)) previous = val;
                    } else {
                        // Fall back to December of previous year object
                        const prevYear = String(parseInt(currentYear) - 1);
                        if (indicator[prevYear] && indicator[prevYear]['december']) {
                            const rawVal2 = indicator[prevYear]['december'];
                            const val = parseFloat(String(rawVal2).replace(/[$,%KM]/g, ''));
                            if (!isNaN(val)) previous = val;
                        }
                    }
                }
            }
        }
        
        if (current === null || previous === null || previous === 0) return match;
        
        const change = ((current - previous) / previous) * 100;
        const cssClass = change > 0 ? 'change-positive' : change < 0 ? 'change-negative' : 'change-neutral';
        const formatted = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        
        return `<span class="mom-badge ${cssClass}">${formatted}</span>`;
    });
}

function processCharts(html) {
    const chartRegex = /\{\{chart:([^}]+)\}\}/g;
    return html.replace(chartRegex, (match, indicatorName) => {
        const name = indicatorName.trim();
        const canvasId = name.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-' + Date.now() + Math.floor(Math.random() * 1000);
        return `<div class="chart-container" data-chart-id="${canvasId}" data-indicator="${name}"><canvas id="${canvasId}"></canvas></div>`;
    });
}

function wrapImagesInLinks(html) {
    const imgRegex = /<img([^>]*?)src="([^"]+)"([^>]*?)alt="([^"]+)"([^>]*?)>/g;
    return html.replace(imgRegex, (match, before, src, after, alt, end) => {
        // Check if image is already wrapped in a link
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html.substring(Math.max(0, html.indexOf(match) - 100), html.indexOf(match) + match.length + 100);
        const isWrapped = tempDiv.querySelector('a img');
        if (isWrapped) return match; // Skip if already in a link
        
        const slug = alt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        return `<a href="media.html#${slug}"><img${before}src="${src}"${after}alt="${alt}"${end}></a>`;
    });
}

function wrapTablesForMobile(html) {
    // Wrap all tables in a responsive wrapper div
    const tableRegex = /<table([^>]*)>([\s\S]*?)<\/table>/g;
    return html.replace(tableRegex, (match) => {
        return `<div class="table-wrapper">${match}</div>`;
    });
}

function waitForMarked() {
    return new Promise(resolve => {
        if (window.marked) return resolve();

        // Critical fix: Actively trigger load if available
        if (typeof window.loadMarked === 'function') {
            window.loadMarked().then(() => resolve());
            return;
        }

        const check = setInterval(() => {
            if (window.marked) {
                clearInterval(check);
                resolve();
            }
        }, 100);

        // Timeout after 3s to fallback
        setTimeout(() => {
            clearInterval(check);
            console.warn('Marked.js load timeout');
            resolve();
        }, 3000);
    });
}

/* =========================================
   4. CHART CONFIG & RENDERER
   ========================================= */

function getChartConfig(indicator, labels, dataPoints) {
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) return null;

    if (indicator.name === 'Trade Deficit' && indicator.imports && indicator.exports) {
        return getTradeDeficitConfig(indicator, labels, dataPoints);
    }
    if (indicator.category === 'Prediction Markets' || indicator.bps_probabilities) {
        return getPredictionMarketConfig(indicator, labels, dataPoints);
    }
    return getLineChartConfig(indicator, labels, dataPoints);
}

function getBaseOptions(indicator) {
    const colors = getLiveChartColors();
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 400;
    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: 0, autoPadding: false },
        animation: { duration: 600, easing: 'easeInOutQuart' },
        plugins: {
            legend: {
                display: false,
                labels: {
                    color: colors.TEXT,
                    font: { size: isMobile ? 9 : 10 },
                    padding: 6,
                    boxWidth: 10,
                    useBorderRadius: true,
                    borderRadius: 4
                }
            },
            title: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: colors.PRIMARY,
                borderWidth: 1,
                padding: 10,
                titleFont: { size: 11 },
                bodyFont: { size: 11 },
                boxPadding: 5,
                callbacks: {
                    title: function (context) {
                        if (context.length > 0) return context[0].label;
                        return '';
                    },
                    label: function (context) {
                        if (context.parsed.y !== null) {
                            const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(context.parsed.y);
                            return context.dataset.label ? `${context.dataset.label}: ${formatted}` : formatted;
                        }
                        return '';
                    }
                }
            }
        },
        scales: {
            x: {
                display: true,
                grid: { display: false, drawBorder: false },
                ticks: {
                    display: true,
                    font: { size: 9 },
                    color: colors.TEXT,
                    maxRotation: 0,
                    autoSkip: true,
                    maxTicksLimit: 8
                }
            },
            y: {
                display: true,
                beginAtZero: false,
                grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
                ticks: { display: false },
                position: 'right'
            }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
    };
}

function getLineChartConfig(indicator, labels, dataPoints) {
     // Extract year-nested data if available
     const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
     const yearKeys = Object.keys(indicator)
         .filter(key => /^\d{4}$/.test(key))
         .map(key => parseInt(key))
         .sort((a, b) => b - a); // Sort years descending

     // If year-nested data exists, rebuild dataPoints to include it
     if (yearKeys.length > 0) {
         const dataMap = {};
         
         // First add flat structure data
         months.forEach((month, index) => {
             const value = indicator[month];
             if (value && value.toString().trim()) {
                 const numValue = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
                 if (!isNaN(numValue)) {
                     dataMap[`${null}-${index}`] = {
                         month: month,
                         monthIndex: index,
                         value: numValue,
                         year: null
                     };
                 }
             }
         });
         
         // Then add year-nested data (overwrites flat data for same month if present)
         for (const year of yearKeys) {
             const yearData = indicator[year];
             months.forEach((month, index) => {
                 const value = yearData[month];
                 if (value && value.toString().trim()) {
                     const numValue = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
                     if (!isNaN(numValue)) {
                         dataMap[`${year}-${index}`] = {
                             month: month,
                             monthIndex: index,
                             value: numValue,
                             year: year
                         };
                     }
                 }
             });
         }
         
         // Sort by year ascending (older first), then by month index ascending
         const sortedData = Object.values(dataMap).sort((a, b) => {
             if (a.year !== b.year) {
                 const yearA = a.year !== null ? a.year : 2025;
                 const yearB = b.year !== null ? b.year : 2025;
                 return yearA - yearB;
             }
             return a.monthIndex - b.monthIndex;
         });
         
         // Rebuild labels and dataPoints
         labels = sortedData.map(item => item.month.slice(0, 3));
         dataPoints = sortedData.map(item => item.value);
     }

     const colors = getLiveChartColors();
     const config = {
         type: 'line',
         data: {
             labels: labels,
             datasets: [{
                 label: indicator.name || 'Data',
                 data: dataPoints,
                 borderColor: colors.PRIMARY,
                 backgroundColor: colors.PRIMARY_FILL,
                 borderWidth: CHART_CONFIG.BORDER_WIDTH,
                 tension: CHART_CONFIG.TENSION,
                 fill: true,
                 pointBackgroundColor: colors.PRIMARY,
                 pointBorderColor: '#fff',
                 pointBorderWidth: 1.5,
                 pointRadius: 3,
                 pointHoverRadius: 5
             }]
         },
         options: getBaseOptions(indicator)
     };

     if (INDICATOR_CONFIGS[indicator.name]) {
         const cfg = INDICATOR_CONFIGS[indicator.name];
         config.options.scales.y.min = cfg.yMin;
         config.options.scales.y.max = cfg.yMax;
     }
     return config;
}

function getTradeDeficitConfig(indicator, labels, dataPoints) {
    // Trade Deficit chart with imports (red bars) and exports (green bars)
    // Use the same extraction logic as charts.js for consistency
    const colors = getLiveChartColors();
    
    // Parse imports and exports from the indicator data
    const imports = indicator.imports;
    const exportsData = indicator.exports;
    
    if (!imports || !exportsData) {
        // Fallback to line chart if no imports/exports data
        return getLineChartConfig(indicator, labels, dataPoints);
    }
    
    // Extract values for each month - use same MONTHS order as charts.js
    const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const importValues = [];
    const exportValues = [];
    const deficitValues = [];
    const chartLabels = [];
    
    // Helper function to extract numeric value (same as utils.js)
    function extractNumericValue(value) {
        if (!value || value === '' || value.startsWith('TBD') || value === '—') return null;

        // First, determine the scale (M = millions, B = billions)
        let scale = 1;
        if (value.includes('M')) scale = 1000000;
        else if (value.includes('B')) scale = 1000000000;

        let cleanValue = value.toString()
            .replace(/\$/g, '')
            .replace(/^\+/g, '')
            .replace(/[A-Za-z]/g, '')
            .trim();

        // Remove commas as thousand separators (not decimal separators)
        cleanValue = cleanValue.replace(/,/g, '');

        const num = parseFloat(cleanValue);
        if (isNaN(num)) return null;
        
        return num * scale;
    }
    
    // Helper function to check if data is valid
    function isValidData(value) {
        return value !== null && value !== undefined && value !== '' && value !== '—' && value !== 'TBD';
    }
    
    // Extract from flat structure (months)
    MONTHS.forEach((month, index) => {
        const importValue = imports[month];
        const exportValue = exportsData[month];
        const deficitValue = indicator[month];
        
        if (isValidData(importValue) && isValidData(exportValue) && isValidData(deficitValue)) {
            const numImport = extractNumericValue(importValue);
            const numExport = extractNumericValue(exportValue);
            const numDeficit = extractNumericValue(deficitValue);
            
            if (numImport !== null && numExport !== null && numDeficit !== null) {
                chartLabels.push(MONTH_LABELS[index]);
                importValues.push(numImport);
                exportValues.push(numExport);
                deficitValues.push(numDeficit);
            }
        }
    });
    
    // Add year-nested data (e.g., 2026 data)
    const yearKeys = Object.keys(indicator).filter(k => k.match(/^20\d{2}$/));
    const yearNestedPoints = [];
    
    for (const year of yearKeys) {
        const yearData = indicator[year];
        if (!yearData || typeof yearData !== 'object') continue;
        const importsYear = imports[year];
        const exportsYear = exportsData[year];
        if (!importsYear || !exportsYear) continue;
        
        MONTHS.forEach((month, index) => {
            const importValue = importsYear[month];
            const exportValue = exportsYear[month];
            const deficitValue = yearData[month];
            
            if (isValidData(importValue) && isValidData(exportValue) && isValidData(deficitValue)) {
                const numImport = extractNumericValue(importValue);
                const numExport = extractNumericValue(exportValue);
                const numDeficit = extractNumericValue(deficitValue);
                
                if (numImport !== null && numExport !== null && numDeficit !== null) {
                    yearNestedPoints.push({ year, monthIndex: index, label: MONTH_LABELS[index], numImport, numExport, numDeficit });
                }
            }
        });
    }
    
    // Sort and add up to 2 latest year-nested points
    yearNestedPoints.sort((a, b) => a.year !== b.year ? b.year - a.year : b.monthIndex - a.monthIndex);
    yearNestedPoints.slice(0, 2).reverse().forEach(p => {
        chartLabels.push(p.label);
        importValues.push(p.numImport);
        exportValues.push(p.numExport);
        deficitValues.push(p.numDeficit);
    });
    
    return {
        type: 'chartjs-mixed',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Imports',
                    data: importValues,
                    type: 'bar',
                    backgroundColor: 'rgba(255, 107, 107, 0.7)',
                    borderColor: '#FF6B6B',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Exports',
                    data: exportValues,
                    type: 'bar',
                    backgroundColor: 'rgba(81, 207, 102, 0.7)',
                    borderColor: '#51CF66',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    label: 'Deficit',
                    data: deficitValues,
                    type: 'line',
                    borderColor: '#2C5F5A',
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y1',
                    pointBackgroundColor: '#2C5F5A',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1.5,
                    pointRadius: 4
                }
            ]
        },
        options: {
            ...getBaseOptions(indicator),
            plugins: {
                ...getBaseOptions(indicator).plugins,
                legend: {
                    display: true,
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        font: { size: 9 },
                        padding: 6,
                        boxWidth: 10,
                        useBorderRadius: true,
                        borderRadius: 4
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: { display: false, drawBorder: false },
                    ticks: {
                        display: true,
                        font: { size: 9 },
                        color: 'rgba(0, 0, 0, 0.4)',
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: false,
                    grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
                    ticks: { display: false },
                    title: { display: false }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: false,
                    grid: { display: false },
                    ticks: { display: false },
                    title: { display: false }
                }
            }
        }
    };
}

function getPredictionMarketConfig(indicator, labels, dataPoints) {
    const colors = getLiveChartColors();
    return {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Probability (%)',
                data: dataPoints,
                backgroundColor: [colors.PRIMARY, colors.SECONDARY, colors.ACCENT, colors.ERROR],
                borderWidth: 1
            }]
        },
        options: {
            ...getBaseOptions(indicator),
            scales: {
                ...getBaseOptions(indicator).scales,
                y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false }, ticks: { display: false } }
            }
        }
    };
}

async function renderFinancialCharts() {
    const containers = document.querySelectorAll('[data-indicator]:not([data-rendered])');
    if (containers.length === 0) return;

    // Lazy load charts using IntersectionObserver
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(async (entry) => {
            if (entry.isIntersecting) {
                const container = entry.target;
                observer.unobserve(container);
                await renderSingleChart(container);
            }
        });
    }, { rootMargin: '50px' });

    containers.forEach(container => observer.observe(container));
}

async function renderSingleChart(container) {
    if (container.dataset.rendered) return;

    if (!window.Chart) {
        if (window.loadChartJS) {
            await window.loadChartJS();
        } else {
            return;
        }
    }

    try {
        // Cache the data fetch
        if (!window._financialsData) {
            const response = await fetch('json/financials-data.json');
            if (!response.ok) return;
            window._financialsData = await response.json();
        }
        const data = window._financialsData;

        const canvasId = container.getAttribute('data-chart-id');
        const indicatorName = container.getAttribute('data-indicator');
        const canvas = document.getElementById(canvasId);
        const indicator = data.indices?.find(i => i.name === indicatorName);

        if (canvas && indicator) {
            // Simplified extraction
            let dataPoints = [], labels = [];
            if (indicator.bps_probabilities) {
                labels = Object.keys(indicator.bps_probabilities);
                dataPoints = Object.values(indicator.bps_probabilities).map(v => parseFloat(v));
            } else {
                const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
                months.forEach(m => {
                    if (indicator[m]) {
                        const val = parseFloat(indicator[m].replace(/[^0-9.-]/g, ''));
                        if (!isNaN(val)) {
                            dataPoints.push(val);
                            labels.push(m.slice(0, 3));
                        }
                    }
                });
            }

            const config = getChartConfig(indicator, labels, dataPoints);
            if (config) {
                // Destroy existing chart if present
                if (canvas._chart instanceof window.Chart) {
                    canvas._chart.destroy();
                }
                const chart = new window.Chart(canvas.getContext('2d'), config);
                canvas._chart = chart;
                container.dataset.rendered = 'true';
            }
        }
    } catch (e) { console.error(e); }
}

/* =========================================
   5. MAIN APP LOGIC
   ========================================= */

let state = {
    feed: null,
    allPosts: [],
    loadedCount: 0,
    expandingCard: null,
    expandedCardIndex: null
};

function sortPostsNewestFirst(posts) {
    return [...posts].sort((a, b) => {
        const aTime = Date.parse(a?.date || '');
        const bTime = Date.parse(b?.date || '');
        const aValid = Number.isFinite(aTime);
        const bValid = Number.isFinite(bTime);

        if (aValid && bValid) return bTime - aTime;
        if (aValid) return -1;
        if (bValid) return 1;
        return 0;
    });
}

function saveExpandedCardState(index) {
    if (index !== null) {
        sessionStorage.setItem('expandedCardIndex', index);
    } else {
        sessionStorage.removeItem('expandedCardIndex');
    }
}

function getExpandedCardState() {
    const index = sessionStorage.getItem('expandedCardIndex');
    return index !== null ? parseInt(index) : null;
}



async function injectBadgeStyles() {
    if (document.getElementById('badge-component-styles')) return; // Already injected
    
    const badgeStyles = `
.mom-badge {
  border: 1px solid rgba(0, 0, 0, 0.16);
  border-radius: 10px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.16), rgba(255, 255, 255, 0.03));
  color: var(--text-primary);
  padding: 2px 6px 1px 5px;
  display: inline-block;
  white-space: nowrap;
  font-size: 0.78rem;
  font-weight: 700;
  margin-left: 6px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.28), inset 0 -1px 0 rgba(0, 0, 0, 0.14), 0 1px 2px rgba(0, 0, 0, 0.16), 0 3px 8px rgba(0, 0, 0, 0.1);
}

.mom-badge.change-positive {
  background: linear-gradient(180deg, rgba(16, 185, 129, 0.24), rgba(16, 185, 129, 0.09));
  border-color: rgba(16, 185, 129, 0.5);
}

.mom-badge.change-negative {
  background: linear-gradient(180deg, rgba(239, 68, 68, 0.24), rgba(239, 68, 68, 0.09));
  border-color: rgba(239, 68, 68, 0.55);
}

.mom-badge.change-neutral {
  background: linear-gradient(180deg, rgba(107, 114, 128, 0.24), rgba(107, 114, 128, 0.09));
  border-color: rgba(107, 114, 128, 0.5);
}
    `;
    
    const style = document.createElement('style');
    style.id = 'badge-component-styles';
    style.textContent = badgeStyles;
    document.head.appendChild(style);
}

async function initPosts() {
    await injectBadgeStyles();
    
    state.feed = document.getElementById('announcements-container');
    if (!state.feed) return;

    // Native details element handles expand/collapse automatically
    // Track expanded state in sessionStorage
    state.feed.addEventListener('toggle', (e) => {
        if (e.target.classList.contains('announcement-card')) {
            if (e.target.hasAttribute('open')) {
                // Find the index of this card
                const cards = Array.from(state.feed.querySelectorAll('.announcement-card'));
                const cardIndex = cards.indexOf(e.target);
                saveExpandedCardState(cardIndex);
                e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                saveExpandedCardState(null);
            }
        }
    });

    await waitForMarked();
    // state.feed.innerHTML = ''; // REMOVED: Prevent flicker by keeping skeletons until data is ready

    try {
        // Load both posts.json and articles.json
        const postsJson = window.postsPromise ? await window.postsPromise : await (await fetch(CONFIG.POSTS_JSON_URL)).json();
        let posts = Array.isArray(postsJson) ? sortPostsNewestFirst(postsJson) : [];
        
        // Also load articles.json and merge
        try {
            const articlesJson = await (await fetch(CONFIG.ARTICLES_JSON_URL)).json();
            if (Array.isArray(articlesJson)) {
                // Convert articles to posts format - they use 'id' to reference 'article/{id}.md'
                const articlesAsPosts = articlesJson.map(article => ({
                    ...article,
                    file: `article/${article.id}.md`,
                    // Use summary as snippet if available
                    snippet: article.summary || ''
                }));
                // Merge and sort by date
                posts = sortPostsNewestFirst([...posts, ...articlesAsPosts]);
            }
        } catch (articlesErr) {
            console.warn('Could not load articles.json:', articlesErr);
        }
        
        state.allPosts = posts;
        await loadAndRenderPosts(state.allPosts);
        startTimeUpdates();
    } catch (err) {
        console.error(err);
        state.feed.innerHTML = '<div class="error-state">Unable to load content.</div>';
    }

    initIndexFilters();
}

function extractCardData(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Extract icon FIRST (before removing h3, in case icon is inside heading)
    const lucideIcon = temp.querySelector('[data-lucide]');
    const iconName = lucideIcon ? lucideIcon.getAttribute('data-lucide') : '';

    // Extract title (first h3 or strong/bold header)
    const h3 = temp.querySelector('h3, h1, h2, b, strong');
    let title = h3 ? h3.innerText.trim() : '';
    if (h3) h3.remove();

    // Do not extract image - keep all images in post content
    const imageUrl = '';

    // Extract snippet (first paragraph text with improved truncation)
    const p = temp.querySelector('p');
    let snippet = p ? p.innerText.trim() : '';
    if (snippet.length > 160) {
        snippet = snippet.substring(0, 157).replace(/\s+\S*$/, '') + '...';
    }
    // Remove the first paragraph from content to avoid duplication in expanded view
    if (p) p.remove();

    return {
        title: title || 'Journal Update',
        image: imageUrl,
        icon: iconName,
        snippet: snippet,
        content: temp.innerHTML
    };
}

async function loadAndRenderPosts(posts) {
    if (!posts.length) return;

    // Fetch content
    const postsWithContent = await Promise.all(posts.map(async post => {
        if (!post.file) return null;
        const parsed = await parseMarkdownFile(post.file);
        const raw = parsed && typeof parsed === 'object' && 'content' in parsed ? parsed.content : String(parsed);
        let content = raw;
        if (content.includes('{{badge:')) content = await processBadges(content);
        if (content.includes('{{chart:')) content = processCharts(content);
        content = wrapImagesInLinks(content);
        content = wrapTablesForMobile(content);
        const metadata = (parsed && typeof parsed === 'object' && parsed.metadata) ? parsed.metadata : {};
        const category = (metadata.category || 'posts').toLowerCase().trim();
        
        // Update state.allPosts with category
        const statePost = state.allPosts.find(p => p.file === post.file);
        if (statePost) statePost.category = category;
        
        return { ...post, rawContent: content, category };
    }));

    const valid = postsWithContent.filter(p => p && p.rawContent);

    const html = valid.map(p => {
        const data = extractCardData(p.rawContent);
        const iconHtml = data.icon ? `<i data-lucide="${data.icon}" class="card-icon"></i>` :
            `<i data-lucide="bookmark" class="card-icon"></i>`;
        
        // Highlight Orhan Lamor post
        const isOrhanPost = data.title.toLowerCase().includes('orhan') || p.file.includes('golden-ticket');
        const highlightClass = isOrhanPost ? 'highlighted' : '';

        return `
            <details class="announcement-card ${data.image ? 'has-image' : ''} ${highlightClass}" data-date="${p.date}" data-category="${p.category || 'posts'}">
                <summary>
                    <div class="card-header-row">
                        <div class="card-meta">
                            ${iconHtml}
                            <time class="post-time">${formatTimeAgo(p.date)}</time>
                        </div>
                    </div>
                    <div class="card-main">
                        <div class="card-content-side">
                            <h3 class="card-title">${data.title}</h3>
                            <p class="card-snippet">${data.snippet}</p>
                        </div>
                        ${data.image ? `
                            <div class="card-image-side">
                                <img src="${data.image}" alt="${data.title}">
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-footer">
                        <span class="read-more-btn">Read full update <i data-lucide="chevron-right"></i></span>
                    </div>
                </summary>
                <div class="card-expanded-content">
                    <div class="content-wrapper">
                        <div class="content">${data.content}</div>
                    </div>
                </div>
            </details>
        `;
    }).join('');

    if (state.loadedCount === 0) {
        state.feed.innerHTML = html;
    } else {
        state.feed.insertAdjacentHTML('beforeend', html);
    }

    state.loadedCount += valid.length;

    renderFinancialCharts();
    if (window.initializeLucideIcons) window.initializeLucideIcons();
    else if (window.lucide?.createIcons) window.lucide.createIcons();
    
    // Re-apply index filter after load more so new cards respect current filter
    const filterContainer = document.getElementById('index-filters');
    if (filterContainer) {
        const activeBtn = filterContainer.querySelector('.filter-btn.active');
        const category = activeBtn ? activeBtn.dataset.category : 'all';
        if (category !== 'all') {
            state.feed.querySelectorAll('.announcement-card').forEach(card => {
                const cardCategory = card.dataset.category || 'posts';
                card.style.display = cardCategory === category ? '' : 'none';
            });
        }
    }

    // Restore expanded card state if available
    const expandedIndex = getExpandedCardState();
    if (expandedIndex !== null) {
        const cards = Array.from(state.feed.querySelectorAll('.announcement-card'));
        const cardToExpand = cards[expandedIndex];
        if (cardToExpand) {
            // Use setTimeout to ensure rendering is complete
            setTimeout(() => {
                cardToExpand.setAttribute('open', '');
                cardToExpand.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }
}

function showLoadMoreButton() {
    const remaining = state.allPosts.length - state.loadedCount;
    if (remaining <= 0) return;
    
    const existingBtn = document.getElementById('load-more-btn');
    if (existingBtn) existingBtn.remove();
    
    const btn = document.createElement('button');
    btn.id = 'load-more-btn';
    btn.className = 'load-more-btn';
    btn.innerHTML = `
        <span>Dopamine</span>
        <i data-lucide="chevron-down"></i>
        <span class="remaining-count">(${remaining} remaining)</span>
    `;
    btn.onclick = loadMorePosts;
    
    state.feed.insertAdjacentElement('afterend', btn);
    
    // Initialize Lucide icons for the new button
    if (window.initializeLucideIcons) window.initializeLucideIcons();
    else if (window.lucide?.createIcons) window.lucide.createIcons();
}

function hideLoadMoreButton() {
    const btn = document.getElementById('load-more-btn');
    if (btn) btn.remove();
}

async function loadMorePosts() {
    const remaining = state.allPosts.length - state.loadedCount;
    if (remaining <= 0) {
        hideLoadMoreButton();
        return;
    }
    
    const btn = document.getElementById('load-more-btn');
    if (btn) {
        btn.innerHTML = `
            <span>Loading...</span>
            <i data-lucide="loader"></i>
        `;
        btn.disabled = true;
        
        // Re-initialize Lucide icons for the loading state
        if (window.initializeLucideIcons) window.initializeLucideIcons();
        else if (window.lucide?.createIcons) window.lucide.createIcons();
    }
    
    const nextBatch = state.allPosts.slice(state.loadedCount, state.loadedCount + CONFIG.BATCH_SIZE);
    await loadAndRenderPosts(nextBatch);
    
    const stillRemaining = state.allPosts.length - state.loadedCount;
    if (stillRemaining > 0) {
        showLoadMoreButton();
    } else {
        hideLoadMoreButton();
    }
}

function initIndexFilters() {
    const filterContainer = document.getElementById('index-filters');
    if (!filterContainer || filterContainer._filterHandler) return;
    filterContainer._filterHandler = true;
    filterContainer.addEventListener('click', function (e) {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        e.preventDefault();
        filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const category = btn.dataset.category;
        document.querySelectorAll('.announcement-card').forEach(card => {
            const cardCategory = card.dataset.category || 'posts';
            card.style.display = (category === 'all' || cardCategory === category) ? '' : 'none';
        });
    });
}

// Init
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPosts);
else initPosts();
