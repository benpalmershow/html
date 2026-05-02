// Utility function wrappers (full implementations in html-utils.js)
function sanitizeHtml(html) {
  return window.HtmlUtils?.sanitizeHtml
    ? window.HtmlUtils.sanitizeHtml(html)
    : html || '';
}

async function ensureHtmlSanitizer() {
  if (window.HtmlUtils?.ensureHtmlSanitizer) {
    await window.HtmlUtils.ensureHtmlSanitizer();
  }
}

async function waitForMarked() {
  if (window.marked) return;

  await new Promise(resolve => {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.marked) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= 50) {
        clearInterval(checkInterval);
        resolve();
      }
    }, 100);
  });
}

function parseFrontmatter(md) {
  return window.HtmlUtils?.parseFrontmatter
    ? window.HtmlUtils.parseFrontmatter(md)
    : { metadata: {}, contentMd: md || '' };
}

function escapeHtml(text) {
  return window.HtmlUtils?.escapeHtml
    ? window.HtmlUtils.escapeHtml(text)
    : String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function titleCaseCategory(category) {
  if (!category) return '';
  return category.charAt(0).toUpperCase() + category.slice(1);
}

function formatRelativeDate(dateString) {
  return window.HtmlUtils?.formatRelativeDate
    ? window.HtmlUtils.formatRelativeDate(dateString)
    : dateString || '';
}

function wrapTables(container) {
  container.querySelectorAll('table').forEach(table => {
    if (table.parentElement?.classList.contains('table-wrapper')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

function setMeta(name, content, attr = 'name') {
  if (!content) return;
  const selector = `meta[${attr}="${name}"]`;
  const element = document.head.querySelector(selector);
  if (element) {
    element.setAttribute('content', content);
  }
}

function updateDocumentMeta(slug, metadata, articleIndexEntry) {
  const title = metadata.title || articleIndexEntry?.title || 'Article';
  const description = metadata.summary || articleIndexEntry?.summary || 'Independent article and policy analysis from Howdy, Stranger.';
  const image = articleIndexEntry?.image || 'https://howdystranger.net/images/logo-1200x630.webp?v=1';
  const articleUrl = `https://howdystranger.net/news.html?article=${encodeURIComponent(slug)}`;

  document.title = `${title} - Howdy, Stranger`;
  setMeta('description', description);
  setMeta('keywords', [slug, metadata.category, 'Howdy Stranger'].filter(Boolean).join(', '));
  setMeta('og:title', title, 'property');
  setMeta('og:description', description, 'property');
  setMeta('og:url', articleUrl, 'property');
  setMeta('og:image', image, 'property');
  setMeta('twitter:title', title);
  setMeta('twitter:description', description);
  setMeta('twitter:image', image);

  const canonical = document.head.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.href = articleUrl;
  }
}

function updateIndexMeta() {
  document.title = 'Essays - Howdy, Stranger';
  setMeta('description', 'Independent essays and policy analysis from Howdy, Stranger.');
  setMeta('keywords', 'essays, policy analysis, legal analysis, markets, Howdy Stranger');
  setMeta('og:title', 'Essays - Howdy, Stranger', 'property');
  setMeta('og:description', 'Independent essays and policy analysis from Howdy, Stranger.', 'property');
  setMeta('og:url', 'https://howdystranger.net/news.html', 'property');
  setMeta('twitter:title', 'Essays - Howdy, Stranger');
  setMeta('twitter:description', 'Independent essays and policy analysis from Howdy, Stranger.');

  const canonical = document.head.querySelector('link[rel="canonical"]');
  if (canonical) {
    canonical.href = 'https://howdystranger.net/news.html';
  }
}

function renderMetaHeader(metadata) {
  const parts = [];

  if (metadata.date) {
    parts.push(`<time class="article-date" datetime="${escapeHtml(metadata.date)}">${escapeHtml(formatRelativeDate(metadata.date))}</time>`);
  }

  if (metadata.ticker && metadata.link) {
    parts.push(`<div class="article-ticker">Ticker: <a href="${escapeHtml(metadata.link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(metadata.ticker)}</a></div>`);
  }

  if (metadata.category) {
    parts.push(`<span class="category-badge ${escapeHtml(metadata.category)}">${escapeHtml(titleCaseCategory(metadata.category))}</span>`);
  }

  if (!parts.length) return '';
  return `<div class="article-meta-header">${parts.join('')}</div>`;
}

function renderError(message) {
  const statusEl = document.getElementById('article-status');
  const errorEl = document.getElementById('article-error');
  const readerEl = document.getElementById('article-reader');
  const indexEl = document.getElementById('essay-index');

  statusEl.hidden = true;
  readerEl.hidden = true;
  if (indexEl) indexEl.hidden = true;
  errorEl.hidden = false;
  const baseUrl = getEssayBaseUrl();
  errorEl.innerHTML = `${escapeHtml(message)} <a href="${baseUrl}">Back to Essays</a>.`;
}

function getLatestArticleSlug(articles) {
  if (!Array.isArray(articles)) return null;

  const eligible = articles
    .filter(article => article && article.id && article.homepage !== false)
    .sort((a, b) => {
      const aTime = Date.parse(a.date || '');
      const bTime = Date.parse(b.date || '');
      const aValid = Number.isFinite(aTime);
      const bValid = Number.isFinite(bTime);

      if (aValid && bValid) return bTime - aTime;
      if (aValid) return -1;
      if (bValid) return 1;
      return 0;
    });

  return eligible[0]?.id || null;
}

function getSortedArticles(articles) {
  if (!Array.isArray(articles)) return [];

  return [...articles].sort((a, b) => {
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

function getCategoryIcon(category) {
  const iconMap = {
    all: 'list',
    policy: 'shield',
    legal: 'gavel',
    political: 'landmark',
    earnings: 'briefcase',
    ipo: 'rocket',
    healthcare: 'heart-pulse',
    corrections: 'badge-alert'
  };

  return iconMap[category] || 'file-text';
}

function getEssayBaseUrl() {
  // Use journal.html if on that page, otherwise use news.html
  if (window.location.pathname.includes('journal.html')) {
    return 'journal.html';
  }
  return 'news.html';
}

function renderEssayCards(articles, category = 'all') {
  const resultsEl = document.getElementById('essay-results');
  if (!resultsEl) return;

  const filtered = category === 'all'
    ? articles
    : articles.filter(article => (article.category || 'uncategorized') === category);

  if (!filtered.length) {
    resultsEl.innerHTML = '<div class="essay-empty">No essays match this filter.</div>';
    return;
  }

  const baseUrl = getEssayBaseUrl();
  resultsEl.innerHTML = filtered.map(article => `
    <a class="essay-card" href="${baseUrl}?article=${encodeURIComponent(article.id)}" data-category="${escapeHtml(article.category || 'uncategorized')}">
      <div class="essay-card-header">
        <h2 class="essay-card-title">${escapeHtml(article.title || 'Untitled')}</h2>
        ${article.category ? `<span class="category-badge ${escapeHtml(article.category)}">${escapeHtml(titleCaseCategory(article.category))}</span>` : ''}
      </div>
      <p class="essay-card-summary">${escapeHtml(article.summary || 'Read the essay.')}</p>
      <div class="essay-card-meta">
        ${article.date ? `<time class="essay-card-date" datetime="${escapeHtml(article.date)}">${escapeHtml(formatRelativeDate(article.date))}</time>` : ''}
        <span class="essay-card-cta">Read essay <i data-lucide="arrow-right"></i></span>
      </div>
    </a>
  `).join('');
}

function renderEssayFilters(articles) {
  const filtersEl = document.getElementById('essay-filters');
  if (!filtersEl) return;

  const categories = ['all', ...new Set(articles.map(article => (article.category || 'uncategorized')).filter(Boolean))];

  filtersEl.innerHTML = categories.map(category => `
    <button type="button" class="filter-btn ${category === 'all' ? 'active' : ''}" data-category="${escapeHtml(category)}">
      <i data-lucide="${getCategoryIcon(category)}" class="filter-icon"></i>
      <span class="filter-text">${escapeHtml(category === 'all' ? 'All' : titleCaseCategory(category))}</span>
    </button>
  `).join('');

  filtersEl.addEventListener('click', (event) => {
    const button = event.target.closest('.filter-btn');
    if (!button) return;

    filtersEl.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    renderEssayCards(articles, button.dataset.category || 'all');
    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  });
}

function renderEssayIndex(articles) {
  const statusEl = document.getElementById('article-status');
  const readerEl = document.getElementById('article-reader');
  const errorEl = document.getElementById('article-error');
  const indexEl = document.getElementById('essay-index');
  const sorted = getSortedArticles(articles);

  updateIndexMeta();

  // Toggle IS the page title - don't overwrite
  statusEl.hidden = true;
  readerEl.hidden = true;
  errorEl.hidden = true;
  indexEl.hidden = false;

  renderEssayFilters(sorted);
  renderEssayCards(sorted, 'all');

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

async function loadArticle() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('article');
  const version = document.querySelector('meta[name="site-data-version"]')?.content || '20260320';

  const statusEl = document.getElementById('article-status');
  const readerEl = document.getElementById('article-reader');
  const contentEl = document.getElementById('article-content');
  const indexEl = document.getElementById('essay-index');

  try {
    await waitForMarked();
    await ensureHtmlSanitizer();

    let articleIndexEntry = null;
    let articles = [];
    try {
      const articlesResponse = await fetch(`json/articles.json?v=${encodeURIComponent(version)}`);
      if (articlesResponse.ok) {
        articles = await articlesResponse.json();
        if (Array.isArray(articles)) {
          articleIndexEntry = articles.find(article => article.id === slug) || null;
        }
      }
    } catch (error) {
      console.warn('Could not load articles index', error);
    }

    if (!slug) {
      renderEssayIndex(articles);
      return;
    }

    const articlePath = `article/${encodeURIComponent(slug)}.md?v=${encodeURIComponent(version)}`;
    const articleResponse = await fetch(articlePath);
    if (!articleResponse.ok) {
      throw new Error(`File not found: ${slug}`);
    }

    const md = await articleResponse.text();
    const { metadata, contentMd } = parseFrontmatter(md);
    const parsedHtml = window.marked && typeof window.marked.parse === 'function'
      ? window.marked.parse(contentMd)
      : contentMd;

    const safeHtml = sanitizeHtml(parsedHtml);
    contentEl.innerHTML = `${renderMetaHeader(metadata)}${safeHtml}`;
    wrapTables(contentEl);

    updateDocumentMeta(slug, metadata, articleIndexEntry);

    // Toggle IS the page title - don't overwrite
    statusEl.hidden = true;
    if (indexEl) indexEl.hidden = true;
    readerEl.hidden = false;

    if (window.lucide?.createIcons) {
      window.lucide.createIcons();
    }
  } catch (error) {
    console.error('Failed to load article:', error);
    renderError('File not found.');
  }
}

// Only auto-initialize if not on journal.html (journal.html manages its own initialization)
if (!window.location.pathname.includes('journal.html')) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadArticle);
  } else {
    loadArticle();
  }
}
