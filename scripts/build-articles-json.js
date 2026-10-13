#!/usr/bin/env node
// One-time helper: builds json/articles.json from article/*.md frontmatter
const fs = require('fs');
const path = require('path');

const ARTICLE_DIR = path.join(__dirname, '../article');
const OUT = path.join(__dirname, '../json/articles.json');

function parseMarkdown(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  match[1].split('\n').forEach(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key) fm[key] = val;
  });
  return fm;
}

const files = fs.readdirSync(ARTICLE_DIR).filter(f => f.endsWith('.md'));
const articles = [];
for (const file of files) {
  const id = file.replace(/\.md$/, '');
  const fm = parseMarkdown(path.join(ARTICLE_DIR, file));
  if (!fm.title || !fm.date) {
    console.warn('Skipping (missing title or date):', file);
    continue;
  }
  // Normalize ISO datetime to date-only YYYY-MM-DD
  let date = fm.date;
  if (date && date.includes('T')) date = date.split('T')[0];
  articles.push({
    id,
    title: fm.title,
    date,
    category: fm.category || 'policy',
    icon: fm.icon || 'file-text',
    summary: fm.summary || ''
  });
}
articles.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
fs.writeFileSync(OUT, JSON.stringify(articles, null, 2), 'utf8');
console.log('Written', articles.length, 'articles to', OUT);
