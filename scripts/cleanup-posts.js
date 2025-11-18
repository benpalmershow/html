#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'article', 'posts');

if (!fs.existsSync(postsDir)) {
  console.error('Posts directory not found:', postsDir);
  process.exit(1);
}

const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

// Remove old container divs that now wrap the chart placeholders
const removePattern = /<div class="chart-container"[^>]*>[\s]*\{\{chart:([^}]+)\}\}/g;
const replacement = '{{chart:$1}}';

let cleanedCount = 0;

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  const originalContent = fs.readFileSync(filePath, 'utf8');
  let content = originalContent;
  
  // Remove opening div
  content = content.replace(removePattern, replacement);
  
  // Remove closing </div> that are followed by blank lines or text
  content = content.replace(/\n<\/div>\n/g, '\n');
  
  if (originalContent !== content) {
    fs.writeFileSync(filePath, content);
    cleanedCount++;
    console.log(`✓ Cleaned: ${file}`);
  }
});

console.log(`\n✓ Cleanup complete! ${cleanedCount} files cleaned.`);
