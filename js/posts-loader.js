// Monolithic Posts Loader - Simplified & Consolidated
// Replaces the previous module-based architecture for better performance and simplicity

/* =========================================
   1. UTILITIES & CONFIG
   ========================================= */

const CONFIG = {
    INITIAL_LOAD: 8,
    BATCH_SIZE: 10,
    POSTS_JSON_URL: 'json/posts.json'
};

const CHART_COLORS = {
    PRIMARY: '#2C5F5A',
    PRIMARY_FILL: 'rgba(44, 95, 90, 0.1)',
    SECONDARY: '#666',
    ACCENT: '#D4822A',
    ERROR: '#8B0000'
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

async function parseMarkdownFile(fileUrl) {
    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const md = await response.text();
        return parseMarkdownContent(md);
    } catch (err) {
        console.error('Failed to fetch', fileUrl, err);
        return '';
    }
}

function parseMarkdownContent(md) {
    // Extract content after frontmatter
    const parts = md.split(/^---$/m);
    let contentMd = md.trim();

    if (parts.length >= 3) {
        contentMd = parts.slice(2).join('---').trim();
    } else if (parts.length === 2 && !md.trimStart().startsWith('---')) {
        contentMd = md.trim();
    }

    // Use marked if available
    if (window.marked && typeof window.marked.parse === 'function') {
        try {
            return window.marked.parse(contentMd);
        } catch (e) {
            console.error('Markdown parse error:', e);
            return contentMd;
        }
    }
    return contentMd;
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
    return {
        responsive: true,
        maintainAspectRatio: true,
        layout: { padding: { bottom: 20 } },
        plugins: {
            legend: { display: true },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        label += context.parsed.y.toLocaleString();
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                ticks: {
                    callback: function (value) {
                        if (indicator.name && (indicator.name.includes('Rate') || indicator.name.includes('Yield'))) {
                            return value.toFixed(2) + '%';
                        }
                        return value.toLocaleString();
                    }
                }
            }
        },
        interaction: { mode: 'nearest', axis: 'x', intersect: false }
    };
}

function getLineChartConfig(indicator, labels, dataPoints) {
    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: indicator.name || 'Data',
                data: dataPoints,
                borderColor: CHART_COLORS.PRIMARY,
                backgroundColor: CHART_COLORS.PRIMARY_FILL,
                borderWidth: CHART_CONFIG.BORDER_WIDTH,
                tension: CHART_CONFIG.TENSION,
                fill: true,
                pointBackgroundColor: CHART_COLORS.PRIMARY,
                pointBorderColor: CHART_COLORS.PRIMARY,
                pointRadius: 4,
                pointHoverRadius: 6
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
    // Simplified specific logic for trade deficit
    // Note: Re-implement full logic if critical, for now ensuring safely functional
    return getLineChartConfig(indicator, labels, dataPoints);
}

function getPredictionMarketConfig(indicator, labels, dataPoints) {
    return {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Probability (%)',
                data: dataPoints,
                backgroundColor: [CHART_COLORS.PRIMARY, CHART_COLORS.SECONDARY, CHART_COLORS.ACCENT, CHART_COLORS.ERROR],
                borderWidth: 1
            }]
        },
        options: {
            ...getBaseOptions(indicator),
            scales: { y: { beginAtZero: true } }
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
    loadedCount: 0
};

