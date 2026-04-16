// Posts Loader - SOLID Architecture
// SRP: Each module has a single responsibility
// OCP: Processor registry for extensible content transformations
// ISP: Focused interfaces per module
// DIP: Modules depend on abstractions (Services) not concrete implementations

/* =========================================
   1. CONFIG & CONSTANTS
   ========================================= */

const PostConfig = {
    INITIAL_LOAD: 10,
    BATCH_SIZE: 10,
    POSTS_JSON_URL: 'json/posts.json',
    ARTICLES_JSON_URL: 'json/articles.json'
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
   2. Sanitizer Module (SRP: HTML sanitization only)
   ========================================= */

const Sanitizer = (function () {
    async function ensure() {
        if (window.DOMPurify) return;
        if (typeof window.loadDOMPurify === 'function') {
            try { await window.loadDOMPurify(); } catch (error) {
                console.warn('DOMPurify load failed, using fallback sanitizer', error);
            }
        }
    }

    function sanitize(html) {
        if (!html) return '';

        if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
            return window.DOMPurify.sanitize(html, {
                USE_PROFILES: { html: true },
                FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form']
            });
        }

        return fallbackSanitize(html);
    }

    function fallbackSanitize(html) {
        const template = document.createElement('template');
        template.innerHTML = html;

        template.content.querySelectorAll('script, style, iframe, object, embed, form').forEach(node => node.remove());

        template.content.querySelectorAll('*').forEach(node => {
            Array.from(node.attributes).forEach(attr => {
                const name = attr.name.toLowerCase();
                const value = attr.value.trim();

                if (name.startsWith('on')) { node.removeAttribute(attr.name); return; }
                if ((name === 'href' || name === 'src' || name === 'xlink:href') && /^javascript:/i.test(value)) {
                    node.removeAttribute(attr.name);
                }
            });
        });

        return template.innerHTML;
    }

    return { ensure, sanitize };
})();

/* =========================================
   3. Markdown Module (SRP: Markdown parsing only)
   ========================================= */

const MarkdownParser = (function () {
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

    function parseContent(md) {
        const { metadata, contentMd } = parseFrontmatter(md);
        let html = contentMd;
        if (window.marked && typeof window.marked.parse === 'function') {
            try { html = window.marked.parse(contentMd); } catch (e) {
                console.error('Markdown parse error:', e);
            }
        }
        return { content: html, metadata };
    }

    async function fetchAndParse(fileUrl) {
        try {
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const md = await response.text();
            return parseContent(md);
        } catch (err) {
            console.error('Failed to fetch', fileUrl, err);
            return { content: '', metadata: {} };
        }
    }

    function waitForMarked() {
        return new Promise(resolve => {
            if (window.marked) return resolve();
            if (typeof window.loadMarked === 'function') {
                window.loadMarked().then(() => resolve());
                return;
            }
            const check = setInterval(() => {
                if (window.marked) { clearInterval(check); resolve(); }
            }, 100);
            setTimeout(() => { clearInterval(check); console.warn('Marked.js load timeout'); resolve(); }, 3000);
        });
    }

    return { parseFrontmatter, parseContent, fetchAndParse, waitForMarked };
})();

/* =========================================
   4. Content Processors (OCP: extensible registry)
   ========================================= */

const ContentProcessors = (function () {
    const processors = [];

    function register(processor) {
        processors.push(processor);
    }

    async function processAll(html) {
        let result = html;
        for (const processor of processors) {
            if (processor.test(result)) {
                result = await processor.transform(result);
            }
        }
        return result;
    }

    return { register, processAll };
})();

// --- Badge Processor (SRP) ---

ContentProcessors.register({
    name: 'badges',
    test: (html) => html.includes('{{badge:'),
    transform: async (html) => BadgeProcessor.processBadges(html)
});

// --- Chart Processor (SRP) ---

ContentProcessors.register({
    name: 'charts',
    test: (html) => html.includes('{{chart:'),
    transform: async (html) => {
        const chartRegex = /\{\{chart:([^}]+)\}\}/g;
        return html.replace(chartRegex, (match, indicatorName) => {
            const name = indicatorName.trim();
            const canvasId = name.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-' + Date.now() + Math.floor(Math.random() * 1000);
            return `<div class="chart-container" data-chart-id="${canvasId}" data-indicator="${name}"><canvas id="${canvasId}"></canvas></div>`;
        });
    }
});

