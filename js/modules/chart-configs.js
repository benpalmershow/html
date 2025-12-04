/**
 * Chart configuration definitions
 */

const CHART_COLORS = {
    PRIMARY: '#2C5F5A',
    PRIMARY_FILL: 'rgba(44, 95, 90, 0.1)',
    SECONDARY: '#666',
    ACCENT: '#D4822A',
    ERROR: '#8B0000'
};

const CHART_CONFIG = {
    TENSION: 0.4,
    BORDER_WIDTH: 2
};

const INDICATOR_CONFIGS = {
    'Lumber Futures': {
        yMin: 500,
        yMax: 720
    },
    'Consumer Sentiment': {
        yMin: 45,
        yMax: 65
    }
};

export function getChartConfig(indicator, labels, dataPoints) {
    // Input validation
    if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
        console.warn('Invalid or empty dataPoints provided to getChartConfig');
        return null;
    }

    if (!Array.isArray(labels) || labels.length !== dataPoints.length) {
        console.warn('Labels array must match dataPoints length');
        return null;
    }

    const validDataPoints = dataPoints.map(point => {
        const num = parseFloat(point);
        return isNaN(num) ? 0 : num;
    });

    // Check for special indicator types
    if (indicator.name === 'Trade Deficit' && indicator.imports && indicator.exports) {
        return getTradeDeficitConfig(indicator, labels, validDataPoints);
    }

    if (indicator.category === 'Prediction Markets' || indicator.bps_probabilities) {
        return getPredictionMarketConfig(indicator, labels, validDataPoints);
    }

    // Default line chart
    return getLineChartConfig(indicator, labels, validDataPoints);
}

function getLineChartConfig(indicator, labels, dataPoints) {
    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: indicator.name || 'Data',
                data: dataPoints,
                borderColor: CHART_COLORS.PRIMARY,
                backgroundColor: CHART_COLORS.PRIMARY_FILL,
                borderWidth: CHART_CONFIG.BORDER_WIDTH,
                tension: CHART_CONFIG.TENSION,
                fill: true,
                pointBackgroundColor: CHART_COLORS.PRIMARY,
                pointBorderColor: CHART_COLORS.PRIMARY,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: getBaseOptions(indicator)
    };

    // Apply specific indicator config
    if (INDICATOR_CONFIGS[indicator.name]) {
        const cfg = INDICATOR_CONFIGS[indicator.name];
        config.options.scales.y.min = cfg.yMin;
        config.options.scales.y.max = cfg.yMax;
    }

    return config;
}

function getTradeDeficitConfig(indicator, labels, dataPoints) {
    const importValues = [];
    const exportValues = [];
    const deficitValues = [];
    const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

    months.forEach((month, index) => {
        const importValue = indicator.imports[month];
        const exportValue = indicator.exports[month];
        const deficitValue = indicator[month];

        if (importValue && exportValue && deficitValue &&
            !importValue.startsWith('TBD') && !exportValue.startsWith('TBD') && !deficitValue.startsWith('TBD')) {
            const numImport = parseFloat(importValue.replace(/[^0-9.-]/g, ''));
            const numExport = parseFloat(exportValue.replace(/[^0-9.-]/g, ''));
            const numDeficit = parseFloat(deficitValue.replace(/[^0-9.-]/g, ''));

            if (!isNaN(numImport) && !isNaN(numExport) && !isNaN(numDeficit)) {
                importValues.push(numImport);
                exportValues.push(numExport);
                deficitValues.push(numDeficit);
            }
        }
    });

    return {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    type: 'bar',
                    label: 'Imports',
                    data: importValues,
                    backgroundColor: 'rgba(255, 107, 107, 0.7)',
                    borderColor: '#FF6B6B',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    type: 'bar',
                    label: 'Exports',
                    data: exportValues,
                    backgroundColor: 'rgba(81, 207, 102, 0.7)',
                    borderColor: '#51CF66',
                    borderWidth: 1,
                    yAxisID: 'y'
                },
                {
                    type: 'line',
                    label: 'Trade Deficit',
                    data: deficitValues,
                    borderColor: CHART_COLORS.PRIMARY,
                    backgroundColor: 'transparent',
                    borderWidth: 2.5,
                    tension: CHART_CONFIG.TENSION,
                    fill: false,
                    yAxisID: 'y1',
                    pointBackgroundColor: CHART_COLORS.PRIMARY,
                    pointBorderColor: '#fff',
                    pointBorderWidth: 1.5,
                    pointRadius: 4
                }
            ]
        },
        options: {
            ...getBaseOptions(indicator),
            scales: {
                x: { display: true, grid: { display: false, drawBorder: false } },
                y: {
                    display: true,
                    beginAtZero: false,
                    grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
                    ticks: { callback: function (value) { return value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value.toLocaleString(); } },
                    position: 'left',
                    title: { display: true, text: 'Imports / Exports (Billions)' }
                },
                y1: {
                    display: true,
                    beginAtZero: false,
                    grid: { display: false },
                    ticks: { callback: function (value) { return value >= 1000 ? (value / 1000).toFixed(1) + 'K' : value.toLocaleString(); } },
                    position: 'right',
                    title: { display: true, text: 'Trade Deficit (Billions)' }
                }
            }
        }
    };
}

function getPredictionMarketConfig(indicator, labels, dataPoints) {
    return {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Probability (%)',
                data: dataPoints,
                backgroundColor: [
                    CHART_COLORS.PRIMARY,
                    CHART_COLORS.SECONDARY,
                    CHART_COLORS.ACCENT,
                    CHART_COLORS.ERROR
                ],
                borderColor: [
                    CHART_COLORS.PRIMARY,
                    CHART_COLORS.SECONDARY,
                    CHART_COLORS.ACCENT,
                    CHART_COLORS.ERROR
                ],
                borderWidth: CHART_CONFIG.BORDER_WIDTH
            }]
        },
        options: {
            ...getBaseOptions(indicator),
            scales: {
                y: { beginAtZero: true }
            }
        }
    };
}

function getBaseOptions(indicator) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
            padding: { bottom: 20 }
        },
        plugins: {
            legend: { display: true },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    label: function (context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        label += context.parsed.y.toLocaleString();
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                ticks: {
                    callback: function (value) {
                        if (indicator.name && (indicator.name.includes('Rate') || indicator.name.includes('Yield'))) {
                            return value.toFixed(2) + '%';
                        }
                        if (indicator.name && (indicator.name.includes('Price') || indicator.name.includes('Revenue'))) {
                            return '$' + value.toLocaleString();
                        }
                        return value.toLocaleString();
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };
}
