#!/usr/bin/env node

/**
 * Color Cleanup Analysis Script
 * Identifies duplicate and unused color definitions across CSS files
 */

const fs = require('fs');
const path = require('path');

// CSS files to analyze
const cssFiles = [
    'css/body.css',
    'css/news.css', 
    'css/financials.css',
    'css/media.css',
    'css/dark-mode.css',
    'css/read.css',
    'css/chart-modal.css'
];

// Extract all color values from CSS content
function extractColors(cssContent) {
    const colors = new Set();
    
    // Regex patterns for different color formats
    const patterns = [
        /#[0-9a-fA-F]{3,8}/g,           // Hex colors
        /rgb\([^)]+\)/g,                // RGB colors
        /rgba\([^)]+\)/g,               // RGBA colors
        /hsl\([^)]+\)/g,                // HSL colors
        /hsla\([^)]+\)/g,               // HSLA colors
        /\b(?:red|blue|green|yellow|orange|purple|pink|brown|black|white|gray|grey|cyan|magenta|lime|navy|olive|teal|silver|maroon|aqua|fuchsia)\b/gi // Named colors
    ];
    
    patterns.forEach(pattern => {
        const matches = cssContent.match(pattern);
        if (matches) {
            matches.forEach(color => colors.add(color.toLowerCase()));
        }
    });
    
    return colors;
}

// Extract CSS custom properties (variables)
function extractCSSVariables(cssContent) {
    const variables = new Map();
    const variablePattern = /--[\w-]+\s*:\s*([^;]+);/g;
    
    let match;
    while ((match = variablePattern.exec(cssContent)) !== null) {
        const varName = match[0].split(':')[0].trim();
        const varValue = match[1].trim();
        variables.set(varName, varValue);
    }
    
    return variables;
}

// Find variable references
function findVariableReferences(cssContent) {
    const references = new Set();
    const refPattern = /var\(([^)]+)\)/g;
    
    let match;
    while ((match = refPattern.exec(cssContent)) !== null) {
        const varName = match[1].split(',')[0].trim();
        references.add(varName);
    }
    
    return references;
}

// Normalize colors for comparison
function normalizeColor(color) {
    color = color.toLowerCase().trim();
    
    // Convert 3-digit hex to 6-digit
    if (/^#[0-9a-f]{3}$/i.test(color)) {
        color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
    }
    
    // Normalize whitespace in rgb/rgba
    color = color.replace(/\s+/g, '');
    
    return color;
}

// Group similar colors
function groupSimilarColors(colors) {
    const colorGroups = new Map();
    const processed = new Set();
    
    colors.forEach(color => {
        if (processed.has(color)) return;
        
        const normalized = normalizeColor(color);
        const group = [color];
        
        // Find similar colors
        colors.forEach(otherColor => {
            if (color !== otherColor && !processed.has(otherColor)) {
                const otherNormalized = normalizeColor(otherColor);
                
                // Check for exact matches after normalization
                if (normalized === otherNormalized) {
                    group.push(otherColor);
                    processed.add(otherColor);
                }
            }
        });
        
        processed.add(color);
        
        if (group.length > 1) {
            colorGroups.set(normalized, group);
        }
    });
    
    return colorGroups;
}

// Main analysis function
function analyzeColors() {
    console.log('🎨 Color Cleanup Analysis\n');
    
    const allColors = new Set();
    const allVariables = new Map();
    const allReferences = new Set();
    const fileAnalysis = new Map();
    
    // Analyze each CSS file
    cssFiles.forEach(filePath => {
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  File not found: ${filePath}`);
            return;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const colors = extractColors(content);
        const variables = extractCSSVariables(content);
        const references = findVariableReferences(content);
        
        // Add to global collections
        colors.forEach(color => allColors.add(color));
        variables.forEach((value, name) => {
            if (allVariables.has(name) && allVariables.get(name) !== value) {
                console.log(`⚠️  Duplicate variable with different values: ${name}`);
                console.log(`   ${filePath}: ${value}`);
                console.log(`   Previous: ${allVariables.get(name)}`);
            }
            allVariables.set(name, value);
        });
        references.forEach(ref => allReferences.add(ref));
        
        fileAnalysis.set(filePath, {
            colors: Array.from(colors),
            variables: Array.from(variables.keys()),
            references: Array.from(references),
            content
        });
    });
    
    // Find similar colors
    const similarGroups = groupSimilarColors(allColors);
    
    // Find unused variables
    const unusedVariables = [];
    allVariables.forEach((value, name) => {
        if (!allReferences.has(name)) {
            unusedVariables.push(name);
        }
    });
    
    // Generate report
    console.log('📊 ANALYSIS RESULTS\n');
    
    console.log(`Total unique colors found: ${allColors.size}`);
    console.log(`Total CSS variables: ${allVariables.size}`);
    console.log(`Total variable references: ${allReferences.size}`);
    console.log(`Unused variables: ${unusedVariables.length}\n`);
    
    if (similarGroups.size > 0) {
        console.log('🔍 SIMILAR/DUPLICATE COLORS:');
        similarGroups.forEach((group, normalized) => {
            console.log(`\n  ${normalized}:`);
            group.forEach(color => console.log(`    - ${color}`));
        });
        console.log('');
    }
    
    if (unusedVariables.length > 0) {
        console.log('🗑️  UNUSED CSS VARIABLES:');
        unusedVariables.forEach(varName => {
            console.log(`  - ${varName}: ${allVariables.get(varName)}`);
        });
        console.log('');
    }
    
    // Check for hardcoded colors that could use variables
    console.log('🎯 HARDCODED COLORS THAT COULD USE VARIABLES:');
    const commonColors = {
        '#ffffff': '--color-white',
        '#fff': '--color-white', 
        '#000000': '--color-black',
        '#000': '--color-black',
        '#2c5f5a': '--color-primary',
        '#d4822a': '--color-secondary',
        '#e8955d': '--color-accent'
    };
    
    fileAnalysis.forEach((analysis, filePath) => {
        const hardcodedColors = analysis.colors.filter(color => {
            const normalized = normalizeColor(color);
            return commonColors[normalized] && !analysis.content.includes(`var(${commonColors[normalized]})`);
        });
        
        if (hardcodedColors.length > 0) {
            console.log(`\n  ${filePath}:`);
            hardcodedColors.forEach(color => {
                const varName = commonColors[normalizeColor(color)];
                console.log(`    ${color} → ${varName}`);
            });
        }
    });
    
    return {
        similarGroups,
        unusedVariables,
        allVariables,
        fileAnalysis
    };
}

// Run analysis
if (require.main === module) {
    analyzeColors();
}

module.exports = { analyzeColors, extractColors, extractCSSVariables, groupSimilarColors };