// --- Image Link Processor (SRP) ---

ContentProcessors.register({
    name: 'image-links',
    test: (html) => html.includes('<img'),
    transform: async (html) => {
        const imgRegex = /<img([^>]*?)src="([^"]+)"([^>]*?)alt="([^"]+)"([^>]*?)>/g;
        return html.replace(imgRegex, (match, before, src, after, alt, end) => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = html.substring(Math.max(0, html.indexOf(match) - 100), html.indexOf(match) + match.length + 100);
            if (tempDiv.querySelector('a img')) return match;

            const slug = alt.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            return `<a href="media.html#${slug}"><img${before}src="${src}"${after}alt="${alt}"${end}></a>`;
        });
    }
});

// --- Table Wrapper Processor (SRP) ---

ContentProcessors.register({
    name: 'table-wrapper',
    test: (html) => html.includes('<table'),
    transform: async (html) => {
        const tableRegex = /<table([^>]*)>([\s\S]*?)<\/table>/g;
        return html.replace(tableRegex, (match) => `<div class="table-wrapper">${match}</div>`);
    }
});

/* =========================================
   5. Badge Processor Module (SRP: badge calculation only)
   ========================================= */

const BadgeProcessor = (function () {
    async function ensureFinancialsData() {
        if (!window._financialsData) {
            try {
                const response = await fetch('json/financials-data.json');
                if (response.ok) window._financialsData = await response.json();
            } catch (e) {
                console.error('Failed to load financials data for badges:', e);
                return null;
            }
        }
        return window._financialsData;
    }

    function findLatestValue(indicator) {
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const yearKeys = Object.keys(indicator).filter(k => /^\d{4}$/.test(k)).sort((a, b) => b - a);

        let current = null, currentMonth = -1, currentYear = null;

        for (const year of yearKeys) {
            if (!indicator[year] || typeof indicator[year] !== 'object') continue;
            for (let i = months.length - 1; i >= 0; i--) {
                const rawVal = indicator[year][months[i]];
                if (!rawVal) continue;
                const val = parseFloat(String(rawVal).replace(/[$,%KM]/g, ''));
                if (!isNaN(val)) { current = val; currentMonth = i; currentYear = year; break; }
            }
            if (current !== null) break;
        }

        if (current === null) {
            for (let i = months.length - 1; i >= 0; i--) {
                const rawVal = indicator[months[i]];
                if (!rawVal) continue;
                const val = parseFloat(String(rawVal).replace(/[$,%KM]/g, ''));
                if (!isNaN(val)) { current = val; currentMonth = i; currentYear = null; break; }
            }
        }

        return { current, currentMonth, currentYear, months };
    }

    function findPreviousValue(indicator, current, currentMonth, currentYear, months) {
        if (current === null || currentMonth < 0) return null;

        if (currentYear === null) {
            if (currentMonth > 0) {
                const rawVal = indicator[months[currentMonth - 1]];
                if (rawVal) { const val = parseFloat(String(rawVal).replace(/[$,%KM]/g, '')); if (!isNaN(val)) return val; }
            }
        } else {
            if (currentMonth > 0) {
                const rawVal = indicator[currentYear][months[currentMonth - 1]];
                if (rawVal) { const val = parseFloat(String(rawVal).replace(/[$,%KM]/g, '')); if (!isNaN(val)) return val; }
            } else if (currentMonth === 0) {
                const rawVal = indicator['december'];
                if (rawVal) { const val = parseFloat(String(rawVal).replace(/[$,%KM]/g, '')); if (!isNaN(val)) return val; }
                const prevYear = String(parseInt(currentYear) - 1);
                if (indicator[prevYear] && indicator[prevYear]['december']) {
                    const rawVal2 = indicator[prevYear]['december'];
                    const val = parseFloat(String(rawVal2).replace(/[$,%KM]/g, ''));
                    if (!isNaN(val)) return val;
                }
            }
        }
        return null;
    }

    async function processBadges(html) {
        const badgeRegex = /\{\{badge:([^}]+)\}\}/g;
        const data = await ensureFinancialsData();
        if (!data || !data.indices) return html;

        return html.replace(badgeRegex, (match, indicatorName) => {
            const name = indicatorName.trim();
            const indicator = data.indices.find(i => i.name === name);
            if (!indicator) return match;

            const { current, currentMonth, currentYear, months } = findLatestValue(indicator);
            const previous = findPreviousValue(indicator, current, currentMonth, currentYear, months);

            if (current === null || previous === null || previous === 0) return match;

            const change = ((current - previous) / previous) * 100;
            const cssClass = change > 0 ? 'change-positive' : change < 0 ? 'change-negative' : 'change-neutral';
            const formatted = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

            return `<span class="mom-badge ${cssClass}">${formatted}</span>`;
        });
    }

    return { processBadges };
})();

