const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

const SCRIPT_COMPONENTS = ['components/analytics.html', 'components/error-handling.html', 'components/scripts-unified.html'];

// Utility function wrappers (full implementations in html-utils.js)
function formatRelativeDate(dateString) {
  return window.HtmlUtils?.formatRelativeDate
    ? window.HtmlUtils.formatRelativeDate(dateString)
    : dateString || '';
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

function sanitizeHtml(html) {
  if (window.HtmlUtils?.sanitizeHtml) {
    return optimizeSanitizedHtml(window.HtmlUtils.sanitizeHtml(html, {
      dompurify: {
        ADD_ATTR: ['loading', 'decoding', 'fetchpriority']
      }
    }));
  }
  return html || '';
}

async function ensureHtmlSanitizer() {
  if (window.HtmlUtils?.ensureHtmlSanitizer) {
    await window.HtmlUtils.ensureHtmlSanitizer();
  }
}

function cloneAndAppendScriptNode(script, target = document.head) {
  const newScript = document.createElement('script');
  if (script.src) {
    newScript.src = script.src;
  } else {
    newScript.textContent = script.textContent;
  }

  ['type', 'async', 'defer', 'crossOrigin', 'integrity', 'referrerPolicy', 'noModule'].forEach((prop) => {
    if (script[prop]) {
      newScript[prop] = script[prop];
    }
  });

  target.appendChild(newScript);
}

async function loadComponentHtml(path) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`Failed to load component: ${path}`);
  }
  return response.text();
}

async function injectHeadNodes(path, selector) {
  const html = await loadComponentHtml(path);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  tempDiv.querySelectorAll(selector).forEach((el) => {
    document.head.appendChild(el.cloneNode(true));
  });
}

async function injectScriptComponent(path) {
  const html = await loadComponentHtml(path);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  tempDiv.querySelectorAll('script').forEach((script) => cloneAndAppendScriptNode(script));
}

async function injectFooter() {
  const footerContainer = document.getElementById('footer-container');
  if (!footerContainer) {
    return;
  }
  footerContainer.innerHTML = await loadComponentHtml('components/footer.html');
}

