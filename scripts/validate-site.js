#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const failures = [];
const warnings = [];

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
  const postsPath = path.join(ROOT, 'json/posts.json');
  const articlesPath = path.join(ROOT, 'json/articles.json');

  if (fs.existsSync(postsPath)) {
    const posts = JSON.parse(read(postsPath));
    posts.forEach((post, index) => {
      if (!post.file) {
        fail(`json/posts.json entry ${index} is missing file`);
        return;
      }
      if (!exists(post.file)) fail(`json/posts.json references missing file: ${post.file}`);
      if (!post.date) warn(`json/posts.json entry ${post.file} is missing date`);
    });
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

function validateLocalReferences() {
  const sourceFiles = listFiles('.', filePath => /\.(html|css|webmanifest)$/.test(filePath));
  const attrPattern = /\b(?:href|src)=["']([^"']+)["']/g;
  const cssUrlPattern = /url\(["']?([^"')]+)["']?\)/g;

  sourceFiles.forEach(filePath => {
    const relativeFile = rel(filePath);
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
  validateJson();
  validateContentIndexes();
  validateLocalReferences();
  validateSitemaps();

  warnings.forEach(message => console.warn(`Warning: ${message}`));

  if (failures.length) {
    failures.forEach(message => console.error(`Error: ${message}`));
    console.error(`\nValidation failed with ${failures.length} error(s).`);
    process.exit(1);
  }

  console.log('Site validation passed.');
}

main();
