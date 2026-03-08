const LIMITS = {
  posts: 3,
  journal: 4,
  media: 3,
  financials: 6
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
  if (clean.endsWith('journal.html')) return 'Journal';
  if (clean.endsWith('news.html')) return 'News';
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
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  return response.json();
}

async function fetchText(path) {
  const response = await fetch(path);
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

function extractPostTitleAndSnippet(markdown, fallbackFileName) {
  const body = extractMarkdownBody(markdown);
  const headingMatch = body.match(/^#{1,3}\s+(.+)$/m);
  const title = cleanText(headingMatch?.[1]) || fallbackFileName;
  const htmlAnchorMatches = Array.from(body.matchAll(/href=["']([^"']+\.html(?:[?#][^"']*)?)["']/ig)).map(m => m[1]);
  const markdownLinkMatches = Array.from(body.matchAll(/\[[^\]]+\]\(([^)]+\.html(?:[?#][^)]+)?)\)/ig)).map(m => m[1]);
  const internalLinks = [...htmlAnchorMatches, ...markdownLinkMatches].filter(isInternalHtmlPath);
  const sourcePath = internalLinks[0] || `index.html#:~:text=${encodeURIComponent(title)}`;

  const lines = body
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#') && !line.startsWith('![') && !line.startsWith('{{'));

  const synopsis = lines
    .map(line => cleanText(line))
    .find(text =>
      text &&
      text.length >= 40 &&
      !/^view in media$/i.test(text) &&
      !/^media$/i.test(text) &&
      text.toLowerCase() !== title.toLowerCase()
    ) || cleanText(body);

  return {
    title,
    snippet: clip(synopsis, 170),
    sourcePath
  };
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
        if (!rawValue) return;
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
    if (!indicator[month]) return;
    points.push({
      stamp: new Date(2025, index, 1).getTime(),
      rawValue: String(indicator[month]),
      numericValue: parseNumericValue(indicator[month]),
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

  const headerFooterInfo = document.getElementById('header-footer-info');
  if (headerFooterInfo) {
    headerFooterInfo.innerHTML = `
      <span class="header-social-list">
        <a href="https://x.com/DocRiter" target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)" class="header-social-item">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/x.svg" alt="X" width="14" height="14">
          <span class="header-social-handle">@DocRiter</span>
        </a>
        <a href="https://www.youtube.com/@BenPalmerShow" target="_blank" rel="noopener noreferrer" aria-label="YouTube" class="header-social-item">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/youtube.svg" alt="YouTube" width="14" height="14">
          <span class="header-social-handle">@BenPalmerShow</span>
        </a>
        <a href="https://benpalmershow.substack.com" target="_blank" rel="noopener noreferrer" aria-label="Substack" class="header-social-item">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/substack.svg" alt="Substack" width="14" height="14">
          <span class="header-social-handle">benpalmershow.substack.com</span>
        </a>
        <a href="https://open.spotify.com/show/5re4DaXRuEkKHEYr3Mc6tJ" target="_blank" rel="noopener noreferrer" aria-label="Spotify" class="header-social-item">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/spotify.svg" alt="Spotify" width="14" height="14">
          <span class="header-social-handle">The Ben Palmer Show</span>
        </a>
        <a href="https://podcasts.apple.com/us/podcast/the-ben-palmer-show/id1529618289" target="_blank" rel="noopener noreferrer" aria-label="Apple Podcasts" class="header-social-item">
          <img src="https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/applepodcasts.svg" alt="Apple Podcasts" width="14" height="14">
          <span class="header-social-handle">The Ben Palmer Show</span>
        </a>
      </span>
    `;
  }
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

async function loadLatestPosts() {
  const posts = await fetchJson('json/posts.json');
  const sorted = posts
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, LIMITS.posts);

  const lines = await Promise.all(sorted.map(async (post) => {
    const fileName = post.file.split('/').pop().replace('.md', '');
    try {
      const markdown = await fetchText(post.file);
      const extracted = extractPostTitleAndSnippet(markdown, fileName);
      const readLink = `<a href="${escapeHtml(extracted.sourcePath)}" target="_blank" rel="noopener noreferrer">${pageLabelFromPath(extracted.sourcePath)}</a>`;
      return `<strong>${escapeHtml(extracted.title)}</strong> (${readLink}): ${escapeHtml(extracted.snippet)}`;
    } catch {
      const readLink = `<a href="index.html" target="_blank" rel="noopener noreferrer">Home</a>`;
      return `<strong>${escapeHtml(fileName)}</strong> (${readLink})`;
    }
  }));

  renderList('latest-posts', lines);
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

  const lines = flat.map(item => {
    const sourceLink = `<a href="${escapeHtml(item.sourcePath)}" target="_blank" rel="noopener noreferrer">${pageLabelFromPath(item.sourcePath)}</a>`;
    return `<strong>${escapeHtml(item.date)} | ${escapeHtml(item.title)}</strong> (${sourceLink}): ${escapeHtml(item.content)}`;
  });
  renderList('latest-journal', lines);
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
    const sourcePageLink = `<a href="media.html" target="_blank" rel="noopener noreferrer">Media</a>`;
    const subtitle = clip(item.description || item.genre || item.author || item.mediaType || '', 70);
    return `<strong>${title}</strong> (${sourcePageLink}): ${escapeHtml(subtitle)}`;
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
    const { latest, previous, mom } = getLatestIndicatorPoints(item);
    const value = latest ? formatDisplayValue(item.name, latest.rawValue) : 'n/a';
    const employmentDelta = formatEmploymentDelta(item.name, latest, previous);
    const momText = mom === null ? 'MoM n/a' : `MoM ${mom >= 0 ? '+' : ''}${mom.toFixed(1)}%`;
    const momClass = mom === null ? 'mom-neutral' : mom > 0 ? 'mom-positive' : mom < 0 ? 'mom-negative' : 'mom-neutral';
    const momHtml = `<span class="mom-pill ${momClass}">${escapeHtml(momText)}</span>`;
    const categoryText = cleanText(item.category || 'unknown category');
    const categoryIcon = FINANCIAL_CATEGORY_ICONS[categoryText] || 'bar-chart-2';
    const categoryIconHtml = `<i data-lucide="${categoryIcon}" class="financial-bullet-icon"></i>`;
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
    loadLatestPosts(),
    loadLatestJournal(),
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