function loadScriptOnce(src, options = {}) {
  const existingScript = document.querySelector(`script[src="${src}"]`);
  if (existingScript) {
    return Promise.resolve(existingScript);
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = Boolean(options.async);
    script.defer = Boolean(options.defer);
    script.onload = () => resolve(script);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function optimizeSanitizedHtml(cleanHtml) {
  const outputTemplate = document.createElement('template');
  outputTemplate.innerHTML = cleanHtml;

  // Optimize all images
  outputTemplate.content.querySelectorAll('img').forEach(img => {
    // Add lazy loading for images below the fold (except first image which gets high priority)
    if (!img.hasAttribute('loading')) {
      img.setAttribute('loading', 'lazy');
    }
    // Add decoding async for better performance
    if (!img.hasAttribute('decoding')) {
      img.setAttribute('decoding', 'async');
    }
    // Remove inline styles that conflict with CSS
    if (img.hasAttribute('style')) {
      const style = img.getAttribute('style').toLowerCase();
      const cleaned = style
        .replace(/max-width\s*:[^;]+;?/gi, '')
        .replace(/height\s*:[^;]+;?/gi, '')
        .replace(/border\s*:[^;]+;?/gi, '')
        .replace(/box-shadow\s*:[^;]+;?/gi, '')
        .replace(/margin\s*:[^;]+;?/gi, '')
        .replace(/border-radius\s*:[^;]+;?/gi, '')
        .replace(/transition\s*:[^;]+;?/gi, '')
        .trim();
      if (cleaned) {
        img.setAttribute('style', cleaned);
      } else {
        img.removeAttribute('style');
      }
    }
    // Ensure width/height for CLS prevention - add aspect-ratio for images without dimensions
    if (!img.hasAttribute('width') && !img.hasAttribute('height')) {
      const src = img.getAttribute('src') || '';
      if (src.includes('nasa.gov') || src.includes('.gov/') || src.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
        img.setAttribute('style', (img.getAttribute('style') || '') + ' aspect-ratio: 16/9;');
      }
    }
  });

  // Add fetchpriority="high" to first image for LCP optimization
  const firstImg = outputTemplate.content.querySelector('img');
  if (firstImg && !firstImg.closest('.entry-time')) {
    firstImg.setAttribute('fetchpriority', 'high');
  }

  return outputTemplate.innerHTML;
}

function linkify(text) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" title="${url}">${url}</a>`);
}

function addTickerLinks(html) {
  if (!html) return '';

  const template = document.createElement('template');
  template.innerHTML = html;

  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.includes('$')) {
        return NodeFilter.FILTER_REJECT;
      }

      const parentTag = node.parentElement?.tagName;
      if (parentTag && ['A', 'CODE', 'PRE', 'SCRIPT', 'STYLE', 'TEXTAREA'].includes(parentTag)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const textNodes = [];
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    textNodes.push(currentNode);
  }

  const tickerRegex = /(^|[^\w/])\$([A-Z][A-Z.\-]{0,9})(?![\w.])/g;

  textNodes.forEach((node) => {
    const text = node.nodeValue;
    let match;
    let lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let hasMatch = false;

    while ((match = tickerRegex.exec(text)) !== null) {
      hasMatch = true;
      const [fullMatch, prefix, ticker] = match;
      const start = match.index;
      const prefixLength = prefix.length;
      const dollarIndex = start + prefixLength;

      if (dollarIndex > lastIndex) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex, dollarIndex)));
      }

      const anchor = document.createElement('a');
      anchor.href = `https://www.perplexity.ai/finance/${encodeURIComponent(ticker)}`;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = `$${ticker}`;
      anchor.title = anchor.href;
      fragment.appendChild(anchor);

      lastIndex = dollarIndex + ticker.length + 1;
    }

    if (!hasMatch) {
      return;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode.replaceChild(fragment, node);
  });

  return template.innerHTML;
}

function addLinkTooltips(html) {
  if (!html || !html.includes('<a')) {
    return html;
  }

  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll('a[href]').forEach((anchor) => {
    if (!anchor.getAttribute('title')) {
      anchor.setAttribute('title', anchor.getAttribute('href') || '');
    }
  });
  return template.innerHTML;
}

async function waitForMarked() {
  if (window.marked) {
    return;
  }

  if (window.loadMarked && typeof window.loadMarked === 'function') {
    await window.loadMarked();
    return;
  }

  try {
    await loadScriptOnce('https://cdn.jsdelivr.net/npm/marked/marked.min.js', { defer: true });
  } catch (error) {
    console.error('Marked.js not loaded', error);
  }
}

function bindCollapsibleEntries(journalFeed) {
  journalFeed.querySelectorAll('[data-collapsible]').forEach((el) => {
    const title = el.querySelector('.entry-title');
    if (!title) {
      return;
    }
    title.addEventListener('click', () => {
      el.classList.toggle('entry--collapsed');
    });
  });
}

function parseNumericValue(value) {
  const parsed = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
  return Number.isNaN(parsed) ? null : parsed;
}

