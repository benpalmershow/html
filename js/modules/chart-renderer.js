/**
 * Financial chart rendering
 */

import { getChartConfig } from './chart-configs.js';

export async function renderFinancialCharts() {
    const containers = document.querySelectorAll('[data-indicator]:not([data-rendered])');
    
    if (containers.length === 0) return;

    // Ensure Chart.js is loaded
    if (!window.Chart) {
        if (typeof window.loadChartJS === 'function') {
            await window.loadChartJS();
        } else {
            console.warn('Chart.js not available');
            return;
        }
    }

    try {
        const financialsData = await fetchFinancialData();
        renderCharts(containers, financialsData);
    } catch (err) {
        console.error('Failed to load or render financial data:', err);
    }
}

async function fetchFinancialData() {
    const response = await fetch('json/financials-data.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
}

function renderCharts(containers, data) {
    containers.forEach(container => {
        const canvasId = container.getAttribute('data-chart-id');
        const indicatorName = container.getAttribute('data-indicator');
        const canvas = document.getElementById(canvasId);

        if (!canvas) {
            console.warn('Canvas not found:', canvasId);
            return;
        }

        const indicator = data.indices.find(i => i.name === indicatorName);
        if (!indicator) {
            console.warn('Indicator not found:', indicatorName);
            return;
        }

        try {
            renderSingleChart(container, canvas, indicator);
        } catch (error) {
            console.error('Chart rendering error for', indicatorName, error);
        }
    });
}

function renderSingleChart(container, canvas, indicator) {
    const { labels, dataPoints } = extractChartData(indicator);

    if (dataPoints.length === 0) {
        console.warn('No data points found for', indicator.name);
        return;
    }

    const chartConfig = getChartConfig(indicator, labels, dataPoints);
    if (!chartConfig) {
        console.warn('Failed to generate chart config for', indicator.name);
        return;
    }

    const ctx = canvas.getContext('2d');
    new window.Chart(ctx, chartConfig);

    // Mark as rendered
    container.dataset.rendered = 'true';

    // Add navigation handler
    container.style.cursor = 'pointer';
    container.onclick = () => {
        window.location.href = 'financials.html?filter=' + encodeURIComponent(indicator.category || 'Financial Indicators');
    };
}

function extractChartData(indicator) {
    let dataPoints = [];
    let labels = [];

    // Check for prediction market data first
    if (indicator.bps_probabilities) {
        labels = Object.keys(indicator.bps_probabilities);
        dataPoints = Object.values(indicator.bps_probabilities).map(v => parseFloat(v));
    } else {
        // Extract historical monthly data
        const monthKeys = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

        monthKeys.forEach(month => {
            if (indicator[month]) {
                const value = parseFloat(indicator[month].replace(/[^0-9.-]/g, ''));
                if (!isNaN(value)) {
                    dataPoints.push(value);
                    labels.push(month.charAt(0).toUpperCase() + month.slice(1, 3));
                }
            }
        });
    }

    return { labels, dataPoints };
}
