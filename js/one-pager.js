const LIMITS = {
  journal: Infinity,
  essays: Infinity,
  media: Infinity,
  financials: Infinity
};
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december'
];

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

function formatEmploymentDelta(indicatorName, latestPoint, previousPoint) {
  if ((indicatorName || '') !== 'Total Nonfarm Employment') return '';
  if (!latestPoint || !previousPoint) return '';
  if (latestPoint.numericValue === null || previousPoint.numericValue === null) return '';
  const delta = Math.round(latestPoint.numericValue - previousPoint.numericValue);
  const sign = delta > 0 ? '+' : '';
  return ` (${sign}${delta.toLocaleString('en-US')})`;
}

  function getLatestIndicatorPoints(indicator) {
    const points = [];

    // Find year-nested data (newest year first)
    const yearEntries = Object.entries(indicator)
      .filter(([key, val]) => /^\d{4}$/.test(key) && val && typeof val === 'object')
      .sort(([a], [b]) => Number.parseInt(b, 10) - Number.parseInt(a, 10));

    const seenDates = new Set();

    // Add year-nested data first
    for (const [yearStr, yearData] of yearEntries) {
      const year = Number.parseInt(yearStr, 10);
      monthLabels.forEach((monthLabel, index) => {
        const monthKey = ['january','february','march','april','may','june',
                          'july','august','september','october','november','december'][index];
        const rawValue = yearData[monthKey];
        if (!rawValue || rawValue === '') return;
        const stamp = new Date(year, Number.parseInt(monthKey, 10) || index, 1).getTime();
        const dateKey = `${year}-${String(index + 1).padStart(2, '0')}`;
        if (seenDates.has(dateKey)) return;
        seenDates.add(dateKey);
        points.push({
          stamp,
          rawValue: String(rawValue),
          numericValue: parseNumericValue(rawValue),
          monthLabel: `${monthLabel} ${year}`,
          year,
          monthIndex: index
        });
      });
    }

    // Add flat structure data for months not already covered by nested year data
    const coveredMonths = new Set();
    for (const [, yearData] of yearEntries) {
      Object.keys(yearData).forEach(monthKey => {
        const idx = ['january','february','march','april','may','june',
                     'july','august','september','october','november','december']
          .indexOf(monthKey);
        if (idx >= 0) coveredMonths.add(idx);
      });
    }

    MONTHS.forEach((month, index) => {
      if (coveredMonths.has(index)) return;
      const rawValue = indicator[month];
      if (!rawValue || rawValue === '') return;
      const stamp = new Date(2025, index, 1).getTime();
      const dateKey = `flat-${String(index + 1).padStart(2, '0')}`;
      if (seenDates.has(dateKey)) return;
      seenDates.add(dateKey);
      points.push({
        stamp,
        rawValue: String(rawValue),
        numericValue: parseNumericValue(rawValue),
        monthLabel: `${month.slice(0, 3)} 2025`,
        year: 2025,
        monthIndex: index
      });
    });

    points.sort((a, b) => b.stamp - a.stamp);

    if (!points.length) {
      return { latest: null, previous: null, mom: null, yoyPrevious: null, yoy: null };
    }

    const latest = points[0];
    const previous = points.length > 1 ? points[1] : null;
    let mom = null;
    if (latest && previous && latest.numericValue !== null && previous.numericValue !== null && previous.numericValue !== 0) {
      mom = ((latest.numericValue - previous.numericValue) / previous.numericValue) * 100;
    }

    // Find YoY: same month, previous year
    const targetYear = latest.year - 1;
    const targetMonth = latest.monthIndex;
    const yoyPrevious = points.find(p => p.year === targetYear && p.monthIndex === targetMonth) || null;
    let yoy = null;
    if (latest && yoyPrevious && latest.numericValue !== null && yoyPrevious.numericValue !== null && yoyPrevious.numericValue !== 0) {
      yoy = ((latest.numericValue - yoyPrevious.numericValue) / yoyPrevious.numericValue) * 100;
    }

    return { latest, previous, mom, yoyPrevious, yoy };
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


async function loadLatestJournal() {
  const journals = await Services.dataService.fetchJSON('json/journal.json');
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
    .slice(0, LIMITS.journal);

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
      let timeAgo = '';
      const now = new Date();
      let entryDateTime;
      
      // Try to parse date from different possible sources
      if (entry.date) {
        entryDateTime = parseJournalDate(entry.date);
        if (entry.time) {
          const [hours, minutes] = entry.time.split(':').map(Number);
          entryDateTime = new Date(entryDateTime.getFullYear(), entryDateTime.getMonth(), entryDateTime.getDate(), hours, minutes);
        }
      } else if (entry.timestamp) {
        entryDateTime = new Date(entry.timestamp);
      }
      
      if (entryDateTime && entryDateTime.getTime() > 0) {
        const diffMins = Math.floor((now - entryDateTime) / 60000);
        if (diffMins < 1) timeAgo = 'now';
        else if (diffMins < 60) timeAgo = `${diffMins}m`;
        else if (diffMins < 1440) timeAgo = `${Math.floor(diffMins / 60)}h`;
        else if (diffMins < 10080) timeAgo = `${Math.floor(diffMins / 1440)}d`;
        else timeAgo = entryDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
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

async function loadLatestEssays() {
  const articles = await Services.dataService.fetchJSON('json/articles.json');
  const sorted = articles
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, LIMITS.essays);

  const lines = sorted.map(item => {
    const title = escapeHtml(cleanText(item.title));
    const summary = clip(item.summary || '', 100);
    
    // Calculate time ago
    const itemDate = new Date(item.date || 0);
    const diffMins = Math.floor((Date.now() - itemDate.getTime()) / 60000);
    let timeAgo = '';
    if (diffMins < 1) timeAgo = 'now';
    else if (diffMins < 60) timeAgo = `${diffMins}m`;
    else if (diffMins < 1440) timeAgo = `${Math.floor(diffMins / 60)}h`;
    else if (diffMins < 10080) timeAgo = `${Math.floor(diffMins / 1440)}d`;
    else timeAgo = itemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return `<span class="time-ago">${timeAgo}</span> <a href="news.html?article=${encodeURIComponent(item.id)}" target="_blank" rel="noopener noreferrer"><strong>${title}</strong>: ${escapeHtml(summary)}</a>`;
  });
  renderList('latest-essays', lines);
}



async function loadLatestMedia() {
  const media = await Services.dataService.fetchJSON('json/media.json');
  const sorted = media
    .slice()
    .sort((a, b) => {
      const dateA = new Date(a.dateAdded || a.date || 0).getTime();
      const dateB = new Date(b.dateAdded || b.date || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, LIMITS.media);

  const lines = sorted.map(item => {
    const title = escapeHtml(cleanText(item.title));
    const subtitle = clip(item.description || item.genre || item.author || item.mediaType || '', 70);
    
    // Get icon for media type, fallback to item.icon if available, then default
    const mediaType = (item.mediaType || '').toLowerCase();
    const iconName = MEDIA_CATEGORY_ICONS[mediaType] || (item.icon ? item.icon.replace('fas fa-', '').replace('fab fa-', '') : 'play-circle');
    const iconHtml = `<i data-lucide="${iconName}" class="media-bullet-icon"></i>`;
    
    // Calculate time ago
    const itemDate = new Date(item.dateAdded || item.date || 0);
    const diffMins = Math.floor((Date.now() - itemDate.getTime()) / 60000);
    let timeAgo = '';
    if (diffMins < 1) timeAgo = 'now';
    else if (diffMins < 60) timeAgo = `${diffMins}m`;
    else if (diffMins < 1440) timeAgo = `${Math.floor(diffMins / 60)}h`;
    else if (diffMins < 10080) timeAgo = `${Math.floor(diffMins / 1440)}d`;
    else timeAgo = itemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Link to media page with item ID
    const mediaUrl = `media.html?item=${encodeURIComponent(item.id)}`;
    return `<span class="time-ago">${timeAgo}</span> ${iconHtml} <a href="${mediaUrl}" target="_blank" rel="noopener noreferrer"><strong>${title}</strong>: ${escapeHtml(subtitle)}</a>`;
  });
  renderList('latest-media', lines);
}

async function loadLatestFinancials() {
  const data = await Services.dataService.fetchJSON('json/financials-data.json');
  const sorted = (data.indices || [])
    .slice()
    .sort((a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime())
    .slice(0, LIMITS.financials);

  const lines = sorted.map(item => {
    const categoryText = cleanText(item.category || 'unknown category');
    const itemHref = `financials.html?filter=${encodeURIComponent(categoryText)}`;
    
    // Calculate time ago
    const itemDate = new Date(item.lastUpdated || 0);
    const diffMins = Math.floor((Date.now() - itemDate.getTime()) / 60000);
    let timeAgo = '';
    if (diffMins < 1) timeAgo = 'now';
    else if (diffMins < 60) timeAgo = `${diffMins}m`;
    else if (diffMins < 1440) timeAgo = `${Math.floor(diffMins / 60)}h`;
    else if (diffMins < 10080) timeAgo = `${Math.floor(diffMins / 1440)}d`;
    else timeAgo = itemDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
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
    
    // Standard handling for numeric indicators
    const { latest, previous, mom, yoy } = getLatestIndicatorPoints(item);
    const value = latest ? formatDisplayValue(item.name, latest.rawValue) : 'n/a';
    const employmentDelta = formatEmploymentDelta(item.name, latest, previous);
    const displayMom = mom;
    const displayYoy = yoy;
    const momText = mom === null ? 'MoM n/a' : `MoM ${displayMom >= 0 ? '+' : ''}${displayMom.toFixed(1)}%`;
    const momClass = mom === null ? 'mom-neutral' : displayMom > 0 ? 'mom-positive' : displayMom < 0 ? 'mom-negative' : 'mom-neutral';
    const momHtml = `<span class="mom-pill ${momClass}">${escapeHtml(momText)}</span>`;
    const yoyText = yoy === null ? 'YoY n/a' : `YoY ${displayYoy >= 0 ? '+' : ''}${displayYoy.toFixed(1)}%`;
    const yoyClass = yoy === null ? 'mom-neutral' : displayYoy > 0 ? 'mom-positive' : displayYoy < 0 ? 'mom-negative' : 'mom-neutral';
    const yoyHtml = `<span class="mom-pill ${yoyClass}">${escapeHtml(yoyText)}</span>`;
    const categoryIcon = FINANCIAL_CATEGORY_ICONS[categoryText] || 'bar-chart-2';
    const iconHtml = `<i data-lucide="${categoryIcon}" class="financial-bullet-icon"></i>`;
    return `<span class="time-ago">${timeAgo}</span> ${iconHtml} <a href="${itemHref}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(cleanText(item.name))}</strong>: ${escapeHtml(value)}${escapeHtml(employmentDelta)} | ${momHtml} | ${yoyHtml}</a>`;
  });
  renderList('latest-financials', lines);
}

function setupPrintButton() {
  const button = document.getElementById('print-btn');
  if (!button) return;
  button.addEventListener('click', () => window.print());
}

async function initOnePager() {
  setGeneratedAt();
  setupPrintButton();

  await Promise.allSettled([
    loadLatestJournal(),
    loadLatestEssays(),
    loadLatestMedia(),
    loadLatestFinancials()
  ]);

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