function getSeriesDataFromIndicator(indicator) {
  if (indicator.bps_probabilities) {
    return {
      labels: Object.keys(indicator.bps_probabilities),
      dataPoints: Object.values(indicator.bps_probabilities).map((value) => parseFloat(value))
    };
  }

  if (indicator.candidates && typeof indicator.candidates === 'object') {
    const labels = [];
    const dataPoints = [];
    Object.entries(indicator.candidates).forEach(([name, probability]) => {
      const value = parseNumericValue(probability);
      if (value !== null) {
        labels.push(name);
        dataPoints.push(value);
      }
    });
    return { labels, dataPoints };
  }

  const yearKeys = Object.keys(indicator)
    .filter((key) => /^\d{4}$/.test(key))
    .map((key) => parseInt(key, 10))
    .sort((a, b) => b - a);

  if (yearKeys.length === 0) {
    const labels = [];
    const dataPoints = [];
    MONTHS.forEach((month) => {
      if (!indicator[month]) {
        return;
      }
      const value = parseNumericValue(indicator[month]);
      if (value !== null) {
        labels.push(month.slice(0, 3));
        dataPoints.push(value);
      }
    });
    return { labels, dataPoints };
  }

  const dataMap = {};
  MONTHS.forEach((month, index) => {
    const value = parseNumericValue(indicator[month]);
    if (value !== null) {
      dataMap[`null-${index}`] = { month, monthIndex: index, value, year: null };
    }
  });

  yearKeys.forEach((year) => {
    const yearData = indicator[year];
    if (!yearData || typeof yearData !== 'object') {
      return;
    }
    MONTHS.forEach((month, index) => {
      const value = parseNumericValue(yearData[month]);
      if (value !== null) {
        dataMap[`${year}-${index}`] = { month, monthIndex: index, value, year };
      }
    });
  });

  const sortedData = Object.values(dataMap).sort((a, b) => {
    if (a.year !== b.year) {
      return (a.year || 2025) - (b.year || 2025);
    }
    return a.monthIndex - b.monthIndex;
  });

  return {
    labels: sortedData.map((item) => item.month.slice(0, 3)),
    dataPoints: sortedData.map((item) => item.value)
  };
}

function toggleEssayReaderView(showReader) {
  const journalFeed = document.getElementById('journal-feed');
  const essayReaderContainer = document.getElementById('essay-reader-container');
  const categoryFilters = document.getElementById('journal-category-filters');

  if (journalFeed) {
    journalFeed.style.display = showReader ? 'none' : 'block';
  }
  if (essayReaderContainer) {
    essayReaderContainer.style.display = showReader ? 'block' : 'none';
  }
  if (categoryFilters) {
    categoryFilters.style.display = showReader ? 'none' : 'flex';
  }
}

function updateJournalPageTitle(source) {
  // Toggle IS the page title now - just update browser tab
  const titleText = source === 'journal' ? 'Docs' : 'Essays';
  document.title = `${titleText} - Howdy, Stranger`;
}

async function loadJournalEntries() {
  const journalFeed = document.getElementById('journal-feed');
  const siteDataVersion = document.querySelector('meta[name="site-data-version"]')?.content || '20260320';
  if (!journalFeed) {
    console.error('Journal feed element not found');
    return;
  }

  try {
    await waitForMarked();
    await ensureHtmlSanitizer();

    // Determine current filter
    const filterContainer = document.getElementById('journal-filters');
    const activeBtn = filterContainer?.querySelector('.source-toggle-btn.active, .filter-btn.active');
    const currentSource = activeBtn?.dataset.source || 'journal';

    // Update page title based on active filter
    updateJournalPageTitle(currentSource);

    if (currentSource === 'journal') {
      toggleEssayReaderView(false);
      await loadJournalData(journalFeed, siteDataVersion);
    } else {
      toggleEssayReaderView(true);
      // Use news-article.js to load the essay reader
      if (typeof loadArticle === 'function') {
        await loadArticle();
      }
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }
  } catch (error) {
    console.error('Error loading feed:', error);
    journalFeed.innerHTML = '<div class="error-state">Error loading content. Please try again later.</div>';
  }
}

async function loadJournalData(journalFeed, siteDataVersion) {
  const response = await fetch(`json/journal.json?v=${encodeURIComponent(siteDataVersion)}`);
  if (!response.ok) {
    throw new Error(`Failed to load journal entries: ${response.status} ${response.statusText}`);
  }
  const journals = await response.json();
  
  if (!Array.isArray(journals)) {
    throw new Error('Journal data is not an array');
  }
  
  journals.sort((a, b) => {
    const dateA = parseDate(a.date);
    const dateB = parseDate(b.date);
    return dateB - dateA;
  });
  
  const articlesHTML = await Promise.all(journals.map(renderJournal));
  
  journalFeed.innerHTML = articlesHTML.join('');

  // Optimize first image for LCP
  const firstImage = journalFeed.querySelector('.journal-entry img');
  if (firstImage) {
    firstImage.setAttribute('loading', 'eager');
    firstImage.setAttribute('fetchpriority', 'high');
    firstImage.setAttribute('decoding', 'async');
  }

  bindCollapsibleEntries(journalFeed);
  renderJournalCharts();
  scrollToHash();
}

