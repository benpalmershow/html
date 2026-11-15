#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

const JOURNAL_DATE_RE = /^\d{2}\/\d{2}\/\d{2}$/;
const JOURNAL_TIME_RE = /^\d{1,2}:\d{2}(?:\s*[AP]M)?$/;
const JOURNAL_CATEGORIES = ['economy', 'policy', 'trade', 'society', 'dispatches'];
const JOURNAL_TYPES = ['note', 'essay', 'data', 'curation', 'dispatch', 'verse'];

function parseJournalDate(value) {
  const match = JOURNAL_DATE_RE.exec(String(value || ''));
  if (!match) return null;
  const year = 2000 + Number(match[3]);
  return Date.UTC(year, Number(match[1]) - 1, Number(match[2]));
}

function parseTagList(value) {
  const text = String(value || '').trim();
  if (!text) return [];
  const values = text.startsWith('[') && text.endsWith(']')
    ? text.slice(1, -1).split(',')
    : text.split(',');
  return values
    .map(item => item.trim().replace(/^["']|["']$/g, '').trim())
    .filter(Boolean);
}

function frontmatterTags(relativePath) {
  try {
    const raw = read(path.join(ROOT, relativePath));
    const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
    if (!match) return [];
    const line = match[1].match(/^tags\s*:\s*(.*)$/m);
    return line ? parseTagList(line[1]) : [];
  } catch (error) {
    return null;
  }
}

function rel(filePath) {
  return path.relative(ROOT, filePath);
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function exists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

function listFiles(dir, predicate = () => true) {
  const base = path.join(ROOT, dir);
  if (!fs.existsSync(base)) return [];

  const results = [];
  const stack = [base];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git') stack.push(fullPath);
      } else if (predicate(fullPath)) {
        results.push(fullPath);
      }
    }
  }
  return results.sort();
}

function validateJson() {
  const jsonFiles = listFiles('.', filePath => {
    const relative = rel(filePath);
    return relative.endsWith('.json') || relative.endsWith('.webmanifest');
  });

  jsonFiles.forEach(filePath => {
    try {
      JSON.parse(read(filePath));
    } catch (error) {
      fail(`${rel(filePath)} is invalid JSON: ${error.message}`);
    }
  });
}

function validateContentIndexes() {
  const journalPath = path.join(ROOT, 'json/journal.json');
  const articlesPath = path.join(ROOT, 'json/articles.json');

  if (fs.existsSync(journalPath)) {
    const journal = JSON.parse(read(journalPath));
    if (!Array.isArray(journal)) {
      fail('json/journal.json must be an array');
    } else {
      const seenDates = new Set();
      const titleDates = new Map();
      let previousDate = null;

      const tagPath = path.join(ROOT, 'json/journal-tags.json');
      let fileTags = {};
      if (fs.existsSync(tagPath)) {
        try {
          fileTags = JSON.parse(read(tagPath));
        } catch (error) {
          fail(`json/journal-tags.json is invalid JSON: ${error.message}`);
        }
      } else {
        fail('json/journal-tags.json is missing (run: npm run generate:content)');
      }

      journal.forEach((day, dayIndex) => {
        const label = day.date || `day ${dayIndex}`;
        if (!day.date) {
          fail(`json/journal.json day ${dayIndex} is missing date`);
        } else {
          if (!JOURNAL_DATE_RE.test(day.date)) {
            fail(`json/journal.json ${day.date} must use MM/DD/YY format`);
          }
          if (seenDates.has(day.date)) {
            fail(`json/journal.json has duplicate date block: ${day.date}`);
          }
          seenDates.add(day.date);

          const current = parseJournalDate(day.date);
          if (current !== null && previousDate !== null && current > previousDate) {
            fail(`json/journal.json date blocks are not newest-first: ${day.date}`);
          }
          if (current !== null) previousDate = current;
        }

        if (!Array.isArray(day.entries)) {
          fail(`json/journal.json ${label} is missing entries array`);
          return;
        }

        const dayTitles = new Set();
        day.entries.forEach((entry, entryIndex) => {
          const entryLabel = `${label} entry ${entryIndex}`;
          if (!entry.title) {
            fail(`json/journal.json ${entryLabel} is missing title`);
          } else {
            if (dayTitles.has(entry.title)) {
              warn(`json/journal.json ${label} repeats title: ${entry.title}`);
            }
            dayTitles.add(entry.title);

            const firstDate = titleDates.get(entry.title);
            if (firstDate) {
              warn(`json/journal.json repeats title "${entry.title}" (${firstDate}, ${day.date})`);
            } else {
              titleDates.set(entry.title, day.date);
            }
          }

          if (entry.file && !exists(entry.file)) {
            fail(`json/journal.json references missing file: ${entry.file}`);
          }
          if (!entry.file && !entry.content && !entry.link) {
            warn(`json/journal.json ${entryLabel} has no file, content, or link`);
          }
          if (entry.category && !JOURNAL_CATEGORIES.includes(entry.category)) {
            fail(`json/journal.json ${entryLabel} has non-canonical category "${entry.category}"`);
          }
          if (entry.type && !JOURNAL_TYPES.includes(entry.type)) {
            fail(`json/journal.json ${entryLabel} has unknown type "${entry.type}"`);
          }
          if (entry.time && !JOURNAL_TIME_RE.test(entry.time)) {
            fail(`json/journal.json ${entryLabel} has invalid time "${entry.time}"`);
          }
          if (entry.file) {
            if (entry.tags !== undefined) {
              fail(`json/journal.json ${entryLabel} must not duplicate tags; tags live in ${entry.file}`);
            }
            const mdTags = frontmatterTags(entry.file);
            const mapTags = Array.isArray(fileTags[entry.file]) ? fileTags[entry.file] : null;
            if (mdTags !== null && mapTags === null) {
              fail(`json/journal-tags.json is missing tags for ${entry.file}; run npm run generate:content`);
            } else if (mdTags !== null && mapTags !== null && mdTags.join('|') !== mapTags.join('|')) {
              fail(`json/journal-tags.json does not match ${entry.file}; run npm run generate:content`);
            }
          } else if (entry.tags !== undefined) {
            if (!Array.isArray(entry.tags) || entry.tags.some(tag => typeof tag !== 'string')) {
              fail(`json/journal.json ${entryLabel} tags must be an array of strings`);
            } else if (entry.tags.length > 5) {
              warn(`json/journal.json ${entryLabel} has ${entry.tags.length} tags (max 5)`);
            }
          }
        });
      });
    }
  }

  if (fs.existsSync(articlesPath)) {
    const articles = JSON.parse(read(articlesPath));
    articles.forEach((article, index) => {
      if (!article.id) {
        fail(`json/articles.json entry ${index} is missing id`);
        return;
      }
      const articleFile = `article/${article.id}.md`;
      if (!exists(articleFile)) fail(`json/articles.json references missing file: ${articleFile}`);
      if (!article.date) warn(`json/articles.json entry ${article.id} is missing date`);
    });
  }
}

function validateArticleIndex() {
  const indexPath = path.join(ROOT, 'json/article-index.json');
  if (!fs.existsSync(indexPath)) {
    fail('json/article-index.json is missing (run: npm run generate:content)');
    return;
  }

  const index = JSON.parse(read(indexPath));
  const ids = new Set();

  index.forEach((entry, index_) => {
    if (!entry.id) {
      fail(`json/article-index.json entry ${index_} is missing id`);
      return;
    }
    if (ids.has(entry.id)) fail(`json/article-index.json has a duplicate id: ${entry.id}`);
    ids.add(entry.id);
    if (entry.source && !exists(entry.source)) {
      fail(`json/article-index.json entry ${entry.id} references missing file: ${entry.source}`);
    }
    if (entry.url !== `/article.html?slug=${encodeURIComponent(entry.id)}`) {
      fail(`json/article-index.json entry ${entry.id} has an unexpected url: ${entry.url}`);
    }
  });

  // Every article URL in the feed and sitemaps must exist in the index, or the
  // published link lands on a page that renders "Article not found".
  ['news-feed.xml', 'news-sitemap.xml', 'sitemap.xml'].forEach(fileName => {
    const filePath = path.join(ROOT, fileName);
    if (!fs.existsSync(filePath)) return;
    const text = read(filePath);
    const pattern = /article\.html\?slug=([^<&"']+)/g;
    let match;
    while ((match = pattern.exec(text))) {
      const slug = decodeURIComponent(match[1]);
      if (!ids.has(slug)) fail(`${fileName} links to an article missing from the index: ${slug}`);
    }
  });
}

function validateLocalReferences() {
  const sourceFiles = listFiles('.', filePath => /\.(html|css|webmanifest)$/.test(filePath));
  const attrPattern = /\b(?:href|src)=["']([^"']+)["']/g;
  const cssUrlPattern = /url\(["']?([^"')]+)["']?\)/g;

  sourceFiles.forEach(filePath => {
    const relativeFile = rel(filePath);
    // Skip validation for files inside the .kilo directory (generated artifacts)
    if (relativeFile.startsWith('.kilo' + path.sep)) {
      return;
    }
    const text = read(filePath);
    const references = [];
    let match;

    while ((match = attrPattern.exec(text))) references.push(match[1]);
    while ((match = cssUrlPattern.exec(text))) references.push(match[1]);

    references.forEach(reference => {
      if (
        reference.startsWith('http') ||
        reference.startsWith('data:') ||
        reference.startsWith('mailto:') ||
        reference.startsWith('#') ||
        reference.startsWith('/_vercel/')
      ) {
        return;
      }

      const cleaned = reference.split(/[?#]/)[0];
      if (!cleaned || cleaned.includes(':')) return;

      const baseDir = relativeFile.startsWith(`components${path.sep}`) ? ROOT : path.dirname(filePath);
      const target = cleaned.startsWith('/')
        ? path.join(ROOT, cleaned)
        : path.resolve(baseDir, cleaned);

      if (!fs.existsSync(target)) {
        fail(`${relativeFile} references missing local file: ${reference}`);
      }
    });
  });
}

function validateSitemaps() {
  if (!exists('sitemap.xml')) fail('sitemap.xml is missing');
  if (!exists('news-sitemap.xml')) fail('news-sitemap.xml is missing but robots.txt advertises it');
  if (!exists('news-feed.xml')) fail('news-feed.xml is missing');
}

function main() {
  const watchMode = process.argv.includes('--watch');
  
  if (watchMode) {
    console.log('Watching for changes... Press Ctrl+C to stop.\n');
    runValidation();
    
    let timeout;
    const debounce = () => {
      clearTimeout(timeout);
      timeout = setTimeout(runValidation, 500);
    };
    
    fs.watch(ROOT, { recursive: true }, debounce);
    process.on('SIGINT', () => {
      console.log('\nStopping watcher.');
      process.exit(0);
    });
  } else {
    runValidation();
  }
}

function runValidation() {
  failures.length = 0;
  warnings.length = 0;
  
  validateJson();
  validateContentIndexes();
  validateArticleIndex();
  validateLocalReferences();
  validateSitemaps();
  
  warnings.forEach(message => console.warn(`Warning: ${message}`));
  
  if (failures.length) {
    failures.forEach(message => console.error(`Error: ${message}`));
    console.error(`\nValidation failed with ${failures.length} error(s).`);
    if (!process.argv.includes('--watch')) process.exit(1);
  } else {
    console.log(`[${new Date().toLocaleTimeString()}] Site validation passed.`);
  }
}

main();
