#!/usr/bin/env node

/**
 * RSS Feed Generator for Howdy, Stranger
 * Generates news-feed.xml from json/articles.json (essays) and
 * journal.json entries with markdown file paths.
 * Run: node scripts/generate-rss.js
 */

const fs = require('fs');
const path = require('path');

const SITE_URL = 'https://howdystranger.net';
const FEED_FILE = path.join(__dirname, '../news-feed.xml');
const NEWS_SITEMAP_FILE = path.join(__dirname, '../news-sitemap.xml');
const ARTICLES_INDEX = path.join(__dirname, '../json/articles.json');
const JOURNAL_INDEX = path.join(__dirname, '../json/journal.json');
const ROOT = path.join(__dirname, '..');

function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toRFC822(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(`${dateInput}T12:00:00Z`);
  return date.toUTCString();
}

function parseMarkdown(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!match) {
      return { frontmatter: {}, body: content };
    }

    const frontmatter = {};
    const yamlContent = match[1];
    const body = match[2];

    yamlContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length) {
        const value = valueParts.join(':').trim().replace(/^['"]|['"]$/g, '');
        frontmatter[key.trim()] = value;
      }
    });

    return { frontmatter, body };
  } catch (error) {
    console.error(`Error parsing markdown file ${filePath}:`, error.message);
    return { frontmatter: {}, body: '' };
  }
}

function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/#+\s+/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\n+/g, ' ')
    .trim()
    .substring(0, 500);
}

function createEntryId(title) {
  const plainTitle = String(title).replace(/<[^>]*>/g, ' ');
  return plainTitle
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseJournalDate(journalDate, time) {
  const parts = journalDate.split('/');
  if (parts.length !== 3) return new Date(0);

  const [month, day, year] = parts;
  const fullYear = year.length === 2 ? 2000 + parseInt(year, 10) : parseInt(year, 10);
  let hours = 12;
  let minutes = 0;

  if (time) {
    const [h, m] = time.split(':').map(Number);
    if (!Number.isNaN(h)) hours = h;
    if (!Number.isNaN(m)) minutes = m;
  }

  return new Date(fullYear, parseInt(month, 10) - 1, parseInt(day, 10), hours, minutes);
}

function getJournalPubDate(journalDate, entry, frontmatter = {}) {
  if (frontmatter.date) {
    const parsed = new Date(frontmatter.date);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return parseJournalDate(journalDate, entry.time);
}

function loadJournalFileEntries() {
  const journal = JSON.parse(fs.readFileSync(JOURNAL_INDEX, 'utf8'));
  const entries = [];

  journal.forEach(day => {
    if (!Array.isArray(day.entries)) return;

    day.entries.forEach(entry => {
      if (!entry.file) return;

      const filePath = path.join(ROOT, entry.file);
      if (!fs.existsSync(filePath)) {
        console.warn(`Skipping missing journal file: ${entry.file}`);
        return;
      }

      const { frontmatter, body } = parseMarkdown(filePath);
      const entryId = createEntryId(entry.title);
      const pubDate = getJournalPubDate(day.date, entry, frontmatter);
      const category = frontmatter.category || 'journal';
      const description = stripMarkdown(entry.content || body).substring(0, 200);
      const contentText = stripMarkdown(body);

      entries.push({
        title: stripMarkdown(String(entry.title).replace(/<[^>]*>/g, '')),
        description,
        guid: entry.file,
        pubDate,
        link: `${SITE_URL}/journal.html#${encodeURIComponent(entryId)}`,
        category,
        contentText
      });
    });
  });

  return entries.sort((a, b) => b.pubDate - a.pubDate);
}

function buildNewsSitemap(articlesData) {
  const urls = articlesData.map(article => {
    const title = escapeXml(article.title);
    const publicationDate = escapeXml(article.date);
    const loc = `${SITE_URL}/news?article=${encodeURIComponent(article.id)}`;

    return `  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>Howdy, Stranger</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${publicationDate}</news:publication_date>
      <news:title>${title}</news:title>
    </news:news>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>
`;
}

function buildRssItem({ title, link, guid, pubDate, category, description, contentText }) {
  return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${escapeXml(guid)}</guid>
      <pubDate>${toRFC822(pubDate)}</pubDate>
      <category>${escapeXml(category)}</category>
      <description><![CDATA[${escapeXml(description)}]]></description>
      <content:encoded><![CDATA[${contentText}]]></content:encoded>
    </item>`;
}

function generateRSS() {
  try {
    const articlesData = JSON.parse(fs.readFileSync(ARTICLES_INDEX, 'utf8'));
    const journalEntries = loadJournalFileEntries();

    const articleItems = articlesData.map(article => {
      const articlePath = path.join(ROOT, 'article', `${article.id}.md`);
      const { frontmatter, body } = parseMarkdown(articlePath);
      const description = article.summary || frontmatter.summary || '';
      const contentText = stripMarkdown(body);

      return buildRssItem({
        title: article.title,
        link: `${SITE_URL}/news.html?article=${encodeURIComponent(article.id)}`,
        guid: `${SITE_URL}/news.html?article=${encodeURIComponent(article.id)}`,
        pubDate: new Date(`${article.date}T12:00:00Z`),
        category: article.category,
        description: stripMarkdown(description).substring(0, 200),
        contentText
      });
    });

    const journalItems = journalEntries.map(entry => ({
      pubDate: entry.pubDate,
      xml: buildRssItem(entry)
    }));

    const articleItemRows = articlesData.map((article, index) => ({
      pubDate: new Date(`${article.date}T12:00:00Z`),
      xml: articleItems[index]
    }));

    const items = [...articleItemRows, ...journalItems]
      .sort((a, b) => b.pubDate - a.pubDate)
      .map(row => row.xml)
      .join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Howdy, Stranger - News</title>
    <link>${SITE_URL}/journal.html</link>
    <description>Independent analysis on markets, policy, and current events</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/news-feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <copyright>Copyright (c) 2025 Ben Palmer. All rights reserved.</copyright>
    <managingEditor>ben@howdystranger.net (Ben Palmer)</managingEditor>
    <webMaster>ben@howdystranger.net (Ben Palmer)</webMaster>
    <image>
      <url>${SITE_URL}/images/logo-1200x630.webp</url>
      <title>Howdy, Stranger - News</title>
      <link>${SITE_URL}/journal.html</link>
    </image>
${items}
  </channel>
</rss>`;

    fs.writeFileSync(FEED_FILE, rss, 'utf8');
    fs.writeFileSync(NEWS_SITEMAP_FILE, buildNewsSitemap(articlesData), 'utf8');
    console.log(`✅ RSS feed generated: ${FEED_FILE}`);
    console.log(`✅ News sitemap generated: ${NEWS_SITEMAP_FILE}`);
    console.log(`📰 Essays (articles.json): ${articlesData.length}`);
    console.log(`📝 Journal markdown entries: ${journalEntries.length}`);
    console.log(`📊 Combined RSS items: ${articleItems.length + journalItems.length}`);
  } catch (error) {
    console.error('❌ Error generating RSS feed:', error.message);
    process.exit(1);
  }
}

generateRSS();