async function loadNewsData(journalFeed, siteDataVersion) {
  const response = await fetch(`json/articles.json?v=${encodeURIComponent(siteDataVersion)}`);
  if (!response.ok) {
    throw new Error(`Failed to load news articles: ${response.status} ${response.statusText}`);
  }
  const articles = await response.json();
  
  if (!Array.isArray(articles)) {
    throw new Error('Articles data is not an array');
  }

  const articlesHTML = renderNewsArticles(articles);
  journalFeed.innerHTML = articlesHTML;
  
  // Optimize first image for LCP
  const firstImage = journalFeed.querySelector('.journal-entry img');
  if (firstImage) {
    firstImage.setAttribute('loading', 'eager');
    firstImage.setAttribute('fetchpriority', 'high');
    firstImage.setAttribute('decoding', 'async');
  }
}

function renderNewsArticles(articles) {
  const sortedArticles = [...articles].sort((a, b) => {
    const aTime = Date.parse(a.date || '');
    const bTime = Date.parse(b.date || '');
    const aValid = Number.isFinite(aTime);
    const bValid = Number.isFinite(bTime);
    if (aValid && bValid) return bTime - aTime;
    if (aValid) return -1;
    if (bValid) return 1;
    return 0;
  });

  return sortedArticles.map(article => {
    const articleUrl = `news.html?article=${encodeURIComponent(article.id)}`;
    const category = article.category || 'uncategorized';
    const categoryLabel = titleCaseCategory(category);
    const dateStr = article.date ? formatRelativeDate(article.date) : '';
    
    return `
      <article class="journal-entry">
        <div class="card-title">
          <time datetime="${escapeHtml(article.date || '')}">
            ${escapeHtml(dateStr)}
          </time>
        </div>
        <div class="content">
          <a class="entry-title-link" href="${articleUrl}" data-category="${escapeHtml(category)}">
            <h2 class="entry-title">
              ${escapeHtml(article.title || 'Untitled')}
              <span class="category-badge ${escapeHtml(category)}">
                ${escapeHtml(categoryLabel)}
              </span>
            </h2>
            <p class="entry-content">${escapeHtml(article.summary || 'Read the article.')}</p>
          </a>
        </div>
      </article>
    `;
  }).join('');
}

function escapeHtml(text) {
  if (window.HtmlUtils?.escapeHtml) {
    return window.HtmlUtils.escapeHtml(text);
  }
  return String(text)
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

async function renderJournal(journal) {
  if (!journal || !journal.date) {
    console.error('Invalid journal entry - missing date:', journal);
    return '';
  }
  if (!Array.isArray(journal.entries)) {
    console.error('Invalid journal entry - missing or invalid entries:', journal);
    return '';
  }

  const entriesHTML = await Promise.all(journal.entries.map(entry => renderEntry(entry, journal.date)));
  return `<article class="journal-entry"><div class="card-title"><time datetime="${formatDateForDateTime(journal.date)}">${formatDate(journal.date)}</time></div><div class="content">${entriesHTML.join('')}</div></article>`;
}

async function renderEntry(entry, journalDate) {
  if (!entry || typeof entry.title !== 'string') {
    console.error('Invalid entry:', entry);
    return '';
  }

  if ((!entry.content || entry.content.trim() === '') && !entry.file && (!entry.title || entry.title.trim() === '')) {
    console.error('Entry missing title, content, and file:', entry);
    return '';
  }

  const entryId = createEntryId(entry.title);

  if (entry.file) {
    return renderEntryFromFile(entry, entryId, journalDate);
  }

  return renderInlineEntry(entry, entryId, journalDate);
}

function createEntryId(title) {
  const plainTitle = title.replace(/<[^>]*>/g, ' ');
  return plainTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function renderTitle(title) {
  const safeTitle = title.includes('<') ? sanitizeHtml(title) : escapeHtml(title);
  return addLinkTooltips(addTickerLinks(safeTitle));
}

function renderEntryTime(time, journalDate) {
  if (!time) return '';
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  const entryDate = journalDate ? parseDate(journalDate) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entryTime = new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), hours, minutes);
  
  const diffMs = now - entryTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  let ago;
  if (diffMins < 1) ago = 'now';
  else if (diffMins < 60) ago = `${diffMins}m`;
  else if (diffHours <= 24) ago = `${diffHours}h`;
  else ago = time;
  return `<time class="entry-time">${ago}</time>`;
}