/* =========================================
   6. Time Formatter (SRP: time formatting only)
   ========================================= */

const TimeFormatter = (function () {
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

    return { formatTimeAgo, startTimeUpdates };
})();

/* =========================================
   7. Post Card Renderer (SRP: card HTML generation)
   ========================================= */

const PostCardRenderer = (function () {
    function extractCardData(html) {
        const temp = document.createElement('div');
        temp.innerHTML = html;

        const lucideIcon = temp.querySelector('[data-lucide]');
        const iconName = lucideIcon ? lucideIcon.getAttribute('data-lucide') : '';

        const h3 = temp.querySelector('h3, h1, h2, b, strong');
        let title = h3 ? h3.innerText.trim() : '';
        if (h3) h3.remove();

        const p = temp.querySelector('p');
        let snippet = p ? p.innerText.trim() : '';
        if (snippet.length > 160) {
            snippet = snippet.substring(0, 157).replace(/\s+\S*$/, '') + '...';
        }
        if (p) p.remove();

        return {
            title: title || 'Journal Update',
            image: '',
            icon: iconName,
            snippet: snippet,
            content: temp.innerHTML
        };
    }

    function renderCard(post, rawContent) {
        const data = extractCardData(rawContent);
        const iconHtml = data.icon ? `<i data-lucide="${data.icon}" class="card-icon"></i>` :
            `<i data-lucide="bookmark" class="card-icon"></i>`;

        const isOrhanPost = data.title.toLowerCase().includes('orhan') || post.file.includes('golden-ticket');
        const highlightClass = isOrhanPost ? 'highlighted' : '';

        return `
            <details class="announcement-card ${data.image ? 'has-image' : ''} ${highlightClass}" data-date="${post.date}" data-category="${post.category || 'posts'}">
                <summary>
                    <div class="card-header-row">
                        <div class="card-meta">
                            ${iconHtml}
                            <time class="post-time">${TimeFormatter.formatTimeAgo(post.date)}</time>
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
    }

    return { extractCardData, renderCard };
})();

/* =========================================
   8. Chart Renderer (SRP: chart rendering from posts)
   ========================================= */

const PostChartRenderer = (function () {
    function getLiveChartColors() {
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
                legend: { display: false, labels: { color: colors.TEXT, font: { size: isMobile ? 9 : 10 }, padding: 6, boxWidth: 10, useBorderRadius: true, borderRadius: 4 } },
                title: { display: false },
                tooltip: {
                    mode: 'index', intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff',
                    borderColor: colors.PRIMARY, borderWidth: 1, padding: 10,
                    titleFont: { size: 11 }, bodyFont: { size: 11 }, boxPadding: 5,
                    callbacks: {
                        title: (context) => context.length > 0 ? context[0].label : '',
                        label: (context) => {
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
                x: { display: true, grid: { display: false, drawBorder: false }, ticks: { display: true, font: { size: 9 }, color: colors.TEXT, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
                y: { display: true, beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false }, ticks: { display: false }, position: 'right' }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        };
    }

    function getChartConfig(indicator, labels, dataPoints) {
        if (!Array.isArray(dataPoints) || dataPoints.length === 0) return null;
        if (indicator.name === 'Trade Deficit' && indicator.imports && indicator.exports) return getTradeDeficitConfig(indicator, labels, dataPoints);
        if (indicator.name === 'Monthly Budget Deficit' && indicator.receipts && indicator.outlays) return getBudgetDeficitConfig(indicator, labels, dataPoints);
        if (indicator.category === 'Prediction Markets' || indicator.bps_probabilities || indicator.yes_probability || indicator.candidates) return getPredictionMarketConfig(indicator, labels, dataPoints);
        return getLineChartConfig(indicator, labels, dataPoints);
    }

    function getLineChartConfig(indicator, labels, dataPoints) {
        const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const yearKeys = Object.keys(indicator).filter(key => /^\d{4}$/.test(key)).map(key => parseInt(key)).sort((a, b) => b - a);

        if (yearKeys.length > 0) {
            const dataMap = {};
            months.forEach((month, index) => {
                const value = indicator[month];
                if (value && value.toString().trim()) {
                    const numValue = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
                    if (!isNaN(numValue)) dataMap[`${null}-${index}`] = { month, monthIndex: index, value: numValue, year: null };
                }
            });
            for (const year of yearKeys) {
                const yearData = indicator[year];
                months.forEach((month, index) => {
                    const value = yearData[month];
                    if (value && value.toString().trim()) {
                        const numValue = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
                        if (!isNaN(numValue)) dataMap[`${year}-${index}`] = { month, monthIndex: index, value: numValue, year };
                    }
                });
            }
            const sortedData = Object.values(dataMap).sort((a, b) => {
                if (a.year !== b.year) { return (a.year || 2025) - (b.year || 2025); }
                return a.monthIndex - b.monthIndex;
            });
            labels = sortedData.map(item => item.month.slice(0, 3));
            dataPoints = sortedData.map(item => item.value);
        }

        const colors = getLiveChartColors();
        return {
            type: 'line',
            data: { labels, datasets: [{ label: indicator.name || 'Data', data: dataPoints, borderColor: colors.PRIMARY, backgroundColor: colors.PRIMARY_FILL, borderWidth: CHART_CONFIG.BORDER_WIDTH, tension: CHART_CONFIG.TENSION, fill: true, pointBackgroundColor: colors.PRIMARY, pointBorderColor: '#fff', pointBorderWidth: 1.5, pointRadius: 3, pointHoverRadius: 5 }] },
            options: getBaseOptions(indicator)
        };
    }

    function getTradeDeficitConfig(indicator, labels, dataPoints) {
        const colors = getLiveChartColors();
        const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        function extractNumericValue(value) {
            if (!value || value === '' || value.startsWith('TBD') || value === '—') return null;
            let cleanValue = value.toString().replace(/\$/g, '').replace(/^\+/g, '').replace(/[A-Za-z]/g, '').trim().replace(/,/g, '');
            return parseFloat(cleanValue) || null;
        }

        function isValidData(value) { return value !== null && value !== undefined && value !== '' && value !== '—' && value !== 'TBD'; }

        const importValues = [], exportValues = [], deficitValues = [], chartLabels = [];

        MONTHS.forEach((month, index) => {
            if (isValidData(indicator.imports[month]) && isValidData(indicator.exports[month]) && isValidData(indicator[month])) {
                const nI = extractNumericValue(indicator.imports[month]);
                const nE = extractNumericValue(indicator.exports[month]);
                const nD = extractNumericValue(indicator[month]);
                if (nI !== null && nE !== null && nD !== null) {
                    chartLabels.push(MONTH_LABELS[index]);
                    importValues.push(nI); exportValues.push(nE); deficitValues.push(nD);
                }
            }
        });

        const yearKeys = Object.keys(indicator).filter(k => k.match(/^20\d{2}$/));
        const yearNestedPoints = [];
        for (const year of yearKeys) {
            const yearData = indicator[year];
            if (!yearData || typeof yearData !== 'object') continue;
            const importsYear = indicator.imports[year];
            const exportsYear = indicator.exports[year];
            if (!importsYear || !exportsYear) continue;
            MONTHS.forEach((month, index) => {
                if (isValidData(importsYear[month]) && isValidData(exportsYear[month]) && isValidData(yearData[month])) {
                    const nI = extractNumericValue(importsYear[month]);
                    const nE = extractNumericValue(exportsYear[month]);
                    const nD = extractNumericValue(yearData[month]);
                    if (nI !== null && nE !== null && nD !== null) yearNestedPoints.push({ year, monthIndex: index, label: MONTH_LABELS[index], nI, nE, nD });
                }
            });
        }
        yearNestedPoints.sort((a, b) => a.year !== b.year ? b.year - a.year : b.monthIndex - a.monthIndex);
        yearNestedPoints.slice(0, 2).reverse().forEach(p => {
            chartLabels.push(p.label); importValues.push(p.nI); exportValues.push(p.nE); deficitValues.push(p.nD);
        });

        return {
            type: 'chartjs-mixed',
            data: {
                labels: chartLabels,
                datasets: [
                    { label: 'Imports', data: importValues, type: 'bar', backgroundColor: 'rgba(255, 107, 107, 0.7)', borderColor: '#FF6B6B', borderWidth: 1, yAxisID: 'y' },
                    { label: 'Exports', data: exportValues, type: 'bar', backgroundColor: 'rgba(81, 207, 102, 0.7)', borderColor: '#51CF66', borderWidth: 1, yAxisID: 'y' },
                    { label: 'Deficit', data: deficitValues, type: 'line', borderColor: '#2C5F5A', backgroundColor: 'transparent', borderWidth: 2.5, tension: 0.4, fill: false, yAxisID: 'y1', pointBackgroundColor: '#2C5F5A', pointBorderColor: '#fff', pointBorderWidth: 1.5, pointRadius: 4 }
                ]
            },
            options: { ...getBaseOptions(indicator), plugins: { ...getBaseOptions(indicator).plugins, legend: { display: true, position: 'bottom', align: 'center', labels: { font: { size: 9 }, padding: 6, boxWidth: 10, useBorderRadius: true, borderRadius: 4 } } }, scales: { x: { display: true, grid: { display: false, drawBorder: false }, ticks: { display: true, font: { size: 9 }, color: 'rgba(0, 0, 0, 0.4)', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } }, y: { type: 'linear', display: true, position: 'left', beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false }, ticks: { display: false }, title: { display: false } }, y1: { type: 'linear', display: true, position: 'right', beginAtZero: false, grid: { display: false }, ticks: { display: false }, title: { display: false } } } }
        };
    }

    function getBudgetDeficitConfig(indicator, labels, dataPoints) {
        const colors = getLiveChartColors();
        const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        function extractNumericValue(value) {
            if (!value || value === '' || value.startsWith('TBD') || value === '—') return null;
            let cleanValue = value.toString().replace(/\$/g, '').replace(/^\+/g, '').replace(/[A-Za-z]/g, '').trim().replace(/,/g, '');
            return parseFloat(cleanValue) || null;
        }

        function isValidData(value) { return value !== null && value !== undefined && value !== '' && value !== '—' && value !== 'TBD'; }

        const receiptValues = [], outlayValues = [], deficitValues = [], chartLabels = [];

        MONTHS.forEach((month, index) => {
            if (isValidData(indicator.receipts[month]) && isValidData(indicator.outlays[month]) && isValidData(indicator[month])) {
                const nR = extractNumericValue(indicator.receipts[month]);
                const nO = extractNumericValue(indicator.outlays[month]);
                const nD = extractNumericValue(indicator[month]);
                if (nR !== null && nO !== null && nD !== null) {
                    chartLabels.push(MONTH_LABELS[index]);
                    receiptValues.push(nR); outlayValues.push(nO); deficitValues.push(nD);
                }
            }
        });

        const yearKeys = Object.keys(indicator).filter(k => k.match(/^20\d{2}$/));
        const yearNestedPoints = [];
        for (const year of yearKeys) {
            const yearData = indicator[year];
            if (!yearData || typeof yearData !== 'object') continue;
            const receiptsYear = indicator.receipts[year];
            const outlaysYear = indicator.outlays[year];
            if (!receiptsYear || !outlaysYear) continue;
            MONTHS.forEach((month, index) => {
                if (isValidData(receiptsYear[month]) && isValidData(outlaysYear[month]) && isValidData(yearData[month])) {
                    const nR = extractNumericValue(receiptsYear[month]);
                    const nO = extractNumericValue(outlaysYear[month]);
                    const nD = extractNumericValue(yearData[month]);
                    if (nR !== null && nO !== null && nD !== null) yearNestedPoints.push({ year, monthIndex: index, label: MONTH_LABELS[index], nR, nO, nD });
                }
            });
        }
        yearNestedPoints.sort((a, b) => a.year !== b.year ? b.year - a.year : b.monthIndex - b.monthIndex);
        yearNestedPoints.slice(0, 2).reverse().forEach(p => {
            chartLabels.push(p.label); receiptValues.push(p.nR); outlayValues.push(p.nO); deficitValues.push(p.nD);
        });

        return {
            type: 'chartjs-mixed',
            data: {
                labels: chartLabels,
                datasets: [
                    { label: 'Receipts', data: receiptValues, type: 'bar', backgroundColor: 'rgba(81, 207, 102, 0.7)', borderColor: '#51CF66', borderWidth: 1, yAxisID: 'y' },
                    { label: 'Outlays', data: outlayValues, type: 'bar', backgroundColor: 'rgba(255, 107, 107, 0.7)', borderColor: '#FF6B6B', borderWidth: 1, yAxisID: 'y' },
                    { label: 'Deficit/Surplus', data: deficitValues, type: 'line', borderColor: '#2C5F5A', backgroundColor: 'rgba(44, 95, 90, 0.2)', borderWidth: 2.5, tension: 0.4, fill: 'origin', yAxisID: 'y1', pointBackgroundColor: '#2C5F5A', pointBorderColor: '#fff', pointBorderWidth: 1.5, pointRadius: 4 }
                ]
            },
            options: { ...getBaseOptions(indicator), plugins: { ...getBaseOptions(indicator).plugins, legend: { display: true, position: 'bottom', align: 'center', labels: { font: { size: 9 }, padding: 6, boxWidth: 10, useBorderRadius: true, borderRadius: 4 } }, tooltip: { callbacks: { label: function(context) { const val = context.raw; return context.dataset.label + ': ' + (val >= 0 ? '+$' + Math.round(val) + 'M' : '-$' + Math.round(Math.abs(val)) + 'M'); } } } }, scales: { x: { display: true, grid: { display: false, drawBorder: false }, ticks: { display: true, font: { size: 9 }, color: 'rgba(0, 0, 0, 0.4)', maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } }, y: { type: 'linear', display: true, position: 'left', beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false }, ticks: { display: false }, title: { display: false } }, y1: { type: 'linear', display: true, position: 'right', beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.1)', drawBorder: false }, ticks: { display: false }, title: { display: false } } } }
        };
    }

    function getPredictionMarketConfig(indicator, labels, dataPoints) {
        const colors = getLiveChartColors();
        return {
            type: 'bar',
            data: { labels, datasets: [{ label: 'Probability (%)', data: dataPoints, backgroundColor: [colors.PRIMARY, colors.SECONDARY, colors.ACCENT, colors.ERROR], borderWidth: 1 }] },
            options: { ...getBaseOptions(indicator), scales: { ...getBaseOptions(indicator).scales, y: { beginAtZero: true, grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false }, ticks: { display: false } } } }
        };
    }

    async function renderFinancialCharts() {
        const containers = document.querySelectorAll('[data-indicator]:not([data-rendered])');
        if (containers.length === 0) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(async (entry) => {
                if (entry.isIntersecting) {
                    observer.unobserve(entry.target);
                    await renderSingleChart(entry.target);
                }
            });
        }, { rootMargin: '50px' });

        containers.forEach(container => observer.observe(container));
    }

    async function renderSingleChart(container) {
        if (container.dataset.rendered) return;

        if (!window.Chart) {
            if (window.loadChartJS) await window.loadChartJS();
            else return;
        }

        try {
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
                let dataPoints = [], labels = [];
                if (indicator.bps_probabilities) {
                    labels = Object.keys(indicator.bps_probabilities);
                    dataPoints = Object.values(indicator.bps_probabilities).map(v => parseFloat(v));
                } else if (indicator.candidates && typeof indicator.candidates === 'object') {
                    for (const [name, prob] of Object.entries(indicator.candidates)) {
                        const val = parseFloat(String(prob).replace(/[^0-9.-]/g, ''));
                        if (!isNaN(val)) { labels.push(name); dataPoints.push(val); }
                    }
                } else if (indicator.yes_probability && indicator.no_probability) {
                    const yesVal = parseFloat(String(indicator.yes_probability).replace(/[^0-9.-]/g, ''));
                    const noVal = parseFloat(String(indicator.no_probability).replace(/[^0-9.-]/g, ''));
                    if (!isNaN(yesVal)) { labels.push('Yes'); dataPoints.push(yesVal); }
                    if (!isNaN(noVal)) { labels.push('No'); dataPoints.push(noVal); }
                } else {
                    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
                    months.forEach(m => {
                        if (indicator[m]) {
                            const val = parseFloat(indicator[m].replace(/[^0-9.-]/g, ''));
                            if (!isNaN(val)) { dataPoints.push(val); labels.push(m.slice(0, 3)); }
                        }
                    });
                }

                const config = getChartConfig(indicator, labels, dataPoints);
                if (config) {
                    if (canvas._chart instanceof window.Chart) canvas._chart.destroy();
                    const chart = new window.Chart(canvas.getContext('2d'), config);
                    canvas._chart = chart;
                    container.dataset.rendered = 'true';
                }
            }
        } catch (e) { console.error(e); }
    }

    return { renderFinancialCharts, renderSingleChart };
})();

/* =========================================
   9. Badge Styles (SRP: style injection only)
   ========================================= */

async function injectBadgeStyles() {
    if (document.getElementById('badge-component-styles')) return;

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
.mom-badge.change-positive { background: linear-gradient(180deg, rgba(16, 185, 129, 0.24), rgba(16, 185, 129, 0.09)); border-color: rgba(16, 185, 129, 0.5); }
.mom-badge.change-negative { background: linear-gradient(180deg, rgba(239, 68, 68, 0.24), rgba(239, 68, 68, 0.09)); border-color: rgba(239, 68, 68, 0.55); }
.mom-badge.change-neutral { background: linear-gradient(180deg, rgba(107, 114, 128, 0.24), rgba(107, 114, 128, 0.09)); border-color: rgba(107, 114, 128, 0.5); }
    `;

    const style = document.createElement('style');
    style.id = 'badge-component-styles';
    style.textContent = badgeStyles;
    document.head.appendChild(style);
}

/* =========================================
   10. Main Application (ISP: focused interface per concern)
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
    if (index !== null) sessionStorage.setItem('expandedCardIndex', index);
    else sessionStorage.removeItem('expandedCardIndex');
}

function getExpandedCardState() {
    const index = sessionStorage.getItem('expandedCardIndex');
    return index !== null ? parseInt(index) : null;
}

async function loadAndRenderPosts(posts, isLoadMore = false) {
    if (!posts.length) return;

    const postsToProcess = isLoadMore ? posts : posts.slice(0, PostConfig.INITIAL_LOAD);

    const postsWithContent = await Promise.all(postsToProcess.map(async post => {
        if (!post.file) return null;
        const parsed = await MarkdownParser.fetchAndParse(post.file);
        const raw = parsed && typeof parsed === 'object' && 'content' in parsed ? parsed.content : String(parsed);
        let content = Sanitizer.sanitize(raw);
        content = await ContentProcessors.processAll(content);
        const metadata = (parsed && typeof parsed === 'object' && parsed.metadata) ? parsed.metadata : {};
        const category = (metadata.category || 'posts').toLowerCase().trim();

        const statePost = state.allPosts.find(p => p.file === post.file);
        if (statePost) statePost.category = category;

        return { ...post, rawContent: content, category };
    }));

    const valid = postsWithContent.filter(p => p && p.rawContent);

    const html = valid.map(p => PostCardRenderer.renderCard(p, p.rawContent)).join('');

    if (state.loadedCount === 0) {
        state.feed.innerHTML = html;
    } else {
        state.feed.insertAdjacentHTML('beforeend', html);
    }

    state.loadedCount += valid.length;

    PostChartRenderer.renderFinancialCharts();
    if (window.initializeLucideIcons) window.initializeLucideIcons();
    else if (window.lucide?.createIcons) window.lucide.createIcons();

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

    const activeBtn = filterContainer?.querySelector('.filter-btn.active');
    const currentCategory = activeBtn ? activeBtn.dataset.category : 'all';
    if (currentCategory === 'all' && !isLoadMore) {
        const remaining = state.allPosts.length - state.loadedCount;
        if (remaining > 0) showLoadMoreButton();
    }

    const expandedIndex = getExpandedCardState();
    if (expandedIndex !== null) {
        const cards = Array.from(state.feed.querySelectorAll('.announcement-card'));
        const cardToExpand = cards[expandedIndex];
        if (cardToExpand) {
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
    btn.innerHTML = `<span>Dopamine</span><i data-lucide="chevron-down"></i>`;
    btn.onclick = loadMorePosts;

    state.feed.insertAdjacentElement('afterend', btn);

    if (window.initializeLucideIcons) window.initializeLucideIcons();
    else if (window.lucide?.createIcons) window.lucide.createIcons();
}

function hideLoadMoreButton() {
    const btn = document.getElementById('load-more-btn');
    if (btn) btn.remove();
}

async function loadMorePosts() {
    const remaining = state.allPosts.length - state.loadedCount;
    if (remaining <= 0) { hideLoadMoreButton(); return; }

    const btn = document.getElementById('load-more-btn');
    if (btn) {
        btn.innerHTML = `<span>Loading...</span><i data-lucide="loader"></i>`;
        btn.disabled = true;
        if (window.initializeLucideIcons) window.initializeLucideIcons();
        else if (window.lucide?.createIcons) window.lucide.createIcons();
    }

    const nextBatch = state.allPosts.slice(state.loadedCount, state.loadedCount + PostConfig.BATCH_SIZE);
    await loadAndRenderPosts(nextBatch, true);

    const stillRemaining = state.allPosts.length - state.loadedCount;
    if (stillRemaining > 0) showLoadMoreButton();
    else hideLoadMoreButton();
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

        if (category === 'all') {
            document.querySelectorAll('.announcement-card').forEach(card => { card.style.display = ''; });
            const remaining = state.allPosts.length - state.loadedCount;
            if (remaining > 0) showLoadMoreButton();
            else hideLoadMoreButton();
        } else {
            hideLoadMoreButton();
            if (state.loadedCount < state.allPosts.length) {
                loadAndRenderPosts(state.allPosts.slice(state.loadedCount), true).then(() => {
                    document.querySelectorAll('.announcement-card').forEach(card => {
                        const cardCategory = card.dataset.category || 'posts';
                        card.style.display = cardCategory === category ? '' : 'none';
                    });
                });
            } else {
                document.querySelectorAll('.announcement-card').forEach(card => {
                    const cardCategory = card.dataset.category || 'posts';
                    card.style.display = cardCategory === category ? '' : 'none';
                });
            }
        }
    });
}

async function initPosts() {
    state.feed = document.getElementById('announcements-container');
    if (!state.feed) return;

    await injectBadgeStyles();

    state.feed.addEventListener('toggle', (e) => {
        if (e.target.classList.contains('announcement-card')) {
            if (e.target.hasAttribute('open')) {
                const cards = Array.from(state.feed.querySelectorAll('.announcement-card'));
                saveExpandedCardState(cards.indexOf(e.target));
                e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                saveExpandedCardState(null);
            }
        }
    });

    await MarkdownParser.waitForMarked();
    await Sanitizer.ensure();

    try {
        const postsJson = window.postsPromise ? await window.postsPromise : await (await fetch(PostConfig.POSTS_JSON_URL)).json();
        let posts = Array.isArray(postsJson) ? sortPostsNewestFirst(postsJson) : [];

        try {
            const articlesJson = window.articlesPromise ? await window.articlesPromise : await (await fetch(PostConfig.ARTICLES_JSON_URL)).json();
            if (Array.isArray(articlesJson)) {
                const homepageArticles = articlesJson.filter(article => article?.homepage !== false);
                const articlesAsPosts = homepageArticles.map(article => ({
                    ...article,
                    file: `article/${article.id}.md`,
                    snippet: article.summary || ''
                }));
                posts = sortPostsNewestFirst([...posts, ...articlesAsPosts]);
            }
        } catch (articlesErr) {
            console.warn('Could not load articles.json:', articlesErr);
        }

        state.allPosts = posts;
        await loadAndRenderPosts(state.allPosts);
        TimeFormatter.startTimeUpdates();
    } catch (err) {
        console.error(err);
        state.feed.innerHTML = '<div class="error-state">Unable to load content.</div>';
    }

    initIndexFilters();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPosts);
else initPosts();
