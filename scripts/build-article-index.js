#!/usr/bin/env node
/**
 * Article manifest builder.
 *
 * Reads every markdown source under article/ and writes json/article-index.json:
 * the single index the client-rendered article page, the feed, and the sitemaps
 * use to resolve a slug to a title, date, and source file. No HTML is written
 * to disk, so the repository holds one manifest instead of one page per article.
 *
 * Usage: node scripts/build-article-index.js
 */

const fs = require('fs');
const path = require('path');
const MarkdownUtils = require('../js/markdown.js');

const ROOT = path.join(__dirname, '..');
const SITE_URL = 'https://howdystranger.net';
const INDEX_FILE = path.join(ROOT, 'json/article-index.json');
const JOURNAL_FILE = path.join(ROOT, 'json/journal.json');

// article/draft is intentionally excluded: drafts are not published.
const SOURCE_DIRS = ['article', 'article/posts', 'article/docs', 'article/archive/posts'];
const EXCLUDED_DIRS = ['article/draft'];

// Set ARTICLE_MIN_WORDS to keep short notes out of the index; their feed
// links then fall back to the journal page anchor.
const MIN_WORDS = Number(process.env.ARTICLE_MIN_WORDS || 0);

const { escapeHtml, parseMarkdown, normalizeContent } = MarkdownUtils;

const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}\u{23E9}-\u{23FA}\u{2049}\u{203C}\u{2B50}]/gu;

function slugify(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/, '');
}

function stripEmoji(text) {
  return String(text || '').replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').trim();
}

/** Titles may arrive as HTML or with markdown emphasis; keep them plain. */
function cleanTitle(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, '')
    .replace(/^\s*(\*\*|__)\s*(.*?)\s*\1\s*$/, '$2')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseFrontmatter(raw) {
  const meta = {};
  const match = String(raw || '').match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { meta, body: String(raw || '').trim() };

  match[1].split('\n').forEach(line => {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) return;
    let value = kv[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[kv[1].trim()] = value;
  });

  return { meta, body: match[2].trim() };
}

