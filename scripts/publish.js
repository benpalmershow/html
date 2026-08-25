#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const POSTS_DIR = path.join(ROOT, 'article/posts');
const DOCS_DIR = path.join(ROOT, 'article/docs');
const JOURNAL_PATH = path.join(ROOT, 'json/journal.json');

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

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

function createMarkdownPost(title, category) {
  const today = getTodayDate();
  const slug = slugify(title);
  const filename = `${today}-${slug}.md`;
  
  const dir = category === 'docs' ? DOCS_DIR : POSTS_DIR;
  const filePath = path.join(dir, filename);
  
  if (fs.existsSync(filePath)) {
    console.error(`File already exists: ${filePath}`);
    process.exit(1);
  }
  
  const frontmatter = `---\ndate: ${today}T12:00:00Z\ncategory: ${category || 'journal'}\n---\n\n`;
  const content = frontmatter + `## <i data-lucide='book-open' class='post-icon'></i> **${title}**\n\nContent here.\n`;
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Created: ${path.relative(ROOT, filePath)}`);
  return path.relative(ROOT, filePath);
}

function updateJournal(filePath, title, collapsed) {
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
  const today = getJournalDate();
  
  const entry = {
    title: title,
    file: filePath,
    collapsed: collapsed !== false
  };
  
  let dayEntry = journal.find(d => d.date === today);
  if (!dayEntry) {
    dayEntry = { date: today, entries: [] };
    journal.unshift(dayEntry);
  }
  
  dayEntry.entries.unshift(entry);
  
  fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2) + '\n', 'utf8');
  console.log(`Updated journal.json with entry for ${today}`);
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
    console.log('  --no-collapse              Do not collapse the entry');
    console.log('  --no-rss                   Skip RSS generation');
    console.log('  --no-validate              Skip validation');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/publish.js "My New Post"');
    console.log('  node scripts/publish.js "Daily Notes" --type docs');
    console.log('  node scripts/publish.js "Quick Thought" --type inline');
    console.log('  node scripts/publish.js "Economic Update" --category financials');
    process.exit(0);
  }
  
  const title = args[0];
  const typeIndex = args.indexOf('--type');
  const type = typeIndex !== -1 ? args[typeIndex + 1] : 'post';
  const categoryIndex = args.indexOf('--category');
  const category = categoryIndex !== -1 ? args[categoryIndex + 1] : 'journal';
  const noCollapse = args.includes('--no-collapse');
  const noRss = args.includes('--no-rss');
  const noValidate = args.includes('--no-validate');
  
  let filePath = null;
  
  if (type === 'inline') {
    const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, 'utf8'));
    const today = getJournalDate();
    
    let dayEntry = journal.find(d => d.date === today);
    if (!dayEntry) {
      dayEntry = { date: today, entries: [] };
      journal.unshift(dayEntry);
    }
    
    dayEntry.entries.unshift({
      title: title,
      content: 'Content here. Edit in json/journal.json.'
    });
    
    fs.writeFileSync(JOURNAL_PATH, JSON.stringify(journal, null, 2) + '\n', 'utf8');
    console.log(`Added inline entry to journal.json for ${today}`);
  } else {
    filePath = createMarkdownPost(title, type === 'docs' ? 'docs' : category);
    updateJournal(filePath, title, noCollapse ? false : true);
  }
  
  if (!noValidate) {
    console.log('\nRunning validation...');
    runCommand('npm run validate');
  }
  
  if (!noRss && filePath) {
    console.log('\nGenerating RSS...');
    runCommand('npm run generate:rss');
  }
  
  console.log('\nDone.');
}

main();