async function initPosts() {
    state.feed = document.getElementById('announcements-container');
    if (!state.feed) return;

    // Card expansion logic with enhanced UX
    state.feed.addEventListener('click', (e) => {
        const card = e.target.closest('.announcement-card');
        if (!card || e.target.closest('a, button, canvas, .card-expanded-content')) return;
        
        // Close other cards for better focus
        const allCards = state.feed.querySelectorAll('.announcement-card');
        allCards.forEach(otherCard => {
            if (otherCard !== card && otherCard.classList.contains('expanded')) {
                otherCard.classList.remove('expanded');
            }
        });
        
        // Toggle current card
        card.classList.toggle('expanded');
        
        // Smooth scroll to card if expanding
        if (card.classList.contains('expanded')) {
            setTimeout(() => {
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    });

    await waitForMarked();
    // state.feed.innerHTML = ''; // REMOVED: Prevent flicker by keeping skeletons until data is ready

    try {
        const json = window.postsPromise ? await window.postsPromise : await (await fetch(CONFIG.POSTS_JSON_URL)).json();
        state.allPosts = Array.isArray(json) ? json : [];
        const initial = state.allPosts.slice(0, CONFIG.INITIAL_LOAD);
        await loadAndRenderPosts(initial);
        startTimeUpdates();
    } catch (err) {
        console.error(err);
        state.feed.innerHTML = '<div class="error-state">Unable to load content.</div>';
    }
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

    // Extract image (first img)
    const img = temp.querySelector('img');
    const imageUrl = img ? img.src : '';

    // Extract snippet (first paragraph text with improved truncation)
    const p = temp.querySelector('p');
    let snippet = p ? p.innerText.trim() : '';
    if (snippet.length > 160) {
        snippet = snippet.substring(0, 157).replace(/\s+\S*$/, '') + '...';
    }

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
        let content = await parseMarkdownFile(post.file);
        if (content.includes('{{chart:')) content = processCharts(content);
        content = wrapImagesInLinks(content);
        content = wrapTablesForMobile(content);
        return { ...post, rawContent: content };
    }));

    const valid = postsWithContent.filter(p => p && p.rawContent);

    const html = valid.map(p => {
        const data = extractCardData(p.rawContent);
        const iconHtml = data.icon ? `<i data-lucide="${data.icon}" class="card-icon"></i>` :
            `<i data-lucide="bookmark" class="card-icon"></i>`;

        return `
            <div class="announcement-card ${data.image ? 'has-image' : ''}" data-date="${p.date}">
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
                <div class="card-expanded-content">
                    <div class="content-wrapper">
                        <div class="content">${data.content}</div>
                    </div>
                </div>
                <div class="card-footer">
                    <span class="read-more-btn">Read full update <i data-lucide="chevron-right"></i></span>
                </div>
            </div>
        `;
    }).join('');

    if (state.loadedCount === 0) state.feed.innerHTML = html;
    else state.feed.insertAdjacentHTML('beforeend', html);

    state.loadedCount += valid.length;

    // Load More Button
    if (state.loadedCount < state.allPosts.length) {
        let btn = document.getElementById('load-more-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'load-more-btn';
            btn.className = 'load-more-btn';
            btn.onclick = loadMorePosts;
            document.querySelector('.announcements')?.appendChild(btn);
        }
        btn.innerHTML = `<i data-lucide="zap"></i> Dopamine`;
        btn.style.display = 'flex';
    }

    renderFinancialCharts();
    if (window.initializeLucideIcons) window.initializeLucideIcons();
    else if (window.lucide?.createIcons) window.lucide.createIcons();
}

async function loadMorePosts() {
    const btn = document.getElementById('load-more-btn');
    if (!btn) return;
    
    // Disable button and show loading state
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader-2" class="animate-spin"></i> Loading...`;
    
    // Re-render icons for loading state
    if (window.initializeLucideIcons) window.initializeLucideIcons();
    else if (window.lucide?.createIcons) window.lucide.createIcons();

    const next = state.allPosts.slice(state.loadedCount, state.loadedCount + CONFIG.BATCH_SIZE);
    await loadAndRenderPosts(next);

    btn.disabled = false;
    if (state.loadedCount >= state.allPosts.length) {
        btn.style.display = 'none';
    } else {
        btn.innerHTML = `<i data-lucide="zap"></i> Dopamine`;
        // Re-render icons after content load
        if (window.initializeLucideIcons) window.initializeLucideIcons();
        else if (window.lucide?.createIcons) window.lucide.createIcons();
    }
}

// Init
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPosts);
else initPosts();