function parseDate(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));

  m = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));

  m = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let year = +m[3];
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, +m[1] - 1, +m[2]));
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isoDate(date) {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

function isoDateTime(date) {
  if (!date) return null;
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function formatDate(date) {
  if (!date) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
}

function firstHeading(body, level) {
  const match = body.match(new RegExp('^#{' + level + '}\\s+(.+)$', 'm'));
  return match ? match[1].trim() : '';
}

/**
 * Short posts often lead with a bolded title instead of a heading, optionally
 * preceded by a Lucide icon.
 */
function leadingStrongTitle(body) {
  const match = body.match(/^\s*(?:<i\b[^>]*>\s*<\/i>\s*)?(?:<b>|\*\*)\s*([\s\S]*?)\s*(?:<\/b>|\*\*)/i);
  if (!match) return '';
  return match[1].replace(/<[^>]*>/g, '').trim();
}

function plainText(markdown) {
  return String(markdown || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[([^\]]*)]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^[#>\-*|]+\s*/gm, ' ')
    .replace(/[*_`~]/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function buildSummary(meta, body) {
  if (meta.summary) {
    const summary = plainText(meta.summary);
    if (summary) return summary.length > 200 ? summary.slice(0, 197).trimEnd() + '…' : summary;
  }
  const paragraph = body.split(/\n\s*\n/).find(block => block.trim() && !block.trim().startsWith('#') && !block.trim().startsWith('<'));
  const summary = plainText(paragraph || '');
  if (!summary) return '';
  return summary.length > 200 ? summary.slice(0, 197).trimEnd() + '…' : summary;
}

function collectSources() {
  const files = [];
  SOURCE_DIRS.forEach(dir => {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) return;
    fs.readdirSync(full)
      .filter(name => name.endsWith('.md'))
      .forEach(name => files.push(path.join(dir, name)));
  });

  return files.filter(file => !EXCLUDED_DIRS.some(dir => file.startsWith(dir + '/')));
}

function buildJournalLookup() {
  const lookup = new Map();
  if (!fs.existsSync(JOURNAL_FILE)) return lookup;

  const days = JSON.parse(fs.readFileSync(JOURNAL_FILE, 'utf8'));
  days.forEach(day => {
    (day.entries || []).forEach(entry => {
      if (!entry.file || lookup.has(entry.file)) return;
      lookup.set(entry.file, {
        title: entry.title || '',
        tags: Array.isArray(entry.tags) ? entry.tags : [],
        category: entry.category || '',
        date: day.date || '',
        time: entry.time || ''
      });
    });
  });

  return lookup;
}

function buildRecord(relativePath, journalEntry) {
  const absolute = path.join(ROOT, relativePath);
  const raw = fs.readFileSync(absolute, 'utf8');
  const { meta, body } = parseFrontmatter(raw);
  const slug = path.basename(relativePath, '.md');

  const journalTitle = journalEntry ? cleanTitle(stripEmoji(journalEntry.title)) : '';
  const frontmatterTitle = meta.title ? cleanTitle(stripEmoji(meta.title)) : '';
  const bodyTitle = cleanTitle(stripEmoji(firstHeading(body, 1)))
    || cleanTitle(stripEmoji(firstHeading(body, 2)))
    || cleanTitle(stripEmoji(firstHeading(body, 3)))
    || cleanTitle(stripEmoji(leadingStrongTitle(body)));

  const title = frontmatterTitle || journalTitle || bodyTitle || slug.replace(/[-_]+/g, ' ');

  // Matches the slug the journal feed assigns to the same entry, so links that
  // fall back to /journal.html#<slug> land on the right card.
  const journalSlug = journalEntry && journalEntry.title ? slugify(journalEntry.title) : slugify(title);

  const dates = [meta.date, journalEntry ? journalEntry.date : '', ''].map(parseDate).filter(Boolean);
  const date = dates.length ? dates[0] : parseDate(fs.statSync(absolute).mtime.toISOString());

  const category = meta.category || (journalEntry && journalEntry.category) || 'journal';
  const summary = buildSummary(meta, body);
  const url = '/article.html?slug=' + encodeURIComponent(slug);

  const html = normalizeContent(parseMarkdown(raw));
  const wordCount = plainText(body).split(/\s+/).filter(Boolean).length;

  return {
    slug,
    url,
    source: relativePath,
    title,
    journalSlug,
    date: isoDate(date),
    dateTime: isoDateTime(date),
    category,
    summary,
    tags: journalEntry ? journalEntry.tags : [],
    wordCount,
    readingMinutes: Math.max(1, Math.round(wordCount / 220)),
    html
  };
}

function main() {
  const journalLookup = buildJournalLookup();
  const sources = collectSources();

  const records = [];
  const skipped = [];
  const slugs = new Map();

  sources.forEach(relativePath => {
    const record = buildRecord(relativePath, journalLookup.get(relativePath));

    if (slugs.has(record.slug)) {
      console.warn(`Duplicate slug "${record.slug}": ${slugs.get(record.slug)} and ${relativePath}`);
      return;
    }
    slugs.set(record.slug, relativePath);

    if (record.wordCount < MIN_WORDS) {
      skipped.push(record);
      return;
    }

    records.push(record);
  });

  records.sort((a, b) => (a.dateTime < b.dateTime ? 1 : a.dateTime > b.dateTime ? -1 : 0));

  const index = records.map(record => ({
    id: record.slug,
    url: record.url,
    source: record.source,
    title: record.title,
    date: record.date,
    dateTime: record.dateTime,
    category: record.category,
    tags: record.tags,
    wordCount: record.wordCount,
    readingMinutes: record.readingMinutes,
    journalSlug: record.journalSlug
  }));

  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + '\n', 'utf8');

  console.log(`Indexed ${records.length} articles in ${path.relative(ROOT, INDEX_FILE)}`);
  if (skipped.length) {
    console.log(`Skipped ${skipped.length} short articles (ARTICLE_MIN_WORDS=${MIN_WORDS}); their feed links use journal.html anchors.`);
  }
}

module.exports = {
  SITE_URL,
  INDEX_FILE,
  buildJournalLookup,
  collectSources,
  buildRecord,
  plainText
};

if (require.main === module) main();
