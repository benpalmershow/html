const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Get the last commit date
const lastCommitDate = execSync('git log -1 --format=%cd --date=iso').toString().trim();

// Function to update HTML files
function updateHtmlFiles() {
    const htmlFiles = fs.readdirSync('.').filter(file => file.endsWith('.html'));
    
    htmlFiles.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        
        // Check if the meta tag already exists
        if (!content.includes('<meta name="last-commit"')) {
            // Add the meta tag after the charset meta tag
            content = content.replace(
                /<meta charset="UTF-8">/,
                `<meta charset="UTF-8">\n    <meta name="last-commit" content="${lastCommitDate}">`
            );
            
            // Add the last-updated div before the closing body tag
            content = content.replace(
                /<\/body>/,
                `    <div id="last-updated" style="text-align: center; margin-top: 2rem; color: #666; font-size: 0.9em;"></div>\n    <script src="js/last-updated.js"></script>\n</body>`
            );
            
            fs.writeFileSync(file, content);
            console.log(`Updated ${file}`);
        }
    });
}

updateHtmlFiles(); 