async function renderEntryFromFile(entry, entryId, journalDate) {
  try {
    const fileResponse = await fetch(entry.file);
    const md = await fileResponse.text();
    const parts = md.split(/^---$/m);
    let content = md.trim();
  if (parts.length >= 3) {
      content = parts.slice(2).join('---').trim();
    }

    // Strip the primary header from the markdown to prevent title duplication in expanded view
    content = content.replace(/^#+\s+.*\n*/, '').trim();

    let htmlContent = content;
    if (window.marked) {
      try {
        htmlContent = window.marked.parse(content);
      } catch (e) {
        console.error('Failed to parse markdown, using raw content:', e);
      }
    }

    const safeTitle = renderTitle(entry.title);
    const processedContent = processChartPlaceholders(htmlContent);
    const safeContent = addLinkTooltips(addTickerLinks(sanitizeHtml(processedContent)));
    const collapsedClass = entry.collapsed ? ' entry--collapsed' : '';
    const toggleAttr = entry.collapsed ? ' data-collapsible="true"' : '';
    const timeHtml = renderEntryTime(entry.time, journalDate);
    return `<div id="${entryId}" class="entry entry--file${collapsedClass}"${toggleAttr}>${timeHtml}<div class="entry-title">${safeTitle}</div><div class="entry-content">${safeContent}</div></div>`;
  } catch (err) {
    console.error('Failed to load file:', entry.file, err);
    const safeTitle = renderTitle(entry.title);
    const timeHtml = renderEntryTime(entry.time, journalDate);
    return `<div id="${entryId}" class="entry entry--file">${timeHtml}<div class="entry-title">${safeTitle}</div><div class="entry-content">Unable to load content.</div></div>`;
  }
}

function renderInlineEntry(entry, entryId, journalDate) {
  const rawContent = typeof entry.content === 'string' ? entry.content : '';
  let content = rawContent.includes('<') ? sanitizeHtml(rawContent) : linkify(escapeHtml(rawContent));
  content = addLinkTooltips(addTickerLinks(content));

  // Handle paragraph breaks if content doesn't contain HTML
  if (!rawContent.includes('<') && rawContent.trim() !== '') {
    const paragraphs = content.split(/\n\n+/);
    content = paragraphs
      .filter((para) => para.trim() !== '')
      .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  const safeTitle = renderTitle(entry.title);
  const safeLink = entry.link ? escapeHtml(entry.link) : '';
  const titleHtml = entry.link
    ? `<a href="${safeLink}" class="entry-title-link" title="${safeLink}">${safeTitle}</a>`
    : safeTitle;
  const contentHtml = content ? `<div class="entry-content">${content}</div>` : '';
  const timeHtml = renderEntryTime(entry.time, journalDate);
  const entryClass = entry.link ? 'entry entry--link' : 'entry';

  return `<div id="${entryId}" class="${entryClass}">${timeHtml}<div class="entry-title">${titleHtml}</div>${contentHtml}</div>`;
}

function scrollToHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) {
    return;
  }

  setTimeout(() => {
    const targetElement = document.getElementById(hash);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth' });
    }
  }, 100);
}

