// Chart configuration and initialization

let chartOverlayTimeout;

function showChartOverlay(indicator, indicatorName, overlay) {
    document.querySelectorAll('.chart-overlay.show').forEach(otherOverlay => {
        if (otherOverlay !== overlay) hideChartOverlay(otherOverlay);
    });
    overlay.classList.add('show');
    loadChartInOverlay(indicator, indicatorName, overlay);
}

function hideChartOverlay(overlay) {
    overlay.classList.remove('show');
    if (overlay._chartInstance) {
        overlay._chartInstance.destroy();
        overlay._chartInstance = null;
    }
}

function toggleChartOverlay(indicator, indicatorName) {
    let overlay = indicator.querySelector('.chart-overlay');

    if (overlay) {
        if (overlay.classList.contains('show')) hideChartOverlay(overlay);
        else showChartOverlay(indicator, indicatorName, overlay);
    } else {
        createChartOverlay(indicator, indicatorName);
    }
}

function createChartOverlay(indicator, indicatorName) {
    const overlay = document.createElement('div');
    overlay.className = 'chart-overlay';
    overlay.innerHTML = `
        <h4 class="chart-overlay-title-floating">${indicatorName}</h4>
        <button class="chart-overlay-close">&times;</button>
        <div class="chart-overlay-body">
            <div class="chart-overlay-loading">
                <div class="chart-overlay-loading-spinner"></div>
                <span>Loading chart...</span>
            </div>
        </div>
    `;

    indicator.appendChild(overlay);

    const closeBtn = overlay.querySelector('.chart-overlay-close');
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideChartOverlay(overlay);
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) hideChartOverlay(overlay);
    });

    showChartOverlay(indicator, indicatorName, overlay);
}

function loadChartInOverlay(indicator, indicatorName, overlay) {
    const body = overlay.querySelector('.chart-overlay-body');

    try {
        if (!window.financialData || !window.financialData.indices) {
            showOverlayError(body, 'Financial data not loaded');
            return;
        }

        const chartConfig = getChartConfig(indicatorName, window.financialData.indices);

        if (chartConfig && chartConfig.data) {
            const loading = body.querySelector('.chart-overlay-loading');
            if (loading) loading.remove();

            const canvas = document.createElement('canvas');
            canvas.className = 'chart-overlay-canvas';
            canvas.id = `overlay-${indicatorName.replace(/\s+/g, '-').toLowerCase()}-chart`;
            body.appendChild(canvas);

            const chartInstance = initializeChartInOverlay(chartConfig, canvas);
            if (chartInstance) overlay._chartInstance = chartInstance;
        } else {
            showOverlayError(body, 'Chart data not available');
        }
    } catch (error) {
        console.error('Error loading chart in overlay:', error);
        showOverlayError(body, 'Error loading chart');
    }
}

function showOverlayError(body, message) {
    const loading = body.querySelector('.chart-overlay-loading');
    if (loading) loading.remove();

    body.innerHTML = `<div class="chart-overlay-error"><div class="chart-overlay-error-icon">📊</div><p>${message}</p></div>`;
}

function initializeChartInOverlay(chartConfig, canvas) {
    if (!chartConfig.data) return null;

    const ctx = canvas.getContext('2d');

    if (window[canvas.id + 'Chart']) window[canvas.id + 'Chart'].destroy();

    // Determine chart type based on config
    const isMixedChart = chartConfig.type === 'chartjs-mixed';
    const chartType = isMixedChart ? 'bar' : 'line';

    // Build scales based on chart type
    const scales = {
        x: { display: true, grid: { display: false, drawBorder: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 4, padding: 2, font: { size: 9 } } }
    };

    if (isMixedChart) {
        // Dual Y-axes for mixed chart
        scales.y = {
            display: true,
            beginAtZero: false,
            grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
            ticks: { padding: 2, font: { size: 9 }, callback: formatYAxisTick },
            position: 'left',
            title: { display: true, text: 'Imports / Exports (Billions)', font: { size: 10, weight: 'bold' } }
        };
        scales.y1 = {
            display: true,
            beginAtZero: false,
            grid: { display: false },
            ticks: { padding: 2, font: { size: 9 }, callback: formatYAxisTick },
            position: 'right',
            title: { display: true, text: 'Trade Deficit (Billions)', font: { size: 10, weight: 'bold' } }
        };
    } else {
        // Single Y-axis for standard line chart
        scales.y = {
            display: true,
            beginAtZero: false,
            grid: { color: 'rgba(0, 0, 0, 0.03)', drawBorder: false },
            ticks: { padding: 2, font: { size: 9 }, callback: formatYAxisTick },
            position: 'right'
        };
    }

    const chartInstance = new Chart(ctx, {
        type: chartType,
        data: chartConfig.data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 15, right: 0, bottom: 25, left: 10 } },
            animation: { duration: 600, easing: 'easeInOutQuart' },
            plugins: {
                legend: { display: true, position: 'top', labels: { font: { size: 10 }, padding: 10, boxWidth: 12 } },
                title: { display: false },
                tooltip: {
                    mode: 'index', intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', titleColor: '#fff', bodyColor: '#fff',
                    borderColor: '#2C5F5A', borderWidth: 1, padding: 8,
                    titleFont: { size: 11 }, bodyFont: { size: 11 }, boxPadding: 4,
                    callbacks: {
                        title: function (context) {
                            if (context.length > 0) {
                                return context[0].label;
                            }
                            return '';
                        },
                        label: function (context) {
                            if (context.parsed.y !== null) {
                                return context.dataset.label + ': ' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(context.parsed.y) + 'B';
                            }
                            return '';
                        }
                    }
                }
            },
            scales: scales,
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });

    window[canvas.id + 'Chart'] = chartInstance;
    return chartInstance;
}

