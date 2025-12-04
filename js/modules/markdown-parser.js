/**
 * Markdown file parsing utilities
 */

import { isMarkedLoaded } from './marked-loader.js';

export async function parseMarkdownFile(fileUrl) {
    try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const md = await response.text();
        return parseMarkdownContent(md);
    } catch (err) {
        console.error('Failed to fetch', fileUrl, err);
        throw err;
    }
}

export function parseMarkdownContent(md) {
    // Extract content after frontmatter
    const parts = md.split(/^---$/m);
    let contentMd = md.trim();

    if (parts.length >= 3) {
        contentMd = parts.slice(2).join('---').trim();
    } else if (parts.length === 2 && !md.trimStart().startsWith('---')) {
        contentMd = md.trim();
    }

    // Convert to HTML if marked is available
    if (isMarkedLoaded() && window.marked) {
        try {
            let contentHtml = window.marked.parse(contentMd);
            return contentHtml;
        } catch (e) {
            console.error('Failed to parse markdown:', e);
            return contentMd;
        }
    }

    return contentMd;
}

export function processCharts(html) {
    const chartRegex = /\{\{chart:([^}]+)\}\}/g;
    const matches = [...html.matchAll(chartRegex)];

    if (matches.length === 0) return html;

    let result = html;
    let idCounter = 0;

    matches.forEach(match => {
        const indicatorName = match[1].trim();
        const canvasId = indicatorName.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '-' + (Date.now() + idCounter++);
        const chartHTML = `<div class="chart-container" data-chart-id="${canvasId}" data-indicator="${indicatorName}"><canvas id="${canvasId}"></canvas></div>`;
        result = result.replace(match[0], chartHTML);
    });

    return result;
}