function parseDate(dateString) {
  if (!dateString || typeof dateString !== 'string') {
    console.error('Invalid date string:', dateString);
    return new Date(0);
  }

  const parts = dateString.split('/');
  if (parts.length !== 3) {
    console.error('Date string format invalid:', dateString);
    return new Date(0);
  }

  const [month, day, year] = parts;
  const fullYear = year.length === 2 ? `20${year}` : year;
  const parsedMonth = parseInt(month, 10);
  const parsedDay = parseInt(day, 10);
  const parsedYear = parseInt(fullYear, 10);

  if (Number.isNaN(parsedMonth) || Number.isNaN(parsedDay) || Number.isNaN(parsedYear)) {
    console.error('Date parts could not be parsed:', { month, day, year });
    return new Date(0);
  }

  const date = new Date(parsedYear, parsedMonth - 1, parsedDay);
  if (Number.isNaN(date.getTime())) {
    console.error('Invalid date created:', dateString);
    return new Date(0);
  }

  return date;
}

function formatDate(dateString) {
  const date = parseDate(dateString);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    console.error('Using original date string due to parsing failure:', dateString);
    return dateString;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateForDateTime(dateString) {
  const date = parseDate(dateString);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) {
    console.error('Using original date string for datetime attribute:', dateString);
    return dateString;
  }

  return date.toISOString().split('T')[0];
}

// --- Chart Processing ---

function processChartPlaceholders(html) {
  if (!html || !html.includes('{{chart:')) return html;
  const chartRegex = /\{\{chart:([^}]+)\}\}/g;
  return html.replace(chartRegex, (match, indicatorName) => {
    const name = indicatorName.trim();
    const canvasId = name.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-' + Date.now() + Math.floor(Math.random() * 1000);
    return `<div class="chart-container" data-chart-id="${canvasId}" data-indicator="${name}"><canvas id="${canvasId}"></canvas></div>`;
  });
}

async function ensureChartJs() {
  if (window.Chart) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function renderJournalCharts() {
  const containers = document.querySelectorAll('[data-indicator]:not([data-rendered])');
  if (containers.length === 0) return;

  await ensureChartJs();

  if (!window._financialsData) {
    try {
      const response = await fetch('json/financials-data.json');
      if (response.ok) window._financialsData = await response.json();
    } catch (e) {
      console.error('Failed to load financials data:', e);
      return;
    }
  }

  const data = window._financialsData;
  if (!data || !data.indices) return;

  const isDark = document.documentElement.classList.contains('dark-mode');
  const colors = {
    PRIMARY: isDark ? '#ffffff' : '#2C5F5A',
    PRIMARY_FILL: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(44, 95, 90, 0.1)',
    SECONDARY: isDark ? '#a0a9b8' : '#6c757d',
    ACCENT: '#D4822A',
    GRID: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    TEXT: isDark ? '#a0a9b8' : '#6c757d'
  };

  function getBaseOptions() {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeInOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          mode: 'index', intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff',
          borderColor: colors.PRIMARY, borderWidth: 1, padding: 10,
          titleFont: { size: 11 }, bodyFont: { size: 11 }
        }
      },
      scales: {
        x: { display: true, grid: { display: false }, ticks: { display: true, font: { size: 9 }, color: colors.TEXT, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
        y: { display: true, beginAtZero: false, grid: { color: 'rgba(0, 0, 0, 0.03)' }, ticks: { display: false }, position: 'right' }
      },
      interaction: { mode: 'nearest', axis: 'x', intersect: false }
    };
  }

  containers.forEach(container => {
    if (container.dataset.rendered) return;
    const canvasId = container.getAttribute('data-chart-id');
    const indicatorName = container.getAttribute('data-indicator');
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const indicator = data.indices.find(i => i.name === indicatorName);
    if (!indicator) return;

    const { labels, dataPoints } = getSeriesDataFromIndicator(indicator);

    if (dataPoints.length === 0) return;

    const chartType = indicator.category === 'Prediction Markets' || indicator.bps_probabilities ? 'bar' : 'line';
    const config = {
      type: chartType,
      data: {
        labels,
        datasets: [{
          label: indicator.name || 'Data',
          data: dataPoints,
          borderColor: colors.PRIMARY,
          backgroundColor: chartType === 'bar' ? [colors.PRIMARY, colors.SECONDARY, colors.ACCENT] : colors.PRIMARY_FILL,
          borderWidth: 2,
          tension: 0.4,
          fill: chartType === 'line',
          pointBackgroundColor: colors.PRIMARY,
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          pointRadius: 3,
          pointHoverRadius: 5
        }]
      },
      options: getBaseOptions()
    };

    try {
      if (canvas._chart instanceof window.Chart) canvas._chart.destroy();
      const chart = new window.Chart(canvas.getContext('2d'), config);
      canvas._chart = chart;
      container.dataset.rendered = 'true';
    } catch (e) {
      console.error('Chart render error:', e);
    }
  });
}