function getChartConfig(indicatorName, indices) {
     const indicatorData = indices.find(item => item.name.trim().toLowerCase() === indicatorName.trim().toLowerCase());
     if (!indicatorData) return null;

     // Find year-nested data (keys that are numeric/year-like)
     const yearKeys = Object.keys(indicatorData)
         .filter(key => /^\d{4}$/.test(key))
         .map(key => parseInt(key))
         .sort((a, b) => b - a); // Sort years descending

     const labels = [];
     const values = [];

     // Check if this is Trade Deficit with imports/exports data
     if (indicatorName === 'Trade Deficit' && indicatorData.imports && indicatorData.exports) {
         const importValues = [];
         const exportValues = [];
         const deficitValues = [];

         // Iterate through year-nested data first (in reverse chronological order)
         for (const year of yearKeys) {
             const yearData = indicatorData[year];
             MONTHS.forEach((month, index) => {
                 const importValue = yearData.imports && yearData.imports[month];
                 const exportValue = yearData.exports && yearData.exports[month];
                 const deficitValue = yearData[month];

                 if (isValidData(importValue) && isValidData(exportValue) && isValidData(deficitValue)) {
                     const numImport = extractNumericValue(importValue);
                     const numExport = extractNumericValue(exportValue);
                     const numDeficit = extractNumericValue(deficitValue);

                     if (numImport !== null && numExport !== null && numDeficit !== null) {
                         labels.push(MONTH_LABELS[index]);
                         importValues.push(numImport);
                         exportValues.push(numExport);
                         deficitValues.push(numDeficit);
                     }
                 }
             });
         }

         // Fall back to flat structure if no year-nested data
         if (labels.length === 0) {
             MONTHS.forEach((month, index) => {
                 const importValue = indicatorData.imports[month];
                 const exportValue = indicatorData.exports[month];
                 const deficitValue = indicatorData[month];

                 if (isValidData(importValue) && isValidData(exportValue) && isValidData(deficitValue)) {
                     const numImport = extractNumericValue(importValue);
                     const numExport = extractNumericValue(exportValue);
                     const numDeficit = extractNumericValue(deficitValue);

                     if (numImport !== null && numExport !== null && numDeficit !== null) {
                         labels.push(MONTH_LABELS[index]);
                         importValues.push(numImport);
                         exportValues.push(numExport);
                         deficitValues.push(numDeficit);
                     }
                 }
             });
         }

         const data = {
             labels: labels,
             datasets: [
                 {
                     label: 'Imports',
                     data: importValues,
                     type: 'bar',
                     backgroundColor: 'rgba(255, 107, 107, 0.7)',
                     borderColor: '#FF6B6B',
                     borderWidth: 1,
                     yAxisID: 'y'
                 },
                 {
                     label: 'Exports',
                     data: exportValues,
                     type: 'bar',
                     backgroundColor: 'rgba(81, 207, 102, 0.7)',
                     borderColor: '#51CF66',
                     borderWidth: 1,
                     yAxisID: 'y'
                 },
                 {
                     label: 'Trade Deficit',
                     data: deficitValues,
                     type: 'line',
                     borderColor: '#2C5F5A',
                     backgroundColor: 'transparent',
                     borderWidth: 2.5,
                     tension: 0.4,
                     fill: false,
                     yAxisID: 'y1',
                     pointBackgroundColor: '#2C5F5A',
                     pointBorderColor: '#fff',
                     pointBorderWidth: 1.5,
                     pointRadius: 4
                 }
             ]
         };

         return { type: 'chartjs-mixed', data: data };
     }

     // Standard single-line chart
     // Build map of all available data points (flat structure + year-nested)
     const dataMap = {};
     
     // First add flat structure data
     MONTHS.forEach((month, index) => {
         const value = indicatorData[month];
         if (isValidData(value)) {
             const numValue = extractNumericValue(value);
             if (numValue !== null) {
                 dataMap[`${null}-${index}`] = {
                     month: month,
                     label: MONTH_LABELS[index],
                     value: numValue,
                     monthIndex: index,
                     year: null
                 };
             }
         }
     });
     
     // Then add year-nested data (overwrites flat data for same month if present)
     for (const year of yearKeys) {
         const yearData = indicatorData[year];
         MONTHS.forEach((month, index) => {
             const value = yearData[month];
             if (isValidData(value)) {
                 const numValue = extractNumericValue(value);
                 if (numValue !== null) {
                     dataMap[`${year}-${index}`] = {
                         month: month,
                         label: MONTH_LABELS[index],
                         value: numValue,
                         monthIndex: index,
                         year: year
                     };
                 }
             }
         });
     }
     
     // Sort by year ascending (older first), then by month index ascending (chronological order)
     const sortedData = Object.values(dataMap).sort((a, b) => {
         if (a.year !== b.year) {
             const yearA = a.year !== null ? a.year : 2025; // Treat null as 2025
             const yearB = b.year !== null ? b.year : 2025;
             return yearA - yearB;
         }
         return a.monthIndex - b.monthIndex;
     });
     
     // Build final labels and values arrays
     sortedData.forEach(item => {
         labels.push(item.label);
         values.push(item.value);
     });

     const data = {
         labels: labels,
         datasets: [{
             label: indicatorName,
             data: values,
             borderColor: '#2C5F5A',
             backgroundColor: 'rgba(44, 95, 90, 0.1)',
             tension: 0.4,
             fill: true
         }]
     };

     return { type: 'chartjs', data: data };
 }
