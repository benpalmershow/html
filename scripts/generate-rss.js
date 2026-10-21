#!/usr/bin/env node

/**
 * RSS feed and news sitemap generator for Howdy, Stranger.
 *
 * Reads the same article sources as scripts/build-article-index.js and points
 * every item at a real, indexable page (article.html?slug=<slug>). The previous
 * build emitted news.html?article=... and journal.html#<title-slug> links,
 * neither of which resolved to a document.
 *
 * Run: node scripts/generate-rss.js
 */

const fs = require('fs');
const path = require('path');
const exporter = require('./build-article-index.js');

const SITE_URL = exporter.SITE_URL;
const FEED_FILE = path.join(__dirname, '../news-feed.xml');
const NEWS_SITEMAP_FILE = path.join(__dirname, '../news-sitemap.xml');
const SITEMAP_FILE = path.join(__dirname, '../sitemap.xml');
const ROOT = path.join(__dirname, '..');

const STATIC_PAGES = [
  { loc: '/', priority: '1.0', changefreq: 'daily' },
  { loc: '/financials.html', priority: '0.8', changefreq: 'weekly' },
  { loc: '/journal.html', priority: '0.7', changefreq: 'daily' },
  { loc: '/media.html', priority: '0.7', changefreq: 'weekly' },
  { loc: '/one-pager.html', priority: '0.5', changefreq: 'weekly' }
];

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
  let date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (/^\d{4}-\d{2}-\d{2}T/.test(String(dateInput))) {
    date = new Date(dateInput);
  } else {
    date = new Date(`${dateInput}T12:00:00Z`);
  }
  return date.toUTCString();
}

// CDATA already shields the payload, so only the closing sequence needs care.
function cdata(text) {
  return String(text || '').replace(/]]>/g, ']]]]><![CDATA[>');
}

function buildRecords() {
  const journalLookup = exporter.buildJournalLookup();
  const records = exporter.collectSources()
    .map(relativePath => exporter.buildRecord(relativePath, journalLookup.get(relativePath)))
    .filter((record, index, all) => all.findIndex(other => other.slug === record.slug) === index)
    .sort((a, b) => (a.dateTime < b.dateTime ? 1 : a.dateTime > b.dateTime ? -1 : 0));

  // Indexed articles own a standalone page; the rest link to the journal
  // entry they came from.
  const exported = new Set();
  if (fs.existsSync(exporter.INDEX_FILE)) {
    JSON.parse(fs.readFileSync(exporter.INDEX_FILE, 'utf8')).forEach(entry => exported.add(entry.id));
  }

  records.forEach(record => {
    record.hasPage = exported.has(record.slug);
    record.pageUrl = record.hasPage
      ? SITE_URL + record.url
      : SITE_URL + '/journal.html#' + record.journalSlug;
  });

  return records;
}

function buildRssItem(record) {
  const url = record.pageUrl;
  const description = record.summary || record.title;
  const content = exporter.plainText(record.html);

  return `    <item>
    <title>${escapeXml(record.title)}</title>
    <link>${url}</link>
    <guid isPermaLink="true">${url}</guid>
    <pubDate>${toRFC822(record.dateTime)}</pubDate>
    <category>${escapeXml(record.category)}</category>
    <description><![CDATA[${cdata(description)}]]></description>
    <content:encoded><![CDATA[${cdata(content)}]]></content:encoded>
  </item>`;
}

function buildNewsSitemap(records) {
  // Google News needs a distinct URL per story, so only articles with their
  // own page are listed; fragment URLs would collapse into one document.
  const urls = records.filter(record => record.hasPage).map(record => {
    const title = escapeXml(record.title);
    const publicationDate = escapeXml(record.date);
    const loc = SITE_URL + record.url;
    const lastmod = escapeXml(record.date);

    return `  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
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

function buildSitemap(records) {
  const staticUrls = STATIC_PAGES.map(page => `  <url>
    <loc>${SITE_URL}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n');

  const articleUrls = records.filter(record => record.hasPage).map(record => `  <url>
    <loc>${SITE_URL}${record.url}</loc>
    <lastmod>${record.date}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${articleUrls}
</urlset>
`;
}

function generateRSS() {
  try {
    const records = buildRecords();
    const items = records.map(buildRssItem).join('\n');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Howdy, Stranger - News</title>
    <link>${SITE_URL}/journal.html</link>
    <description>Independent analysis on markets, policy, and current events</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/news-feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <copyright>Copyright (c) 2026 Ben Palmer. All rights reserved.</copyright>
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
    fs.writeFileSync(NEWS_SITEMAP_FILE, buildNewsSitemap(records), 'utf8');
    fs.writeFileSync(SITEMAP_FILE, buildSitemap(records), 'utf8');

    const withPage = records.filter(record => record.hasPage).length;
    console.log(`RSS feed generated: ${path.relative(ROOT, FEED_FILE)} (${records.length} items, ${withPage} with a standalone page)`);
    console.log(`News sitemap generated: ${path.relative(ROOT, NEWS_SITEMAP_FILE)} (${withPage} urls)`);
    console.log(`Sitemap generated: ${path.relative(ROOT, SITEMAP_FILE)} (${withPage + STATIC_PAGES.length} urls)`);
  } catch (error) {
    console.error(`Error generating RSS feed: ${error.message}`);
    process.exit(1);
  }
}

generateRSS();
