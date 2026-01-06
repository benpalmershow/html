#!/usr/bin/env node

/**
 * RSS Feed Generator for Howdy, Stranger News
 * Generates news-feed.xml from json/articles.json and article markdown files
 * Run: node scripts/generate-rss.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SITE_URL = 'https://howdystranger.net';
const FEED_FILE = path.join(__dirname, '../news-feed.xml');
const ARTICLES_INDEX = path.join(__dirname, '../json/articles.json');
const POSTS_INDEX = path.join(__dirname, '../json/posts.json');
const ARTICLES_DIR = path.join(__dirname, '../article');

/**
 * Escape XML entities in text
 */
function escapeXml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Convert ISO date to RFC 822 format for RSS
 * Input: "2025-12-09"
 * Output: "Mon, 09 Dec 2025 00:00:00 GMT"
 */
function toRFC822(isoDate) {
  const date = new Date(isoDate + 'T00:00:00Z');
  return date.toUTCString();
}

/**
 * Parse markdown frontmatter and extract content
 */
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

    // Simple YAML parsing for our use case
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

/**
 * Strip markdown and HTML tags for plain text description
 */
function stripMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/#+\s+/g, '') // Headers
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/<[^>]+>/g, '') // HTML tags
    .replace(/\n+/g, ' ') // Newlines to spaces
    .trim()
    .substring(0, 500); // Limit to 500 chars
}

/**
 * Generate RSS feed from both articles and posts
 */
function generateRSS() {
  try {
    // Read articles index
    const articlesData = JSON.parse(fs.readFileSync(ARTICLES_INDEX, 'utf8'));
    const postsData = JSON.parse(fs.readFileSync(POSTS_INDEX, 'utf8'));

    // Convert articles to RSS items
    const articleItems = articlesData.map(article => {
      const articlePath = path.join(ARTICLES_DIR, `${article.id}.md`);
      const { frontmatter, body } = parseMarkdown(articlePath);

      const title = escapeXml(article.title);
      const description = escapeXml(article.summary || frontmatter.summary || '');
      const guid = article.id;
      const pubDate = toRFC822(article.date);
      const link = `${SITE_URL}/news.html?article=${encodeURIComponent(article.id)}`;
      const category = escapeXml(article.category);

      // Extract text content for full description
      const contentText = stripMarkdown(body);

      return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${category}</category>
      <description><![CDATA[${description}]]></description>
      <content:encoded><![CDATA[${contentText}]]></content:encoded>
    </item>`;
    });

    // Convert posts to RSS items
    const postItems = postsData.map(post => {
      const postPath = post.file;
      const { frontmatter, body } = parseMarkdown(path.join(__dirname, '../', postPath));

      // Generate a unique ID from the file path
      const guid = postPath.replace(/\//g, '-').replace(/\.md$/, '');
      const link = `${SITE_URL}/?post=${encodeURIComponent(guid)}`;
      const pubDate = toRFC822(post.date);
      
      // Extract title from markdown body or use filename
      let title = 'Journal Update';
      const titleMatch = body.match(/^#+\s+(.+)$/m);
      if (titleMatch) {
        title = titleMatch[1].trim();
      }

      // Extract summary/description from first paragraph
      const descMatch = body.match(/\n\n(.+?)(?:\n|$)/);
      const description = escapeXml(stripMarkdown(descMatch ? descMatch[1] : body).substring(0, 200));

      return `    <item>
      <title>${escapeXml(title)}</title>
      <link>${link}</link>
      <guid isPermaLink="false">${guid}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>journal</category>
      <description><![CDATA[${description}]]></description>
      <content:encoded><![CDATA[${stripMarkdown(body)}]]></content:encoded>
    </item>`;
    });

    // Combine and sort by date (newest first)
    const allItems = [...articleItems, ...postItems];
    const items = allItems.join('\n');

    // Build complete RSS feed
    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Howdy, Stranger - News</title>
    <link>${SITE_URL}/news.html</link>
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
      <link>${SITE_URL}/news.html</link>
    </image>
${items}
  </channel>
</rss>`;

    // Write to file
    fs.writeFileSync(FEED_FILE, rss, 'utf8');
    console.log(`✅ RSS feed generated: ${FEED_FILE}`);
    console.log(`📰 Total articles: ${articlesData.length}`);
    console.log(`📝 Total posts: ${postsData.length}`);
    console.log(`📊 Combined items: ${articleItems.length + postItems.length}`);

  } catch (error) {
    console.error('❌ Error generating RSS feed:', error.message);
    process.exit(1);
  }
}

// Run
generateRSS();
