#!/usr/bin/env node

/**
 * Color System Validation Script
 * Validates the final consolidated color system
 */

const fs = require('fs');
const path = require('path');

// CSS files to validate
const cssFiles = [
    'css/body.css',
    'css/news.css', 
    'css/financials.css',
    'css/media.css',
    'css/dark-mode.css',
    'css/read.css',
    'css/chart-modal.css'
];

// Platform-specific colors that should remain hardcoded
const allowedHardcodedColors = new Set([
    '#ff0000',      // YouTube red
    '#1db954',      // Spotify green  
    '#f93a1e',      // Rotten Tomatoes red
    '#87c5be',      // Dark mode teal (specific to dark theme)
    '#e1e5e9',      // Dark mode text (specific to dark theme)
    '#a0a9b8',      // Dark mode muted text
    '#1a1f1e',      // Dark mode primary bg
    '#252b2a',      // Dark mode secondary bg
    '#e8955d'       // Dark mode accent (specific to dark theme)
]);

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

// Extract hardcoded colors
function extractHardcodedColors(cssContent) {
    const colors = new Set();
    
    // Regex patterns for different color formats
    const patterns = [
        /#[0-9a-fA-F]{3,8}/g,           // Hex colors
        /rgb\([^)]+\)/g,                // RGB colors
        /rgba\([^)]+\)/g,               // RGBA colors
        /hsl\([^)]+\)/g,                // HSL colors
        /hsla\([^)]+\)/g,               // HSLA colors
    ];
    
    patterns.forEach(pattern => {
        const matches = cssContent.match(pattern);
        if (matches) {
            matches.forEach(color => {
                // Skip colors that are part of CSS variable definitions
                const colorIndex = cssContent.indexOf(color);
                const beforeColor = cssContent.substring(Math.max(0, colorIndex - 50), colorIndex);
                
                // If the color is part of a CSS variable definition, skip it
                if (beforeColor.includes('--') && beforeColor.includes(':')) {
                    return;
                }
                
                colors.add(color.toLowerCase());
            });
        }
    });
    
    return colors;
}

// Check if a CSS variable reference is valid
function isValidVariableReference(varName, allVariables) {
    return allVariables.has(varName);
}

// Calculate contrast ratio (simplified)
function getContrastRatio(color1, color2) {
    // This is a simplified version - in a real implementation you'd want
    // a proper color contrast calculation library
    return 4.5; // Assume acceptable contrast for now
}

// Main validation function
function validateColorSystem() {
    console.log('🔍 Color System Validation\n');
    
    const allVariables = new Map();
    const allReferences = new Set();
    const allHardcodedColors = new Set();
    const fileAnalysis = new Map();
    const issues = [];
    
    // Analyze each CSS file
    cssFiles.forEach(filePath => {
        if (!fs.existsSync(filePath)) {
            issues.push(`❌ File not found: ${filePath}`);
            return;
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        const variables = extractCSSVariables(content);
        const references = findVariableReferences(content);
        const hardcodedColors = extractHardcodedColors(content);
        
        // Add to global collections
        variables.forEach((value, name) => {
            if (allVariables.has(name) && allVariables.get(name) !== value) {
                issues.push(`⚠️  Duplicate variable with different values: ${name}`);
                issues.push(`   ${filePath}: ${value}`);
                issues.push(`   Previous: ${allVariables.get(name)}`);
            }
            allVariables.set(name, value);
        });
        
        references.forEach(ref => allReferences.add(ref));
        hardcodedColors.forEach(color => allHardcodedColors.add(color));
        
        fileAnalysis.set(filePath, {
            variables: Array.from(variables.keys()),
            references: Array.from(references),
            hardcodedColors: Array.from(hardcodedColors),
            content
        });
    });
    
    // Validation checks
    console.log('📊 VALIDATION RESULTS\n');
    
    // 1. Check for invalid variable references
    const invalidReferences = [];
    allReferences.forEach(ref => {
        if (!isValidVariableReference(ref, allVariables)) {
            invalidReferences.push(ref);
        }
    });
    
    if (invalidReferences.length > 0) {
        issues.push('❌ Invalid CSS variable references found:');
        invalidReferences.forEach(ref => {
            issues.push(`   - ${ref}`);
        });
    }
    
    // 2. Check for unauthorized hardcoded colors
    const unauthorizedColors = [];
    allHardcodedColors.forEach(color => {
        if (!allowedHardcodedColors.has(color)) {
            unauthorizedColors.forEach(color => {
                // Check if this color appears in platform-specific contexts
                let isAllowed = false;
                fileAnalysis.forEach((analysis, filePath) => {
                    if (analysis.hardcodedColors.includes(color)) {
                        const content = analysis.content;
                        const colorIndex = content.indexOf(color);
                        const context = content.substring(Math.max(0, colorIndex - 100), colorIndex + 100);
                        
                        // Check if it's in a platform-specific context
                        if (context.includes('youtube') || context.includes('spotify') || 
                            context.includes('apple') || context.includes('rotten') ||
                            context.includes('dark') || context.includes('theme')) {
                            isAllowed = true;
                        }
                    }
                });
                
                if (!isAllowed) {
                    unauthorizedColors.push(color);
                }
            });
        }
    });
    
    if (unauthorizedColors.length > 0) {
        issues.push('⚠️  Hardcoded colors found (should use CSS variables):');
        unauthorizedColors.forEach(color => {
            issues.push(`   - ${color}`);
        });
    }
    
    // 3. Check for unused variables
    const unusedVariables = [];
    allVariables.forEach((value, name) => {
        if (!allReferences.has(name)) {
            unusedVariables.push(name);
        }
    });
    
    if (unusedVariables.length > 0) {
        issues.push('🗑️  Unused CSS variables:');
        unusedVariables.forEach(varName => {
            issues.push(`   - ${varName}: ${allVariables.get(varName)}`);
        });
    }
    
    // Summary
    console.log(`✅ Total CSS variables: ${allVariables.size}`);
    console.log(`✅ Total variable references: ${allReferences.size}`);
    console.log(`✅ Total hardcoded colors: ${allHardcodedColors.size}`);
    console.log(`✅ Files analyzed: ${cssFiles.length}\n`);
    
    if (issues.length === 0) {
        console.log('🎉 Color system validation PASSED! No issues found.\n');
        
        console.log('📋 SYSTEM SUMMARY:');
        console.log('• All color references use valid CSS variables');
        console.log('• No unauthorized hardcoded colors found');
        console.log('• No unused CSS variables detected');
        console.log('• Color system is clean and optimized');
        
        return true;
    } else {
        console.log('❌ Color system validation FAILED. Issues found:\n');
        issues.forEach(issue => console.log(issue));
        return false;
    }
}

// Run validation
if (require.main === module) {
    const isValid = validateColorSystem();
    process.exit(isValid ? 0 : 1);
}

module.exports = { validateColorSystem };