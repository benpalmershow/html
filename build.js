const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist');
}

// Function to generate hash for cache busting
function generateHash(content) {
  return crypto.createHash('md5').update(content).digest('hex').substring(0, 8);
}

// Function to copy directory recursively
function copyDir(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  
  const files = fs.readdirSync(src);
  
  files.forEach(file => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

// Read and process HTML files
function processHtmlFiles(dir = '.') {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    if (file.endsWith('.html')) {
      console.log(`Processing ${file}...`);
      
      let html = fs.readFileSync(path.join(dir, file), 'utf8');
      
      // Process JavaScript files
      html = html.replace(/<script\s+src="([^"]+\.js)"/g, (match, src) => {
        // Skip external URLs
        if (src.startsWith('http') || src.startsWith('//')) {
          return match;
        }
        
        const jsPath = src.startsWith('./') ? src.substring(2) : src;
        
        if (fs.existsSync(jsPath)) {
          const jsContent = fs.readFileSync(jsPath, 'utf8');
          const hash = generateHash(jsContent);
          console.log(`  - Updated ${src} with hash ${hash}`);
          return `<script src="${src}?v=${hash}"`;
        }
        
        return match;
      });
      
      // Process CSS files
      html = html.replace(/<link\s+[^>]*href="([^"]+\.css)"/g, (match, href) => {
        // Skip external URLs
        if (href.startsWith('http') || href.startsWith('//')) {
          return match;
        }
        
        const cssPath = href.startsWith('./') ? href.substring(2) : href;
        
        if (fs.existsSync(cssPath)) {
          const cssContent = fs.readFileSync(cssPath, 'utf8');
          const hash = generateHash(cssContent);
          console.log(`  - Updated ${href} with hash ${hash}`);
          return match.replace(href, `${href}?v=${hash}`);
        }
        
        return match;
      });
      
      // Write processed HTML to dist
      fs.writeFileSync(path.join('dist', file), html);
    }
  });
}

// Main build process
console.log('🚀 Starting build process...');

// Copy assets to dist
const assetDirs = ['js', 'css', 'images', 'assets'];
assetDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`📁 Copying ${dir}/ to dist/`);
    copyDir(dir, path.join('dist', dir));
  }
});

// Copy any other files (robots.txt, favicon.ico, etc.)
const rootFiles = fs.readdirSync('.');
rootFiles.forEach(file => {
  if (fs.statSync(file).isFile() && 
      !file.endsWith('.html') && 
      !file.startsWith('.') && 
      !['package.json', 'package-lock.json', 'build.js', 'vercel.json'].includes(file)) {
    console.log(`📄 Copying ${file}`);
    fs.copyFileSync(file, path.join('dist', file));
  }
});

// Process HTML files with cache busting
processHtmlFiles();

console.log('✅ Build complete! Files are in ./dist/');
console.log('📦 Ready for deployment to Vercel');