async function initializeJournalPage() {
  try {
    await Promise.all([
      injectHeadNodes('components/head-meta.html', 'meta, link'),
      injectHeadNodes('components/fonts.html', 'link'),
      ...SCRIPT_COMPONENTS.map((path) => injectScriptComponent(path)),
      injectFooter()
    ]);
  } catch (error) {
    console.error('Journal component bootstrap error:', error);
  }

  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    loadScriptOnce('/_vercel/insights/script.js', { defer: true }).catch((error) => {
      console.error('Vercel insights load error:', error);
    });
  }

  loadScriptOnce('https://cdn.jsdelivr.net/npm/lucide@0.400.0/dist/umd/lucide.js', { defer: true })
    .catch((error) => console.error('Failed to load Lucide', error));

  // Check URL for article param or hash to set initial filter
  const urlParams = new URLSearchParams(window.location.search);
  const hasArticle = urlParams.has('article');
  const hash = window.location.hash;

  const filterContainer = document.getElementById('journal-filters');
  if (filterContainer) {
    // Default to Essays if article param present, otherwise use hash or default
    if (hasArticle) {
      filterContainer.querySelectorAll('.source-toggle-btn, .filter-btn').forEach(b => b.classList.remove('active'));
      const essaysBtn = filterContainer.querySelector('[data-source="news"]');
      if (essaysBtn) essaysBtn.classList.add('active');
    } else if (hash === '#docs') {
      filterContainer.querySelectorAll('.source-toggle-btn, .filter-btn').forEach(b => b.classList.remove('active'));
      const docsBtn = filterContainer.querySelector('[data-source="journal"]');
      if (docsBtn) docsBtn.classList.add('active');
    }
  }

  await loadJournalEntries();

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Filter toggle handler (filterContainer already declared above)
  if (filterContainer) {
    filterContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.source-toggle-btn, .filter-btn');
      if (!btn) return;

      filterContainer.querySelectorAll('.source-toggle-btn, .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Update URL hash for direct linking
      const source = btn.dataset.source || 'news';
      if (source === 'journal') {
        history.pushState(null, '', window.location.pathname + '#docs');
      } else {
        history.pushState(null, '', window.location.pathname);
      }

      // Reload entries with selected filter
      loadJournalEntries();
    });
  }

  // Back button handler for essay reader
  const backBtn = document.getElementById('article-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      // Hide article reader, show essay index
      const articleReader = document.getElementById('article-reader');
      const essayIndex = document.getElementById('essay-index');
      const articleStatus = document.getElementById('article-status');

      if (articleReader) articleReader.hidden = true;
      if (articleStatus) articleStatus.hidden = true;
      if (essayIndex) {
        essayIndex.hidden = false;
        // Re-render the essay index
        loadArticle();
      }

      // Update browser tab title back to Essays
      document.title = 'Essays - Howdy, Stranger';

      // Remove article param from URL
      const url = new URL(window.location.href);
      url.searchParams.delete('article');
      history.pushState(null, '', url.toString());
    });
  }

  await loadJournalEntries();

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeJournalPage);
} else {
  initializeJournalPage();
}
