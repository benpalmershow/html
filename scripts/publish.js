#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { syncJournalTags } = require('./build-article-index.js');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'article/posts');
const DOCS_DIR = path.join(ROOT, 'article/docs');
const JOURNAL_PATH = path.join(ROOT, 'json/journal.json');

const CANONICAL_CATEGORIES = ['economy', 'policy', 'trade', 'society', 'dispatches'];
const CATEGORY_ALIASES = {
  technology: 'economy', tech: 'economy', science: 'economy', finance: 'economy', business: 'economy', wealth: 'economy',
  government: 'policy', politics: 'policy', legal: 'policy', scotus: 'policy', immigration: 'policy',
  health: 'society', healthcare: 'society', education: 'society', housing: 'society', crime: 'society',
  media: 'dispatches', books: 'dispatches', journal: 'dispatches'
};

function canonicalCategory(value) {
  const category = String(value || '').trim().toLowerCase();
  if (CANONICAL_CATEGORIES.includes(category)) return category;
  return CATEGORY_ALIASES[category] || 'dispatches';
}

function defaultSubcategory(category) {
  return {
    economy: 'indicators',
    policy: 'politics',
    trade: 'tariffs',
    society: 'society',
    dispatches: 'dispatch'
  }[category] || 'dispatch';
}

function parseTags(value) {
  return String(value || '')
    .split(',')
    .map(tag => tag.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean)
    .slice(0, 5);
}

function getJournalTime() {
  return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getJournalDate() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  return `${month}/${day}/${year}`;
}

function parseJournalDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{2})$/.exec(String(value || ''));
  if (!match) return 0;
  return Date.UTC(2000 + Number(match[3]), Number(match[1]) - 1, Number(match[2]));
}

function normalizeJournal(journal) {
  const byDate = new Map();

  journal.forEach(day => {
    if (!byDate.has(day.date)) byDate.set(day.date, []);
    byDate.get(day.date).push(...(day.entries || []));
  });

  return Array.from(byDate, ([date, entries]) => ({ date, entries }))
    .sort((a, b) => parseJournalDate(b.date) - parseJournalDate(a.date));
}

function findDuplicateTitle(journal, title) {
  for (const day of journal) {
    const match = (day.entries || []).find(entry => entry.title === title);
    if (match) return day.date;
  }
  return null;
}

function addJournalEntry(journal, entry) {
  const today = getJournalDate();
  let dayEntry = journal.find(day => day.date === today);

  if (!dayEntry) {
    dayEntry = { date: today, entries: [] };
    journal.push(dayEntry);
  }

  dayEntry.entries.unshift(entry);
  return normalizeJournal(journal);
}

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

function createMarkdownPost(title, category, tags) {
  const today = getTodayDate();
  const slug = slugify(title);
  const filename = `${today}-${slug}.md`;
  
  const dir = category === 'docs' ? DOCS_DIR : POSTS_DIR;
  const filePath = path.join(dir, filename);
  
  if (fs.existsSync(filePath)) {
    console.error(`File already exists: ${filePath}`);
    process.exit(1);
  }
  
  const frontmatter = `---\ndate: ${today}T12:00:00Z\ncategory: ${canonicalCategory(category)}\ntags: ${JSON.stringify(tags || [])}\n---\n\n`;
  const content = frontmatter + `## <i data-lucide='book-open' class='post-icon'></i> **${title}**\n\nContent here.\n`;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created: ${path.relative(ROOT, filePath)}`);
  return path.relative(ROOT, filePath);
}

function updateJournal(filePath, title, collapsed, category, tags) {
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
  const canonical = canonicalCategory(category);

  const entry = {
    title: title,
    file: filePath,
    collapsed: collapsed !== false,
    category: canonical,
    subcategory: defaultSubcategory(canonical),
    type: 'essay',
    time: getJournalTime()
  };

  const normalized = addJournalEntry(journal, entry);
  fs.writeFileSync(JOURNAL_PATH, JSON.stringify(normalized, null, 2) + '\n', 'utf8');
  console.log(`Updated journal.json with entry for ${getJournalDate()}`);
}

function runCommand(cmd) {
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
  } catch (error) {
    console.error(`Command failed: ${cmd}`);
    process.exit(1);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log('Usage: node scripts/publish.js <title> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --type <post|docs|inline>  Type of entry (default: post)');
    console.log('  --category <name>          Category for markdown frontmatter');
    console.log('  --tags <a,b,c>             Comma-separated tags (max 5)');
    console.log('  --no-collapse              Do not collapse the entry');
    console.log('  --no-rss                   Skip RSS generation');
    console.log('  --no-validate              Skip validation');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/publish.js "My New Post"');
    console.log('  node scripts/publish.js "Daily Notes" --type docs');
    console.log('  node scripts/publish.js "Quick Thought" --type inline');
    console.log('  node scripts/publish.js "Economic Update" --category finance --tags economy,finance');
    process.exit(0);
  }
  
  const title = args[0];
  const typeIndex = args.indexOf('--type');
  const type = typeIndex !== -1 ? args[typeIndex + 1] : 'post';
  const categoryIndex = args.indexOf('--category');
  const category = categoryIndex !== -1 ? args[categoryIndex + 1] : 'dispatches';
  const tagsIndex = args.indexOf('--tags');
  const tags = tagsIndex !== -1 ? parseTags(args[tagsIndex + 1]) : [];
  const noCollapse = args.includes('--no-collapse');
  const noRss = args.includes('--no-rss');
  const noValidate = args.includes('--no-validate');
  const canonical = canonicalCategory(category);
  
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
  const duplicateDate = findDuplicateTitle(journal, title);
  if (duplicateDate) {
    console.warn(`Warning: title already exists in the ${duplicateDate} entry.`);
  }
  
  let filePath = null;
  
  if (type === 'inline') {
    const entry = {
      title: title,
      content: 'Content here. Edit in json/journal.json.',
      category: canonical,
      subcategory: defaultSubcategory(canonical),
      tags: tags,
      type: 'note',
      time: getJournalTime()
    };
    const normalized = addJournalEntry(journal, entry);
    fs.writeFileSync(JOURNAL_PATH, JSON.stringify(normalized, null, 2) + '\n', 'utf8');
    console.log(`Added inline entry to journal.json for ${getJournalDate()}`);
  } else {
    filePath = createMarkdownPost(title, type === 'docs' ? 'docs' : canonical, tags);
    updateJournal(filePath, title, noCollapse ? false : true, canonical, tags);
  }
  
  const synced = syncJournalTags();
  if (synced.updated) {
    console.log(`Synced markdown tags into ${synced.updated} journal entries.`);
  }
  
  if (!noValidate) {
    console.log('\nRunning validation...');
    runCommand('npm run validate');
  }
  
  if (!noRss && filePath) {
    console.log('\nExporting articles and generating RSS...');
    runCommand('npm run generate:content');
  }
  
  console.log('\nDone.');
}

main();
