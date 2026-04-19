function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeHtml(html) {
  if (!html) return '';

  let cleanHtml;

  if (window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
    cleanHtml = window.DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form'],
      ADD_ATTR: ['loading', 'decoding', 'fetchpriority']
    });
  } else {
    const template = document.createElement('template');
    template.innerHTML = html;
    template.content.querySelectorAll('script, style, iframe, object, embed, form').forEach(node => node.remove());
    cleanHtml = template.innerHTML;
  }

  // Apply image optimization to sanitized HTML
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

async function ensureHtmlSanitizer() {
  if (window.DOMPurify) {
    return;
  }

  if (window.loadDOMPurify && typeof window.loadDOMPurify === 'function') {
    try {
      await window.loadDOMPurify();
      return;
    } catch (error) {
      console.warn('DOMPurify loader failed, using fallback sanitizer', error);
    }
  }

  await new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/dompurify@3.2.6/dist/purify.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

function linkify(text) {
  const urlRegex = /https?:\/\/[^\s]+/g;
  return text.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
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

async function waitForMarked() {
  if (window.marked) {
    return;
  }

  // Try using the preloaded loader from posts-loader module
  if (window.loadMarked && typeof window.loadMarked === 'function') {
    return window.loadMarked();
  }

  // Fallback: polling
  return new Promise((resolve) => {
    let attempts = 0;
    const checkInterval = setInterval(() => {
      attempts++;
      if (window.marked) {
        clearInterval(checkInterval);
        resolve();
      } else if (attempts >= 50) {
        clearInterval(checkInterval);
        console.error('Marked.js not loaded');
        resolve();
      }
    }, 100);
  });
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

     // Optimize first image for LCP: eager load the first image that appears in the viewport
     const firstImage = journalFeed.querySelector('.journal-entry img');
     if (firstImage) {
       firstImage.setAttribute('loading', 'eager');
       firstImage.setAttribute('fetchpriority', 'high');
       firstImage.setAttribute('decoding', 'async');
     }

     journalFeed.querySelectorAll('[data-collapsible]').forEach(el => {
      el.querySelector('.entry-title').addEventListener('click', () => {
        el.classList.toggle('entry--collapsed');
      });
    });

    renderJournalCharts();
    scrollToHash();
    if (window.lucide) {
      window.lucide.createIcons();
    }
  } catch (error) {
    console.error('Error loading journal entries:', error);
    journalFeed.innerHTML = '<div class="error-state">Error loading journal entries. Please try again later.</div>';
  }
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
  return addTickerLinks(safeTitle);
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
    const safeContent = addTickerLinks(sanitizeHtml(processedContent));
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
   content = addTickerLinks(content);
   
   // Handle paragraph breaks if content doesn't contain HTML
   if (!rawContent.includes('<') && rawContent.trim() !== '') {
     const paragraphs = content.split(/\n\n+/);
     content = paragraphs
       .filter(para => para.trim() !== '')
       .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
       .join('');
   }

   if (entry.link) {
     let iconHtml = '';
     let linkIcon = entry.linkIcon;
     let linkAssetIcon = entry.linkAssetIcon;

     // Auto-standardize icons based on destination if not explicitly provided
     if (!linkIcon && !linkAssetIcon) {
       if (entry.link.includes('media.html')) {
         linkAssetIcon = 'images/media.webp';
       } else if (entry.link.includes('financials.html')) {
         linkAssetIcon = 'images/read.webp';
       } else if (entry.link.includes('x.com')) {
         linkIcon = 'x';
       }
     }

     if (linkIcon) {
       iconHtml = ` <i data-lucide="${linkIcon}" class="entry-link-icon"></i>`;
     } else if (linkAssetIcon) {
       iconHtml = ` <img src="${linkAssetIcon}" class="entry-link-asset-icon" alt="">`;
     }

     const contentPart = content ? `<div class="entry-link-content">${content}</div>` : '';
     const innerHtml = `<div class="entry-link-header"><div class="entry-link-title">${entry.title}</div>${iconHtml}</div>${contentPart}`;
const linkedBadge = `<a href="${entry.link}" class="entry-title-link">${innerHtml}</a>`;
      const timeHtml = renderEntryTime(entry.time, journalDate);
      return `<div id="${entryId}" class="entry entry--link">${timeHtml}<div class="entry-title">${sanitizeHtml(linkedBadge)}</div></div>`;
    }

    const safeTitle = renderTitle(entry.title);
    const contentHtml = content ? `<div class="entry-content">${content}</div>` : '';
    const timeHtml = renderEntryTime(entry.time, journalDate);
    return `<div id="${entryId}" class="entry">${timeHtml}<div class="entry-title">${safeTitle}</div>${contentHtml}</div>`;
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
    PRIMARY: isDark ? '#87c5be' : '#2C5F5A',
    PRIMARY_FILL: isDark ? 'rgba(135, 197, 190, 0.1)' : 'rgba(44, 95, 90, 0.1)',
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

  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

  containers.forEach(container => {
    if (container.dataset.rendered) return;
    const canvasId = container.getAttribute('data-chart-id');
    const indicatorName = container.getAttribute('data-indicator');
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const indicator = data.indices.find(i => i.name === indicatorName);
    if (!indicator) return;

    let labels = [], dataPoints = [];

    if (indicator.bps_probabilities) {
      labels = Object.keys(indicator.bps_probabilities);
      dataPoints = Object.values(indicator.bps_probabilities).map(v => parseFloat(v));
    } else if (indicator.candidates && typeof indicator.candidates === 'object') {
      for (const [name, prob] of Object.entries(indicator.candidates)) {
        const val = parseFloat(String(prob).replace(/[^0-9.-]/g, ''));
        if (!isNaN(val)) { labels.push(name); dataPoints.push(val); }
      }
    } else {
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
          if (!yearData || typeof yearData !== 'object') continue;
          months.forEach((month, index) => {
            const value = yearData[month];
            if (value && value.toString().trim()) {
              const numValue = parseFloat(value.toString().replace(/[^0-9.-]/g, ''));
              if (!isNaN(numValue)) dataMap[`${year}-${index}`] = { month, monthIndex: index, value: numValue, year };
            }
          });
        }
        const sortedData = Object.values(dataMap).sort((a, b) => {
          if (a.year !== b.year) return (a.year || 2025) - (b.year || 2025);
          return a.monthIndex - b.monthIndex;
        });
        labels = sortedData.map(item => item.month.slice(0, 3));
        dataPoints = sortedData.map(item => item.value);
      } else {
        months.forEach(m => {
          if (indicator[m]) {
            const val = parseFloat(indicator[m].replace(/[^0-9.-]/g, ''));
            if (!isNaN(val)) { dataPoints.push(val); labels.push(m.slice(0, 3)); }
          }
        });
      }
    }

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

// Load entries when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadJournalEntries);
} else {
  loadJournalEntries();
}
