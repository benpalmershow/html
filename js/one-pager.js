const LIMITS = {
  journal: Infinity,
  essays: Infinity,
  media: Infinity ,
  financials: Infinity,
  worldCup: Infinity
};

// Yield helper to prevent main thread blocking
function yieldToMain() {
  return new Promise(resolve => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

// Shared time formatting utility (compact format: "now", "5m", "2h", "3d", "Jan 5")
function formatTimeAgo(dateString) {
  const postDate = new Date(dateString);
  if (isNaN(postDate)) return '';

  const now = new Date();
  const diffMins = Math.floor((now - postDate) / 60000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d`;
  return postDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format time ago for journal entries (date is "M/D/YY", optional time "HH:MM")
function formatJournalTimeAgo(date, time) {
  const now = new Date();
  let entryDateTime;

  if (date) {
    entryDateTime = parseJournalDate(date);
    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      entryDateTime = new Date(entryDateTime.getFullYear(), entryDateTime.getMonth(), entryDateTime.getDate(), hours, minutes);
    }
  }

  if (!entryDateTime || entryDateTime.getTime() <= 0) return '';

  const diffMins = Math.floor((now - entryDateTime) / 60000);
  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
  if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d`;
  return entryDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const FINANCIAL_CATEGORY_ICONS = {
  'Employment Indicators': 'users',
  'Housing Market': 'home',
  'Business Indicators': 'briefcase',
  'Consumer Indicators': 'shopping-cart',
  'Trade & Tariffs': 'ship',
  'Commodities': 'package',
  'Prediction Markets': 'trending-up'
};

const MEDIA_CATEGORY_ICONS = {
  'podcast': 'mic',
  'book': 'book-open',
  'movie': 'film',
  'album': 'music',
  'song': 'music',
  'video': 'play-circle',
  'playlist': 'music'
};

function parseJournalDate(dateString) {
  const parts = (dateString || '').split('/');
  if (parts.length !== 3) return new Date(0);
  const month = Number.parseInt(parts[0], 10);
  const day = Number.parseInt(parts[1], 10);
  const year = Number.parseInt(parts[2], 10);
  if (Number.isNaN(month) || Number.isNaN(day) || Number.isNaN(year)) return new Date(0);
  return new Date(2000 + year, month - 1, day);
}

function cleanText(input) {
  if (!input) return '';
  return String(input)
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_`>|[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clip(input, max = 160) {
  const text = cleanText(input);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}...`;
}

function escapeHtml(input) { return window.HtmlUtils.escapeHtml(input); }

function createEntryId(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function pageLabelFromPath(path) {
  const clean = String(path || '').split('?')[0].split('#')[0].toLowerCase();
  if (clean.endsWith('media.html')) return 'Media';
  if (clean.endsWith('financials.html')) return 'Financials';
  if (clean.endsWith('journal.html')) return 'Docs';
  if (clean.endsWith('index.html')) return 'Home';
  return 'Page';
}

function isInternalHtmlPath(path) {
  const value = String(path || '').trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) {
    return /https?:\/\/(www\.)?howdystranger\.net\//i.test(value) && /\.html([?#].*)?$/i.test(value);
  }
  return /\.html([?#].*)?$/i.test(value);
}

function extractMarkdownBody(markdown) {
   const parts = markdown.split(/^---$/m);
   if (parts.length >= 3) {
     return parts.slice(2).join('---').trim();
   }
   return markdown.trim();
 }

 function parseNumericValue(raw) {
   return window.HtmlUtils.parseNumericValue(raw);
 }

 function formatDisplayValue(indicatorName, rawValue) {
   const text = cleanText(rawValue || '');
   if (!text) return 'n/a';

   const needsPercent = /(rate|yield|unemployment)/i.test(indicatorName || '');
   if (needsPercent && !text.includes('%')) {
     return `${text}%`;
   }
   return text;
 }

 function setGeneratedAt() {
  const generatedAt = document.getElementById('generated-at');
  if (!generatedAt) return;
  generatedAt.textContent = `Generated ${new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })}`;
}

function renderList(id, items) {
  const target = document.getElementById(id);
  if (!target) return;
  if (!items.length) {
    target.innerHTML = '<li>No updates found.</li>';
    return;
  }
  target.innerHTML = items.map(item => `<li>${item}</li>`).join('');
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}


async function loadLatestJournal(limit = LIMITS.journal) {
  const journals = await Services.dataService.fetchJSON('json/journal.json');
  
  // Yield after fetch before heavy processing
  await yieldToMain();
  
  const flat = journals
    .slice()
    .sort((a, b) => parseJournalDate(b.date).getTime() - parseJournalDate(a.date).getTime())
    .flatMap(group =>
      (group.entries || []).map(entry => ({
        date: group.date,
        time: entry.time,
        title: cleanText(entry.title),
        content: clip(entry.content, 135),
        sourcePath: `journal.html#${createEntryId(entry.title)}`
      }))
    )
    .slice(0, limit);

  // Group entries by date but don't show date headers
  const groupedByDate = {};
  flat.forEach(item => {
    if (!groupedByDate[item.date]) {
      groupedByDate[item.date] = [];
    }
    groupedByDate[item.date].push(item);
  });

  const lines = [];
  Object.keys(groupedByDate).forEach(date => {
    const entries = groupedByDate[date];

    // Add entries for this date without date header
    entries.forEach(entry => {
      const timeAgo = formatJournalTimeAgo(entry.date, entry.time);
      const entryId = createEntryId(entry.title);
      const linkUrl = entry.url || entry.sourcePath;
      lines.push(`<li class="compact-entry"><span class="time-ago">${timeAgo}</span> <a href="${linkUrl}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(entry.title)}</strong></a> ${escapeHtml(entry.content)}</li>`);
    });
  });

  // Render with custom HTML since we have mixed content
  const target = document.getElementById('latest-journal');
  if (!target) return;
  if (!lines.length) {
    target.innerHTML = '<li>No updates found.</li>';
    return;
  }
  target.innerHTML = lines.join('');
  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}


async function loadLatestMedia(limit = LIMITS.media) {
  const media = await Services.dataService.fetchJSON('json/media.json');
  
  // Yield after fetch before heavy processing
  await yieldToMain();
  
  const sorted = media
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.dateAdded || a.date || 0).getTime();
      const dateB = new Date(b.dateAdded || b.date || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, limit);

  const lines = sorted.map(item => {
    const title = escapeHtml(cleanText(item.title));
    const subtitle = clip(item.description || item.genre || item.author || item.mediaType || '', 70);

    // Get icon for media type, fallback to item.icon if available, then default
    const mediaType = (item.mediaType || '').toLowerCase();
    const iconName = MEDIA_CATEGORY_ICONS[mediaType] || (item.icon ? item.icon.replace('fas fa-', '').replace('fab fa-', '') : 'play-circle');
    const iconHtml = `<i data-lucide="${iconName}" class="media-bullet-icon"></i>`;

    // Calculate time ago
    const timeAgo = formatTimeAgo(item.dateAdded || item.date);

    // Link to media page with item ID
    const mediaUrl = `media.html?item=${encodeURIComponent(item.id)}`;
    return `<span class="time-ago">${timeAgo}</span> ${iconHtml} <a href="${mediaUrl}" target="_blank" rel="noopener noreferrer"><strong>${title}</strong>: ${escapeHtml(subtitle)}</a>`;
  });
  renderList('latest-media', lines);
}

async function loadLatestFinancials(limit = LIMITS.financials) {
  const data = await Services.dataService.fetchJSON('json/financials-data.json');
  
  // Yield after fetch before heavy processing
  await yieldToMain();
  
  const sorted = (data.indices || [])
    .slice()
    .sort((a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime())
    .slice(0, limit);

  const lines = sorted.map(item => {
    const categoryText = cleanText(item.category || 'unknown category');
    const itemHref = `financials.html?filter=${encodeURIComponent(categoryText)}`;

    // Calculate time ago
    const timeAgo = formatTimeAgo(item.lastUpdated);

    // Special handling for prediction markets with various data structures
    if (item.rate_hold_odds || item.rate_cut_odds || item.rate_hike_odds) {
      // FOMC Rate Decision format
      const categoryIcon = FINANCIAL_CATEGORY_ICONS[categoryText] || 'bar-chart-2';
      const iconHtml = `<i data-lucide="${categoryIcon}" class="financial-bullet-icon"></i>`;

      const odds = [];
      if (item.rate_hold_odds) odds.push(`Hold: ${item.rate_hold_odds}`);
      if (item.rate_cut_odds) odds.push(`Cut: ${item.rate_cut_odds}`);
      if (item.rate_hike_odds) odds.push(`Hike: ${item.rate_hike_odds}`);

      return `<span class="time-ago">${timeAgo}</span> ${iconHtml} <a href="${itemHref}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(cleanText(item.name))}</strong>: ${escapeHtml(odds.join(' | '))}</a>`;
    }
    
    if (item.yes_probability || item.no_probability || (item.candidates && typeof item.candidates === 'object')) {
      // Yes/No markets or candidates markets
      const categoryIcon = FINANCIAL_CATEGORY_ICONS[categoryText] || 'bar-chart-2';
      const iconHtml = `<i data-lucide="${categoryIcon}" class="financial-bullet-icon"></i>`;
      
      let displayText = '';
      if (item.yes_probability && item.no_probability) {
        displayText = `Yes: ${item.yes_probability} | No: ${item.no_probability}`;
      } else if (item.candidates && typeof item.candidates === 'object') {
        const candidateList = Object.entries(item.candidates)
          .slice(0, 3) // Show top 3 candidates
          .map(([name, odds]) => `${name}: ${odds}`);
        displayText = candidateList.join(' | ');
      }
      
      return `<span class="time-ago">${timeAgo}</span> ${iconHtml} <a href="${itemHref}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(cleanText(item.name))}</strong>: ${escapeHtml(displayText)}</a>`;
    }
    
// Standard handling for numeric indicators - use shared utility functions
    const dataUtils = window.DataUtils || { getLatestMonthForIndicator: () => ({ monthIndex: -1, monthName: '' }), calculateMoMChange: () => null, calculateYoYChange: () => null };
    const latestMonth = dataUtils.getLatestMonthForIndicator(item, MONTHS);
    const momResult = dataUtils.calculateMoMChange(item, MONTHS);
    const yoyResult = dataUtils.calculateYoYChange(item, MONTHS);
    
    // Get latest value from year-nested or flat data
    let latestValue = null;
    const yearEntries = Object.entries(item)
      .filter(([key, val]) => /^\d{4}$/.test(key) && val && typeof val === 'object')
      .sort(([a], [b]) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
    
    if (yearEntries.length > 0) {
      const [latestYear, yearData] = yearEntries[0];
      const monthKey = MONTHS[latestMonth.monthIndex];
      latestValue = yearData[monthKey];
    } else {
      latestValue = item[latestMonth.monthName];
    }
    
    const value = latestValue ? formatDisplayValue(item.name, latestValue) : 'n/a';
    const momPercent = momResult ? momResult.percentChange : null;
    const yoyPercent = yoyResult ? yoyResult.percentChange : null;
    const momText = momPercent === null ? 'MoM n/a' : `MoM ${momPercent >= 0 ? '+' : ''}${momPercent.toFixed(1)}%`;
    const momClass = momPercent === null ? 'mom-neutral' : momPercent > 0 ? 'mom-positive' : momPercent < 0 ? 'mom-negative' : 'mom-neutral';
    const momHtml = `<span class="mom-pill ${momClass}">${escapeHtml(momText)}</span>`;
    const yoyText = yoyPercent === null ? 'YoY n/a' : `YoY ${yoyPercent >= 0 ? '+' : ''}${yoyPercent.toFixed(1)}%`;
    const yoyClass = yoyPercent === null ? 'mom-neutral' : yoyPercent > 0 ? 'mom-positive' : yoyPercent < 0 ? 'mom-negative' : 'mom-neutral';
    const yoyHtml = `<span class="mom-pill ${yoyClass}">${escapeHtml(yoyText)}</span>`;
    const categoryIcon = FINANCIAL_CATEGORY_ICONS[categoryText] || 'bar-chart-2';
    const iconHtml = `<i data-lucide="${categoryIcon}" class="financial-bullet-icon"></i>`;
    return `<span class="time-ago">${timeAgo}</span> ${iconHtml} <a href="${itemHref}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(cleanText(item.name))}</strong>: ${escapeHtml(value)} | ${momHtml} | ${yoyHtml}</a>`;
  });
  renderList('latest-financials', lines);
}

async function loadLatestWorldCup(limit = LIMITS.worldCup) {
  try {
    const data = await Services.dataService.fetchJSON('json/world-cup.json');
    
    // Yield after fetch before heavy processing
    await yieldToMain();
    
    const matches = (data.matches || [])
      .filter(m => m.teamA?.name && m.teamB?.name)
      .sort((a, b) => {
        const aScore = (a.teamA.score != null && a.teamB.score != null) ? 1 : 0;
        const bScore = (b.teamA.score != null && b.teamB.score != null) ? 1 : 0;
        if (aScore !== bScore) return bScore - aScore;
        return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
      })
      .slice(0, limit);

    const container = document.getElementById('latest-world-cup');
    if (!container) return;
    container.innerHTML = '';

    if (!matches.length) {
      container.innerHTML = '<li>No matches found.</li>';
      return;
    }

    matches.forEach(match => {
      const scoreA = match.teamA.score;
      const scoreB = match.teamB.score;
      const hasScore = scoreA !== null && scoreA !== undefined && scoreB !== null && scoreB !== undefined;
      const scoreText = hasScore ? `${scoreA} - ${scoreB}` : 'vs';
      const timeAgo = formatTimeAgo(match.date);
      const li = document.createElement('li');
      li.className = 'wc-compact-match';
      li.innerHTML = `
        <span class="time-ago">${timeAgo}</span>
        <span class="wc-team wc-team-a"><span class="wc-team-name">${escapeHtml(match.teamA.name)}</span> <span class="wc-flag">${match.teamA.flag || '🏳️'}</span></span>
        <span class="wc-score">${scoreText}</span>
        <span class="wc-team wc-team-b"><span class="wc-flag">${match.teamB.flag || '🏳️'}</span> <span class="wc-team-name">${escapeHtml(match.teamB.name)}</span></span>
      `;
      container.appendChild(li);
    });
  } catch (error) {
    console.error('Failed to load World Cup data for one-pager:', error);
    const target = document.getElementById('latest-world-cup');
    if (target) target.innerHTML = '<li>Failed to load matches.</li>';
  }
}

function setupPrintButton() {
  const button = document.getElementById('print-btn');
  if (!button) return;
  button.addEventListener('click', () => window.print());
}

async function initOnePager() {
  setGeneratedAt();
  setupPrintButton();

  // Load data with yielding between operations to reduce blocking
  await loadLatestWorldCup();
  await yieldToMain();
  
  await loadLatestJournal();
  await yieldToMain();
  
  await loadLatestMedia();
  await yieldToMain();
  
  await loadLatestFinancials();

  const params = new URLSearchParams(window.location.search);
  if (params.get('autoprint') === '1') {
    setTimeout(() => window.print(), 250);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOnePager);
} else {
  initOnePager();
}
