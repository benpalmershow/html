const LIMITS = {
  journal: 10,
  essays: 5,
  media: 8,
  financials: 10
};
const PAGE_LOAD_VERSION = Date.now();

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

function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

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

async function fetchJson(path) {
  const separator = path.includes('?') ? '&' : '?';
  const cacheBustPath = `${path}${separator}v=${PAGE_LOAD_VERSION}`;
  const response = await fetch(cacheBustPath, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  return response.json();
}

async function fetchText(path) {
  const separator = path.includes('?') ? '&' : '?';
  const cacheBustPath = `${path}${separator}v=${PAGE_LOAD_VERSION}`;
  const response = await fetch(cacheBustPath, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  return response.text();
}

function extractMarkdownBody(markdown) {
  const parts = markdown.split(/^---$/m);
  if (parts.length >= 3) {
    return parts.slice(2).join('---').trim();
  }
  return markdown.trim();
}


function parseNumericValue(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  const text = String(raw).trim().replace(/,/g, '');
  const match = text.match(/[-+]?\d*\.?\d+/);
  if (!match) return null;

  let num = Number.parseFloat(match[0]);
  if (Number.isNaN(num)) return null;

  const suffix = text.slice((match.index || 0) + match[0].length).trim().charAt(0).toUpperCase();
  if (suffix === 'K') num *= 1_000;
  if (suffix === 'M') num *= 1_000_000;
  if (suffix === 'B') num *= 1_000_000_000;

  return num;
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

  Object.keys(indicator).forEach((key) => {
    if (/^\d{4}$/.test(key) && indicator[key] && typeof indicator[key] === 'object') {
      MONTHS.forEach((month, index) => {
        const rawValue = indicator[key][month];
        if (!rawValue || rawValue === '') return;
        points.push({
          stamp: new Date(Number.parseInt(key, 10), index, 1).getTime(),
          rawValue: String(rawValue),
          numericValue: parseNumericValue(rawValue),
          monthLabel: `${month.slice(0, 3)} ${key}`
        });
      });
    }
  });

  // Fallback for legacy flat month keys when nested year data is missing.
  MONTHS.forEach((month, index) => {
    const rawValue = indicator[month];
    if (!rawValue || rawValue === '') return;
    points.push({
      stamp: new Date(2025, index, 1).getTime(),
      rawValue: String(rawValue),
      numericValue: parseNumericValue(rawValue),
      monthLabel: `${month.slice(0, 3)} 2025`
    });
  });

  points.sort((a, b) => b.stamp - a.stamp);

  if (!points.length) {
    return { latest: null, previous: null, mom: null };
  }

  const latest = points[0];
  const previous = points.length > 1 ? points[1] : null;
  let mom = null;
  if (latest && previous && latest.numericValue !== null && previous.numericValue !== null && previous.numericValue !== 0) {
    mom = ((latest.numericValue - previous.numericValue) / previous.numericValue) * 100;
  }

  return { latest, previous, mom };
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
  const journals = await fetchJson('json/journal.json');
  const flat = journals
    .slice()
    .sort((a, b) => parseJournalDate(b.date).getTime() - parseJournalDate(a.date).getTime())
    .flatMap(group =>
      (group.entries || []).map(entry => ({
        date: group.date,
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
      lines.push(`<li class="journal-entry"><strong>${escapeHtml(entry.title)}</strong>: ${escapeHtml(entry.content)}</li>`);
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
  const articles = await fetchJson('json/articles.json');
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
    
    return `<a href="news.html?article=${encodeURIComponent(item.id)}" style="text-decoration:none; color:inherit;"><strong>${title}</strong>: ${escapeHtml(summary)}</a>`;
  });
  renderList('latest-essays', lines);
}

async function loadFeaturedPodcast() {
  const mediaItems = await fetchJson('json/media.json');
  if (!mediaItems || !Array.isArray(mediaItems)) return;

  const tbpsLatest = mediaItems
    .filter(m => m.author === 'TBPS' && (m.mediaType === 'podcast' || m.icon?.includes('podcast')))
    .sort((a, b) => {
      const dateA = new Date(a.dateAdded || a.date || 0).getTime();
      const dateB = new Date(b.dateAdded || b.date || 0).getTime();
      return dateB - dateA;
    })[0];

  if (!tbpsLatest) return;

  const target = document.getElementById('featured-podcast-container');
  if (!target) return;

  const titleText = cleanText(tbpsLatest.title);
  const descText = clip(tbpsLatest.description || 'Listen to the latest episode of The Ben Palmer Show.', 180);
  
  const linksHtml = (tbpsLatest.links || []).map(link => {
    const labelLower = (link.label || link.name || '').toLowerCase();
    let iconHtml = '<i data-lucide="external-link"></i>';
    
    if (labelLower.includes('spotify')) {
      iconHtml = '<img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/spotify.svg" class="pill-brand-icon" alt="Spotify">';
    } else if (labelLower.includes('youtube')) {
      iconHtml = '<img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg" class="pill-brand-icon" alt="YouTube">';
    } else if (labelLower.includes('apple')) {
      iconHtml = '<img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/applepodcasts.svg" class="pill-brand-icon" alt="Apple Podcasts">';
    } else {
      iconHtml = '<i data-lucide="external-link"></i>';
    }
    
    return `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="podcast-link-pill">${iconHtml} ${escapeHtml(link.label || link.name)}</a>`;
  }).join('');

  const coverImg = tbpsLatest.cover ? `<img src="${escapeHtml(tbpsLatest.cover)}" alt="Podcast Cover" class="featured-podcast-image">` : '';

  target.innerHTML = `
    <article class="featured-podcast-card">
      ${coverImg}
      <div class="featured-podcast-content">
        <div class="featured-kicker">Latest Episode</div>
        <h2 class="featured-podcast-title">${escapeHtml(titleText)}</h2>
        <p class="featured-podcast-description">${escapeHtml(descText)}</p>
        <div class="featured-podcast-links">
          ${linksHtml}
        </div>
      </div>
    </article>
  `;

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

async function loadLatestMedia() {
  const media = await fetchJson('json/media.json');
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
    
    return `${iconHtml} <strong>${title}</strong>: ${escapeHtml(subtitle)}`;
  });
  renderList('latest-media', lines);
}

async function loadLatestFinancials() {
  const data = await fetchJson('json/financials-data.json');
  const sorted = (data.indices || [])
    .slice()
    .sort((a, b) => new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime())
    .slice(0, LIMITS.financials);

  const lines = sorted.map(item => {
    // Special handling for prediction markets with various data structures
    if (item.rate_hold_odds || item.rate_cut_odds || item.rate_hike_odds) {
      // FOMC Rate Decision format
      const categoryText = cleanText(item.category || 'unknown category');
      const categoryIcon = FINANCIAL_CATEGORY_ICONS[categoryText] || 'bar-chart-2';
      const categoryHref = `financials.html?filter=${encodeURIComponent(categoryText)}`;
      const categoryIconHtml = `<a href="${categoryHref}" target="_blank" rel="noopener noreferrer" class="financial-bullet-link" aria-label="Open ${escapeHtml(categoryText)} in Financials" title="${escapeHtml(categoryText)}"><i data-lucide="${categoryIcon}" class="financial-bullet-icon"></i></a>`;
      
      const odds = [];
      if (item.rate_hold_odds) odds.push(`Hold: ${item.rate_hold_odds}`);
      if (item.rate_cut_odds) odds.push(`Cut: ${item.rate_cut_odds}`);
      if (item.rate_hike_odds) odds.push(`Hike: ${item.rate_hike_odds}`);
      
      return `${categoryIconHtml} <strong>${escapeHtml(cleanText(item.name))}</strong>: ${escapeHtml(odds.join(' | '))}`;
    }
    
    if (item.yes_probability || item.no_probability || (item.candidates && typeof item.candidates === 'object')) {
      // Yes/No markets or candidates markets
      const categoryText = cleanText(item.category || 'unknown category');
      const categoryIcon = FINANCIAL_CATEGORY_ICONS[categoryText] || 'bar-chart-2';
      const categoryHref = `financials.html?filter=${encodeURIComponent(categoryText)}`;
      const categoryIconHtml = `<a href="${categoryHref}" target="_blank" rel="noopener noreferrer" class="financial-bullet-link" aria-label="Open ${escapeHtml(categoryText)} in Financials" title="${escapeHtml(categoryText)}"><i data-lucide="${categoryIcon}" class="financial-bullet-icon"></i></a>`;
      
      let displayText = '';
      if (item.yes_probability && item.no_probability) {
        displayText = `Yes: ${item.yes_probability} | No: ${item.no_probability}`;
      } else if (item.candidates && typeof item.candidates === 'object') {
        const candidateList = Object.entries(item.candidates)
          .slice(0, 3) // Show top 3 candidates
          .map(([name, odds]) => `${name}: ${odds}`);
        displayText = candidateList.join(' | ');
      }
      
      return `${categoryIconHtml} <strong>${escapeHtml(cleanText(item.name))}</strong>: ${escapeHtml(displayText)}`;
    }
    
    // Standard handling for numeric indicators
    const { latest, previous, mom } = getLatestIndicatorPoints(item);
    const value = latest ? formatDisplayValue(item.name, latest.rawValue) : 'n/a';
    const employmentDelta = formatEmploymentDelta(item.name, latest, previous);
    const momText = mom === null ? 'MoM n/a' : `MoM ${mom >= 0 ? '+' : ''}${mom.toFixed(1)}%`;
    const momClass = mom === null ? 'mom-neutral' : mom > 0 ? 'mom-positive' : mom < 0 ? 'mom-negative' : 'mom-neutral';
    const momHtml = `<span class="mom-pill ${momClass}">${escapeHtml(momText)}</span>`;
    const categoryText = cleanText(item.category || 'unknown category');
    const categoryIcon = FINANCIAL_CATEGORY_ICONS[categoryText] || 'bar-chart-2';
    const categoryHref = `financials.html?filter=${encodeURIComponent(categoryText)}`;
    const categoryIconHtml = `<a href="${categoryHref}" target="_blank" rel="noopener noreferrer" class="financial-bullet-link" aria-label="Open ${escapeHtml(categoryText)} in Financials" title="${escapeHtml(categoryText)}"><i data-lucide="${categoryIcon}" class="financial-bullet-icon"></i></a>`;
    return `${categoryIconHtml} <strong>${escapeHtml(cleanText(item.name))}</strong>: ${escapeHtml(value)}${escapeHtml(employmentDelta)} | ${momHtml}`;
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
    loadFeaturedPodcast(),
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
