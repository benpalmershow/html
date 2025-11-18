#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const postsDir = path.join(__dirname, '..', 'article', 'posts');

if (!fs.existsSync(postsDir)) {
  console.error('Posts directory not found:', postsDir);
  process.exit(1);
}

const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'));

// Chart patterns to detect and convert - match canvas and closing script tag
const conversions = [
  {
    pattern: /<canvas id="adp-chart"[^>]*><\/canvas>[\s\S]*?<\/script>/,
    replacement: '{{chart:Private Employment}}'
  },
  {
    pattern: /<canvas id="lumber-chart"[^>]*><\/canvas>[\s\S]*?<\/script>/,
    replacement: '{{chart:Lumber Futures}}'
  },
  {
    pattern: /<canvas id="treasury-chart"[^>]*><\/canvas>[\s\S]*?<\/script>/,
    replacement: '{{chart:10-yr Treasury Yield}}'
  },
  {
    pattern: /<canvas id="yield-chart"[^>]*><\/canvas>[\s\S]*?<\/script>/,
    replacement: '{{chart:10-yr Treasury Yield}}'
  },
  {
    pattern: /<canvas id="nfib-chart"[^>]*><\/canvas>[\s\S]*?<\/script>/,
    replacement: '{{chart:Small Business Optimism Index}}'
  },
  {
    pattern: /<canvas id="sentiment-chart"[^>]*><\/canvas>[\s\S]*?<\/script>/,
    replacement: '{{chart:Consumer Sentiment}}'
  },
  {
    pattern: /<canvas id="challenger-chart"[^>]*><\/canvas>[\s\S]*?<\/script>/,
    replacement: '{{chart:Job Cuts Report}}'
  },
  {
    pattern: /<canvas id="fomc-chart"[^>]*><\/canvas>[\s\S]*?<\/script>/,
    replacement: '{{chart:FOMC December Rate Decision (BPS)}}'
  },
  {
    pattern: /<canvas id="fomc-prediction-chart"[^>]*><\/canvas>[\s\S]*?<\/script>/,
    replacement: '{{chart:FOMC December Rate Decision (BPS)}}'
  },
  {
    pattern: /<canvas id="tariff-revenue-chart"[^>]*><\/canvas>[\s\S]*?<\/script>/,
    replacement: '{{chart:Tariff Revenue}}'
  }
];

let convertedCount = 0;

files.forEach(file => {
  const filePath = path.join(postsDir, file);
  const originalContent = fs.readFileSync(filePath, 'utf8');
  let content = originalContent;
  let modified = false;
  
  conversions.forEach(({ pattern, replacement }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
      console.log(`  ✓ Replaced chart in ${file}`);
    }
  });
  
  if (modified) {
    // Create backup
    const backupPath = filePath + '.backup';
    fs.writeFileSync(backupPath, originalContent);
    
    // Write converted content
    fs.writeFileSync(filePath, content);
    convertedCount++;
    console.log(`✓ Converted: ${file}`);
  }
});

console.log(`\n✓ Conversion complete! ${convertedCount} files updated.`);
if (convertedCount > 0) {
  console.log('Backups created with .backup extension');
  console.log('Review changes, then delete backups with: rm article/posts/*.backup');
}
