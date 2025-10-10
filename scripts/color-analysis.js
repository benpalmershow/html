#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ColorAnalyzer {
    constructor() {
        this.cssDir = 'css';
        this.backupDir = 'css-backup';
        this.reportDir = 'color-analysis-reports';
        this.colorPatterns = [
            // Hex colors (3, 4, 6, 8 digits)
            /#([0-9a-fA-F]{3,8})\b/g,
            // RGB/RGBA functions
            /rgba?\(\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*,\s*(\d+(?:\.\d+)?%?)\s*(?:,\s*(\d+(?:\.\d+)?%?))?\s*\)/g,
            // HSL/HSLA functions
            /hsla?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?%)\s*,\s*(\d+(?:\.\d+)?%)\s*(?:,\s*(\d+(?:\.\d+)?%?))?\s*\)/g,
            // Named colors (common ones)
            /\b(white|black|red|green|blue|yellow|orange|purple|pink|brown|gray|grey|transparent)\b/g
        ];
        this.colors = new Map();
        this.fileColors = new Map();
    }

    // Create backup directory and copy CSS files
    createBackups() {
        console.log('Creating backups of CSS files...');
        
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }

        const cssFiles = fs.readdirSync(this.cssDir).filter(file => file.endsWith('.css'));
        
        cssFiles.forEach(file => {
            const sourcePath = path.join(this.cssDir, file);
            const backupPath = path.join(this.backupDir, file);
            fs.copyFileSync(sourcePath, backupPath);
            console.log(`✓ Backed up ${file}`);
        });

        // Create timestamp file
        const timestamp = new Date().toISOString();
        fs.writeFileSync(
            path.join(this.backupDir, 'backup-info.txt'),
            `Backup created: ${timestamp}\nOriginal files from: ${this.cssDir}/\n`
        );

        console.log(`Backup completed. Files saved to ${this.backupDir}/`);
    }

    // Extract colors from a single CSS file
    extractColorsFromFile(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);
        const fileColors = new Set();

        this.colorPatterns.forEach(pattern => {
            let match;
            const regex = new RegExp(pattern.source, pattern.flags);
            
            while ((match = regex.exec(content)) !== null) {
                const fullMatch = match[0];
                const normalizedColor = this.normalizeColor(fullMatch);
                
                if (normalizedColor) {
                    fileColors.add(normalizedColor);
                    
                    if (this.colors.has(normalizedColor)) {
                        this.colors.get(normalizedColor).count++;
                        this.colors.get(normalizedColor).files.add(fileName);
                    } else {
                        this.colors.set(normalizedColor, {
                            original: fullMatch,
                            count: 1,
                            files: new Set([fileName]),
                            category: this.categorizeColor(normalizedColor)
                        });
                    }
                }
            }
        });

        this.fileColors.set(fileName, Array.from(fileColors));
        return fileColors;
    }

    // Normalize color values for comparison
    normalizeColor(color) {
        color = color.toLowerCase().trim();
        
        // Convert 3-digit hex to 6-digit
        if (/^#[0-9a-f]{3}$/.test(color)) {
            return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
        
        // Convert named colors to hex (basic ones)
        const namedColors = {
            'white': '#ffffff',
            'black': '#000000',
            'red': '#ff0000',
            'green': '#008000',
            'blue': '#0000ff',
            'yellow': '#ffff00',
            'orange': '#ffa500',
            'purple': '#800080',
            'pink': '#ffc0cb',
            'brown': '#a52a2a',
            'gray': '#808080',
            'grey': '#808080',
            'transparent': 'transparent'
        };
        
        if (namedColors[color]) {
            return namedColors[color];
        }
        
        return color;
    }

    // Categorize colors by type
    categorizeColor(color) {
        if (color === 'transparent') return 'transparent';
        if (color.startsWith('#')) return 'hex';
        if (color.startsWith('rgb')) return 'rgb';
        if (color.startsWith('hsl')) return 'hsl';
        return 'named';
    }

    // Analyze all CSS files
    analyzeAllFiles() {
        console.log('Analyzing CSS files for color usage...');
        
        if (!fs.existsSync(this.cssDir)) {
            throw new Error(`CSS directory not found: ${this.cssDir}`);
        }

        const cssFiles = fs.readdirSync(this.cssDir).filter(file => file.endsWith('.css'));
        
        if (cssFiles.length === 0) {
            throw new Error('No CSS files found in the css directory');
        }

        cssFiles.forEach(file => {
            const filePath = path.join(this.cssDir, file);
            console.log(`Analyzing ${file}...`);
            this.extractColorsFromFile(filePath);
        });

        console.log(`Analysis complete. Found ${this.colors.size} unique colors across ${cssFiles.length} files.`);
    }

    // Group similar colors
    groupSimilarColors() {
        const groups = new Map();
        const processed = new Set();

        for (const [color, data] of this.colors) {
            if (processed.has(color)) continue;

            const group = {
                representative: color,
                colors: [color],
                totalCount: data.count,
                files: new Set(data.files)
            };

            // Find similar colors (basic grouping for now)
            for (const [otherColor, otherData] of this.colors) {
                if (otherColor !== color && !processed.has(otherColor)) {
                    if (this.areColorsSimilar(color, otherColor)) {
                        group.colors.push(otherColor);
                        group.totalCount += otherData.count;
                        otherData.files.forEach(file => group.files.add(file));
                        processed.add(otherColor);
                    }
                }
            }

            processed.add(color);
            groups.set(color, group);
        }

        return groups;
    }

    // Basic color similarity check
    areColorsSimilar(color1, color2) {
        // Simple similarity check for common cases
        const whiteLike = ['#ffffff', '#fff', '#f7fafc', '#f8fafc', '#f3f4f6'];
        const grayLike = ['#666666', '#6b7280', '#cfcfcf', '#8a8a8a'];
        const darkLike = ['#2d3748', '#1a202c', '#1f2937'];

        if (whiteLike.includes(color1) && whiteLike.includes(color2)) return true;
        if (grayLike.includes(color1) && grayLike.includes(color2)) return true;
        if (darkLike.includes(color1) && darkLike.includes(color2)) return true;

        return false;
    }

    // Generate comprehensive report
    generateReport() {
        console.log('Generating color usage report...');
        
        if (!fs.existsSync(this.reportDir)) {
            fs.mkdirSync(this.reportDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().split('T')[0];
        const reportPath = path.join(this.reportDir, `color-analysis-${timestamp}.md`);

        let report = `# Color Analysis Report\n\n`;
        report += `Generated: ${new Date().toISOString()}\n\n`;

        // Summary
        report += `## Summary\n\n`;
        report += `- **Total unique colors found**: ${this.colors.size}\n`;
        report += `- **CSS files analyzed**: ${this.fileColors.size}\n`;
        report += `- **Files**: ${Array.from(this.fileColors.keys()).join(', ')}\n\n`;

        // Colors by frequency
        const sortedColors = Array.from(this.colors.entries())
            .sort((a, b) => b[1].count - a[1].count);

        report += `## Colors by Frequency\n\n`;
        report += `| Color | Count | Files | Category |\n`;
        report += `|-------|-------|-------|----------|\n`;
        
        sortedColors.forEach(([color, data]) => {
            const files = Array.from(data.files).join(', ');
            report += `| \`${color}\` | ${data.count} | ${files} | ${data.category} |\n`;
        });

        // Colors by file
        report += `\n## Colors by File\n\n`;
        for (const [fileName, colors] of this.fileColors) {
            report += `### ${fileName}\n\n`;
            report += `Found ${colors.length} unique colors:\n\n`;
            colors.forEach(color => {
                const data = this.colors.get(color);
                report += `- \`${color}\` (used ${data.count} times)\n`;
            });
            report += `\n`;
        }

        // Similar color groups
        const groups = this.groupSimilarColors();
        report += `## Potential Consolidation Groups\n\n`;
        
        for (const [representative, group] of groups) {
            if (group.colors.length > 1) {
                report += `### Group: ${representative}\n\n`;
                report += `**Colors to consolidate**: ${group.colors.map(c => `\`${c}\``).join(', ')}\n\n`;
                report += `**Total usage**: ${group.totalCount} times across files: ${Array.from(group.files).join(', ')}\n\n`;
            }
        }

        // Recommendations
        report += `## Recommendations\n\n`;
        report += `### High Priority Consolidations\n\n`;
        
        const highFrequencyColors = sortedColors.filter(([, data]) => data.count >= 3);
        if (highFrequencyColors.length > 0) {
            report += `Colors used 3+ times (good candidates for CSS custom properties):\n\n`;
            highFrequencyColors.forEach(([color, data]) => {
                report += `- \`${color}\` (${data.count} uses) → Consider \`--color-*\` variable\n`;
            });
        }

        report += `\n### CSS Custom Properties Suggestions\n\n`;
        report += `Based on the analysis, consider creating these CSS custom properties:\n\n`;
        report += `\`\`\`css\n`;
        report += `:root {\n`;
        
        // Suggest variables based on common patterns
        const suggestions = this.generateVariableSuggestions(sortedColors);
        suggestions.forEach(suggestion => {
            report += `  ${suggestion}\n`;
        });
        
        report += `}\n`;
        report += `\`\`\`\n\n`;

        fs.writeFileSync(reportPath, report);
        console.log(`✓ Report generated: ${reportPath}`);

        // Also create a JSON report for programmatic use
        const jsonReport = {
            timestamp: new Date().toISOString(),
            summary: {
                totalColors: this.colors.size,
                filesAnalyzed: this.fileColors.size,
                files: Array.from(this.fileColors.keys())
            },
            colors: Object.fromEntries(
                Array.from(this.colors.entries()).map(([color, data]) => [
                    color,
                    {
                        ...data,
                        files: Array.from(data.files)
                    }
                ])
            ),
            fileColors: Object.fromEntries(this.fileColors),
            consolidationGroups: Object.fromEntries(
                Array.from(groups.entries()).map(([key, group]) => [
                    key,
                    {
                        ...group,
                        files: Array.from(group.files)
                    }
                ])
            )
        };

        const jsonPath = path.join(this.reportDir, `color-analysis-${timestamp}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2));
        console.log(`✓ JSON report generated: ${jsonPath}`);

        return reportPath;
    }

    // Generate CSS variable suggestions
    generateVariableSuggestions(sortedColors) {
        const suggestions = [];
        
        // Common color mappings
        const colorMappings = {
            '#ffffff': '--color-white: #ffffff;',
            '#fff': '--color-white: #ffffff;',
            '#000000': '--color-black: #000000;',
            '#000': '--color-black: #000000;',
            '#2c5f5a': '--color-primary: #2c5f5a;',
            '#d4822a': '--color-secondary: #d4822a;',
            '#666666': '--color-gray-500: #666666;',
            '#666': '--color-gray-500: #666666;'
        };

        // Add existing high-frequency colors
        sortedColors.slice(0, 10).forEach(([color, data]) => {
            if (colorMappings[color]) {
                suggestions.push(colorMappings[color]);
            } else if (data.count >= 2) {
                // Generate generic variable name
                const varName = this.generateVariableName(color);
                suggestions.push(`${varName}: ${color};`);
            }
        });

        return [...new Set(suggestions)]; // Remove duplicates
    }

    // Generate CSS variable name from color
    generateVariableName(color) {
        if (color.startsWith('#')) {
            // For hex colors, try to determine if it's a shade of a common color
            const hex = color.toLowerCase();
            if (hex.match(/^#f[0-9a-f]{5}$/)) return '--color-gray-100';
            if (hex.match(/^#[0-6][0-9a-f]{5}$/)) return '--color-gray-700';
            return '--color-custom';
        }
        return '--color-custom';
    }

    // Main execution method
    run() {
        try {
            console.log('🎨 Starting Color Analysis Tool\n');
            
            // Step 1: Create backups
            this.createBackups();
            console.log('');
            
            // Step 2: Analyze colors
            this.analyzeAllFiles();
            console.log('');
            
            // Step 3: Generate report
            const reportPath = this.generateReport();
            console.log('');
            
            console.log('✅ Color analysis complete!');
            console.log(`📊 View the report: ${reportPath}`);
            console.log(`💾 Backups saved to: ${this.backupDir}/`);
            
        } catch (error) {
            console.error('❌ Error during color analysis:', error.message);
            process.exit(1);
        }
    }
}

// Run the analyzer if this script is executed directly
if (require.main === module) {
    const analyzer = new ColorAnalyzer();
    analyzer.run();
}

module.exports = ColorAnalyzer;