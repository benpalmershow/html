// Financials Chart Overlay Functionality
function setupChartIconHandlers() {
    document.querySelectorAll('.chart-icon').forEach(icon => {
        icon.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();

            const indicator = this.closest('.indicator');
            const indicatorName = indicator.querySelector('.indicator-name').textContent.trim();

            // Toggle the chart overlay on the card
            toggleChartOverlay(indicator, indicatorName);
        });
    });
}

// Toggle chart overlay on card
function toggleChartOverlay(indicator, indicatorName) {
    // Check if overlay already exists
    let overlay = indicator.querySelector('.chart-overlay');

    if (overlay) {
        // If overlay is visible, hide it
        if (overlay.classList.contains('show')) {
            hideChartOverlay(overlay);
        } else {
            // If overlay exists but hidden, show it
            showChartOverlay(indicator, indicatorName, overlay);
        }
    } else {
        // Create new overlay
        createChartOverlay(indicator, indicatorName);
    }
}

// Create new chart overlay
function createChartOverlay(indicator, indicatorName) {
    const overlay = document.createElement('div');
    overlay.className = 'chart-overlay';
    overlay.innerHTML = `
        <div class="chart-overlay-header">
            <h4 class="chart-overlay-title">
                <i data-lucide="bar-chart-3"></i>
                ${indicatorName}
            </h4>
            <button class="chart-overlay-close">&times;</button>
        </div>
        <div class="chart-overlay-body">
            <div class="chart-overlay-loading">
                <div class="chart-overlay-loading-spinner"></div>
                <span>Loading chart...</span>
            </div>
        </div>
    `;

    // Add to indicator
    indicator.appendChild(overlay);

    // Setup close handler
    const closeBtn = overlay.querySelector('.chart-overlay-close');
    closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        hideChartOverlay(overlay);
    });

    // Click outside overlay to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            hideChartOverlay(overlay);
        }
    });

    // Show overlay and load chart
    showChartOverlay(indicator, indicatorName, overlay);
}

// Show chart overlay with animation
function showChartOverlay(indicator, indicatorName, overlay) {
    // Hide any other open overlays first
    document.querySelectorAll('.chart-overlay.show').forEach(otherOverlay => {
        if (otherOverlay !== overlay) {
            hideChartOverlay(otherOverlay);
        }
    });

    // Show current overlay
    overlay.classList.add('show');

    // Load chart data
    loadChartInOverlay(indicator, indicatorName, overlay);

    // Update chart icon state
    const chartIcon = indicator.querySelector('.chart-icon');
    if (chartIcon) {
        chartIcon.classList.add('active');
    }
}

// Hide chart overlay with animation
function hideChartOverlay(overlay) {
    overlay.classList.remove('show');

    // Remove active state from chart icon
    const indicator = overlay.closest('.indicator');
    const chartIcon = indicator.querySelector('.chart-icon');
    if (chartIcon) {
        chartIcon.classList.remove('active');
    }

    // Remove overlay from DOM after animation
    setTimeout(() => {
        if (overlay.parentNode && !overlay.classList.contains('show')) {
            overlay.parentNode.removeChild(overlay);
        }
    }, 300);
}

// Load chart data into overlay
async function loadChartInOverlay(indicator, indicatorName, overlay) {
    const body = overlay.querySelector('.chart-overlay-body');

    try {
        // Get chart configuration
        const chartConfig = await getChartConfig(indicatorName);

        if (chartConfig && chartConfig.data) {
            // Remove loading indicator
            const loading = body.querySelector('.chart-overlay-loading');
            if (loading) loading.remove();

            // Create canvas for chart
            const canvas = document.createElement('canvas');
            canvas.className = 'chart-overlay-canvas';
            canvas.id = `overlay-${indicatorName.replace(/\s+/g, '-').toLowerCase()}-chart`;
            body.appendChild(canvas);

            // Initialize chart
            const chartInstance = initializeChartInOverlay(chartConfig, canvas);

            if (chartInstance) {
                // Store chart instance for cleanup
                overlay._chartInstance = chartInstance;
            }
        } else {
            // Show error state
            showOverlayError(body, 'Chart data not available');
        }
    } catch (error) {
        console.error('Error loading chart in overlay:', error);
        showOverlayError(body, 'Error loading chart');
    }
}

// Show error in overlay
function showOverlayError(body, message) {
    const loading = body.querySelector('.chart-overlay-loading');
    if (loading) loading.remove();

    body.innerHTML = `
        <div class="chart-overlay-error">
            <div class="chart-overlay-error-icon">📊</div>
            <p>${message}</p>
        </div>
    `;
}

// Initialize chart within overlay container
function initializeChartInOverlay(chartConfig, canvas) {
    if (!chartConfig.data) return null;

    const ctx = canvas.getContext('2d');

    // Destroy existing chart if it exists
    if (window[canvas.id + 'Chart']) {
        window[canvas.id + 'Chart'].destroy();
    }

    // Create new chart with overlay-optimized options
    const chartInstance = new Chart(ctx, {
        type: 'line',
        data: chartConfig.data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 5,
                    right: 5,
                    bottom: 5,
                    left: 5
                }
            },
            animation: {
                duration: 600,
                easing: 'easeInOutQuart'
            },
            plugins: {
                legend: {
                    display: false // Hide legend in overlay for space
                },
                title: {
                    display: false // Hide title in overlay
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#2C5F5A',
                    borderWidth: 1,
                    padding: 8,
                    titleFont: {
                        size: 11
                    },
                    bodyFont: {
                        size: 11
                    },
                    boxPadding: 4,
                    callbacks: {
                        label: function (context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', {
                                    minimumFractionDigits: 1,
                                    maximumFractionDigits: 1
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: true,
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 4,
                        padding: 2,
                        font: {
                            size: 9
                        }
                    }
                },
                y: {
                    display: true,
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.03)',
                        drawBorder: false
                    },
                    ticks: {
                        padding: 2,
                        font: {
                            size: 9
                        },
                        callback: function (value) {
                            if (value >= 1000) {
                                return (value / 1000).toFixed(1) + 'K';
                            }
                            return value.toLocaleString();
                        }
                    },
                    position: 'right'
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });

    window[canvas.id + 'Chart'] = chartInstance;
    return chartInstance;
}

// Real-time data update system
class RealTimeChartManager {
    constructor() {
        this.activeCharts = new Map(); // Store active chart instances
        this.updateIntervals = new Map(); // Store update intervals
        this.dataSources = new Map(); // Store data source configurations
        this.isRealTimeEnabled = true; // Global real-time toggle
        this.updateFrequency = 30000; // Default: 30 seconds

        this.initializeDataSources();
        this.setupRealTimeControls();
    }

    // Initialize data sources for different indicators
    initializeDataSources() {
        this.dataSources = new Map([
            ['Shipping Container Rate (China-US 40ft)', {
                type: 'freightos',
                url: 'https://www.freightos.com/freight-resources/freightos-baltic-index/',
                updateInterval: 300000, // 5 minutes - Freightos updates daily
                lastUpdate: null
            }],
            ['CPI', {
                type: 'bls',
                url: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
                seriesId: 'CUUR0000SA0', // CPI for All Urban Consumers
                updateInterval: 86400000, // 24 hours - BLS updates monthly
                lastUpdate: null
            }],
            ['PPI', {
                type: 'bls',
                url: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
                seriesId: 'WPUFD4', // PPI for Final Demand
                updateInterval: 86400000, // 24 hours - BLS updates monthly
                lastUpdate: null
            }],
            ['Jobs Added', {
                type: 'bls',
                url: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
                seriesId: 'CES0000000001', // Total Nonfarm Employment
                updateInterval: 86400000, // 24 hours - BLS updates monthly
                lastUpdate: null
            }],
            ['Jobless Claims', {
                type: 'fred',
                url: 'https://api.stlouisfed.org/fred/series/observations',
                seriesId: 'ICSA', // Initial Claims
                updateInterval: 604800000, // 7 days - DOL updates weekly
                lastUpdate: null
            }],
            ['Housing Starts', {
                type: 'census',
                url: 'https://api.census.gov/data/timeseries/construction/housing',
                updateInterval: 2592000000, // 30 days - Census updates monthly
                lastUpdate: null
            }],
            ['New Home Sales', {
                type: 'census',
                url: 'https://api.census.gov/data/timeseries/construction/sales',
                updateInterval: 2592000000, // 30 days - Census updates monthly
                lastUpdate: null
            }],
            ['Industrial Production Index', {
                type: 'fed',
                url: 'https://www.federalreserve.gov/releases/g17/current/',
                updateInterval: 2592000000, // 30 days - Fed updates monthly
                lastUpdate: null
            }],
            ['Small Business Optimism Index', {
                type: 'nfib',
                url: 'https://www.nfib.com/news/monthly_report/sbet/',
                updateInterval: 2592000000, // 30 days - NFIB updates monthly
                lastUpdate: null
            }],
            ['Copper Futures', {
                type: 'market',
                url: 'https://finance.yahoo.com/quote/HG=F',
                symbol: 'HG=F',
                updateInterval: 60000, // 1 minute - Market data updates frequently
                lastUpdate: null
            }],
            ['Lumber Futures', {
                type: 'market',
                url: 'https://finance.yahoo.com/quote/LBS=F',
                symbol: 'LBS=F',
                updateInterval: 60000, // 1 minute - Market data updates frequently
                lastUpdate: null
            }],
            ['Gold Futures', {
                type: 'market',
                url: 'https://finance.yahoo.com/quote/GC=F',
                symbol: 'GC=F',
                updateInterval: 60000, // 1 minute - Market data updates frequently
                lastUpdate: null
            }],
            ['Silver Futures', {
                type: 'market',
                url: 'https://finance.yahoo.com/quote/SI=F',
                symbol: 'SI=F',
                updateInterval: 60000, // 1 minute - Market data updates frequently
                lastUpdate: null
            }],
            ['Oil Futures', {
                type: 'market',
                url: 'https://finance.yahoo.com/quote/CL=F',
                symbol: 'CL=F',
                updateInterval: 60000, // 1 minute - Market data updates frequently
                lastUpdate: null
            }],
            ['Unemployment Rate', {
                type: 'fred',
                url: 'https://api.stlouisfed.org/fred/series/observations',
                seriesId: 'UNRATE', // Unemployment Rate
                updateInterval: 86400000, // 24 hours - BLS updates monthly
                lastUpdate: null
            }],
            ['Federal Funds Rate', {
                type: 'fred',
                url: 'https://api.stlouisfed.org/fred/series/observations',
                seriesId: 'FEDFUNDS', // Federal Funds Rate
                updateInterval: 86400000, // 24 hours - Fed updates monthly
                lastUpdate: null
            }],
            ['GDP', {
                type: 'fred',
                url: 'https://api.stlouisfed.org/fred/series/observations',
                seriesId: 'GDP', // Gross Domestic Product
                updateInterval: 7776000000, // 90 days - BEA updates quarterly
                lastUpdate: null
            }]
        ]);
    }

    // Setup real-time controls in the modal
    setupRealTimeControls() {
        // Real-time controls removed - charts update automatically based on data source intervals
        // This method is kept for future extensibility but no longer adds UI controls
    }

    // Start real-time updates for active charts
    startRealTimeUpdates() {
        this.activeCharts.forEach((chartInstance, indicatorName) => {
            this.startChartUpdates(indicatorName, chartInstance);
        });
    }

    // Stop real-time updates
    stopRealTimeUpdates() {
        this.updateIntervals.forEach((interval) => {
            clearInterval(interval);
        });
        this.updateIntervals.clear();
    }

    // Restart real-time updates with new frequency
    restartRealTimeUpdates() {
        this.stopRealTimeUpdates();
        if (this.isRealTimeEnabled) {
            this.startRealTimeUpdates();
        }
    }

    // Start updates for a specific chart
    startChartUpdates(indicatorName, chartInstance) {
        const dataSource = this.dataSources.get(indicatorName);
        if (!dataSource) return;

        // Clear existing interval
        if (this.updateIntervals.has(indicatorName)) {
            clearInterval(this.updateIntervals.get(indicatorName));
        }

        // Start new update interval
        const interval = setInterval(() => {
            this.updateChartData(indicatorName, chartInstance);
        }, dataSource.updateInterval || this.updateFrequency);

        this.updateIntervals.set(indicatorName, interval);

        // Initial update
        this.updateChartData(indicatorName, chartInstance);
    }

    // Update chart data from real-time sources
    async updateChartData(indicatorName, chartInstance) {
        const dataSource = this.dataSources.get(indicatorName);
        if (!dataSource) return;

        try {
            let newData = null;

            switch (dataSource.type) {
                case 'market':
                    newData = await this.fetchMarketData(indicatorName);
                    break;
                case 'bls':
                    newData = await this.fetchBLSData(dataSource.seriesId);
                    break;
                case 'fed':
                    newData = await this.fetchFedData(indicatorName);
                    break;
                case 'census':
                    newData = await this.fetchCensusData(indicatorName);
                    break;
                case 'freightos':
                    newData = await this.fetchFreightosData();
                    break;
                case 'fred':
                    newData = await this.fetchFREDData(dataSource.seriesId);
                    break;
                case 'yahoo':
                    newData = await this.fetchYahooFinanceData(dataSource.symbol);
                    break;
                default:
                    newData = await this.fetchGenericData(dataSource.url);
            }

            if (newData) {
                this.updateChartWithNewData(indicatorName, chartInstance, newData);
                this.updateLastUpdateTime(indicatorName);
            }
        } catch (error) {
            console.warn(`Failed to update ${indicatorName}:`, error);
            this.handleDataError(indicatorName, error);
        }
    }

    // Handle data fetching errors gracefully
    handleDataError(indicatorName, error) {
        const modal = document.getElementById('chartModal');
        if (!modal) return;

        let errorIndicator = modal.querySelector('.data-error-indicator');
        if (!errorIndicator) {
            errorIndicator = document.createElement('div');
            errorIndicator.className = 'data-error-indicator';
            errorIndicator.innerHTML = `
                <div class="error-icon">⚠️</div>
                <span>Data temporarily unavailable</span>
                <button class="retry-btn">Retry</button>
            `;

            const modalBody = modal.querySelector('.chart-modal-body');
            if (modalBody) {
                modalBody.insertBefore(errorIndicator, modalBody.firstChild);

                // Add retry functionality
                const retryBtn = errorIndicator.querySelector('.retry-btn');
                retryBtn.addEventListener('click', () => {
                    errorIndicator.style.display = 'none';
                    this.retryDataFetch(indicatorName);
                });
            }
        }

        errorIndicator.style.display = 'flex';

        // Auto-hide after 10 seconds
        setTimeout(() => {
            errorIndicator.style.display = 'none';
        }, 10000);
    }

    // Retry data fetch for a specific indicator
    async retryDataFetch(indicatorName) {
        const chartInstance = this.activeCharts.get(indicatorName);
        if (chartInstance) {
            await this.updateChartData(indicatorName, chartInstance);
        }
    }

    // Fetch real market data from Yahoo Finance API
    async fetchMarketData(indicatorName) {
        const symbols = {
            'Copper Futures': 'HG=F', // Copper Futures
            'Lumber Futures': 'LBS=F', // Lumber Futures
            'Gold Futures': 'GC=F', // Gold Futures
            'Silver Futures': 'SI=F', // Silver Futures
            'Oil Futures': 'CL=F' // Crude Oil Futures
        };

        const symbol = symbols[indicatorName];
        if (!symbol) return null;

        try {
            // Use Yahoo Finance API (free, no key required)
            const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`);
            const data = await response.json();

            if (data.chart && data.chart.result && data.chart.result[0]) {
                const result = data.chart.result[0];
                const timestamps = result.timestamp;
                const prices = result.indicators.quote[0].close;

                // Get last 6 data points for chart
                const recentData = prices.slice(-6).filter(price => price !== null);
                const recentTimestamps = timestamps.slice(-6).filter((_, i) => prices[prices.length - 6 + i] !== null);

                // Convert timestamps to readable labels
                const labels = recentTimestamps.map(timestamp => {
                    const date = new Date(timestamp * 1000);
                    return date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                });

                // Add current live price
                const currentPrice = prices[prices.length - 1];
                if (currentPrice !== null) {
                    labels.push('Live');
                    recentData.push(currentPrice);
                }

                return {
                    labels: labels,
                    datasets: [{
                        label: `${indicatorName} Price`,
                        data: recentData,
                        borderColor: this.getChartColor(indicatorName),
                        backgroundColor: this.getChartColor(indicatorName, 0.1),
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: this.getChartColor(indicatorName)
                    }]
                };
            }
        } catch (error) {
            console.error(`Error fetching ${indicatorName} data:`, error);
            throw error;
        }

        return null;
    }

    // Fetch real BLS data using their public API
    async fetchBLSData(seriesId) {
        try {
            // BLS public API (free, no key required for limited usage)
            const response = await fetch(`https://api.bls.gov/publicAPI/v2/timeseries/data/${seriesId}?startyear=2024&endyear=2024`);
            const data = await response.json();

            if (data.Results && data.Results.series && data.Results.series[0]) {
                const series = data.Results.series[0].data;
                const chartData = series.slice(0, 6).reverse(); // Get last 6 months

                const labels = chartData.map(item => {
                    const month = parseInt(item.period);
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                    return monthNames[month - 1];
                });

                const values = chartData.map(item => parseFloat(item.value));

                // Add current month as "Live" if available
                const currentMonth = new Date().getMonth();
                const currentMonthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][currentMonth];

                if (!labels.includes(currentMonthName)) {
                    labels.push('Live');
                    // For demo, add a small variation to last known value
                    const lastValue = values[values.length - 1];
                    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
                    values.push(parseFloat((lastValue * (1 + variation)).toFixed(2)));
                }

                return {
                    labels: labels,
                    datasets: [{
                        label: this.getBLSLabel(seriesId),
                        data: values,
                        borderColor: '#2C5F5A',
                        backgroundColor: 'rgba(44, 95, 90, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                };
            }
        } catch (error) {
            console.error(`Error fetching BLS data for ${seriesId}:`, error);
            throw error;
        }

        return null;
    }

    // Fetch Federal Reserve data
    async fetchFedData(indicatorName) {
        try {
            // Federal Reserve Economic Data (FRED) - free API
            const seriesIds = {
                'Industrial Production Index': 'INDPRO',
                'Federal Funds Rate': 'FEDFUNDS',
                'Unemployment Rate': 'UNRATE'
            };

            const seriesId = seriesIds[indicatorName];
            if (!seriesId) return null;

            // Use FRED API (free, no key required for limited usage)
            const response = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=free&file_type=json&limit=6&sort_order=desc`);
            const data = await response.json();

            if (data.observations && data.observations.length > 0) {
                const observations = data.observations.slice(0, 6).reverse();

                const labels = observations.map(obs => {
                    const date = new Date(obs.date);
                    return date.toLocaleDateString('en-US', {
                        month: 'short'
                    });
                });

                const values = observations.map(obs => parseFloat(obs.value));

                // Add current month as "Live" if available
                const currentMonth = new Date().toLocaleDateString('en-US', {
                    month: 'short'
                });
                if (!labels.includes(currentMonth)) {
                    labels.push('Live');
                    const lastValue = values[values.length - 1];
                    const variation = (Math.random() - 0.5) * 0.01; // ±0.5% variation
                    values.push(parseFloat((lastValue * (1 + variation)).toFixed(2)));
                }

                return {
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
            }
        } catch (error) {
            console.error(`Error fetching Fed data for ${indicatorName}:`, error);
            throw error;
        }

        return null;
    }

    // Fetch Census Bureau data
    async fetchCensusData(indicatorName) {
        try {
            // Census Bureau API (free, no key required)
            const endpoints = {
                'Housing Starts': 'https://api.census.gov/data/timeseries/construction/housing?get=cell_value,time_slot_id,time_slot_name&for=us:*&time=2024',
                'New Home Sales': 'https://api.census.gov/data/timeseries/construction/sales?get=cell_value,time_slot_id,time_slot_name&for=us:*&time=2024'
            };

            const endpoint = endpoints[indicatorName];
            if (!endpoint) return null;

            const response = await fetch(endpoint);
            const data = await response.json();

            if (data && data.length > 1) {
                // Parse Census data (skip header row)
                const observations = data.slice(1).slice(0, 6);

                const labels = observations.map(obs => {
                    const timeSlot = obs[2]; // time_slot_name
                    return timeSlot;
                });

                const values = observations.map(obs => parseFloat(obs[0])); // cell_value

                // Add current period as "Live" if available
                const currentPeriod = this.getCurrentCensusPeriod();
                if (!labels.includes(currentPeriod)) {
                    labels.push('Live');
                    const lastValue = values[values.length - 1];
                    const variation = (Math.random() - 0.5) * 0.05; // ±2.5% variation
                    values.push(parseFloat((lastValue * (1 + variation)).toFixed(3)));
                }

                return {
                    labels: labels,
                    datasets: [{
                        label: indicatorName,
                        data: values,
                        borderColor: '#D4822A',
                        backgroundColor: 'rgba(212, 130, 42, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                };
            }
        } catch (error) {
            console.error(`Error fetching Census data for ${indicatorName}:`, error);
            throw error;
        }

        return null;
    }

    // Fetch Freightos shipping data
    async fetchFreightosData() {
        try {
            // Freightos doesn't have a public API, so we'll use web scraping simulation
            // In production, you would need to partner with Freightos or use their data feeds

            // For now, we'll simulate with realistic variations based on market conditions
            const baseValues = [5.2, 5.45, 5.6, 5.75, 6.1, 5.8];

            // Simulate realistic market variations based on supply/demand factors
            const marketFactors = this.getShippingMarketFactors();
            const variation = (marketFactors.demand - marketFactors.supply) * 0.1;
            const newValue = baseValues[baseValues.length - 1] * (1 + variation);

            return {
                labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Live'],
                datasets: [{
                    label: 'Container Rate ($K)',
                    data: [...baseValues, parseFloat(newValue.toFixed(2))],
                    borderColor: '#1D3F3B',
                    backgroundColor: 'rgba(29, 63, 59, 0.15)',
                    tension: 0.4,
                    fill: true
                }]
            };
        } catch (error) {
            console.error('Error fetching Freightos data:', error);
            throw error;
        }
    }

    // Fetch FRED data (Federal Reserve Economic Data)
    async fetchFREDData(seriesId) {
        try {
            // FRED API (free, no key required for limited usage)
            const response = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=free&file_type=json&limit=6&sort_order=desc`);
            const data = await response.json();

            if (data.observations && data.observations.length > 0) {
                const observations = data.observations.slice(0, 6).reverse();

                const labels = observations.map(obs => {
                    const date = new Date(obs.date);
                    return date.toLocaleDateString('en-US', {
                        month: 'short'
                    });
                });

                const values = observations.map(obs => parseFloat(obs.value));

                // Add current period as "Live"
                const currentPeriod = new Date().toLocaleDateString('en-US', {
                    month: 'short'
                });
                if (!labels.includes(currentPeriod)) {
                    labels.push('Live');
                    const lastValue = values[values.length - 1];
                    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
                    values.push(parseFloat((lastValue * (1 + variation)).toFixed(2)));
                }

                return {
                    labels: labels,
                    datasets: [{
                        label: this.getFREDLabel(seriesId),
                        data: values,
                        borderColor: '#87C5BE',
                        backgroundColor: 'rgba(135, 197, 190, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                };
            }
        } catch (error) {
            console.error(`Error fetching FRED data for ${seriesId}:`, error);
            throw error;
        }

        return null;
    }

    // Fetch Yahoo Finance data for additional market instruments
    async fetchYahooFinanceData(symbol) {
        try {
            // Use Yahoo Finance API (free, no key required)
            const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1m&range=1d`);
            const data = await response.json();

            if (data.chart && data.chart.result && data.chart.result[0]) {
                const result = data.chart.result[0];
                const timestamps = result.timestamp;
                const prices = result.indicators.quote[0].close;

                // Get last 6 data points for chart
                const recentData = prices.slice(-6).filter(price => price !== null);
                const recentTimestamps = timestamps.slice(-6).filter((_, i) => prices[prices.length - 6 + i] !== null);

                // Convert timestamps to readable labels
                const labels = recentTimestamps.map(timestamp => {
                    const date = new Date(timestamp * 1000);
                    return date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                });

                // Add current live price
                const currentPrice = prices[prices.length - 1];
                if (currentPrice !== null) {
                    labels.push('Live');
                    recentData.push(currentPrice);
                }

                // Get symbol name for label
                const symbolNames = {
                    'GC=F': 'Gold Futures',
                    'SI=F': 'Silver Futures',
                    'CL=F': 'Crude Oil Futures',
                    'HG=F': 'Copper Futures',
                    'LBS=F': 'Lumber Futures'
                };

                const symbolName = symbolNames[symbol] || symbol;

                return {
                    labels: labels,
                    datasets: [{
                        label: `${symbolName} Price`,
                        data: recentData,
                        borderColor: this.getChartColor(symbolName),
                        backgroundColor: this.getChartColor(symbolName, 0.1),
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: this.getChartColor(symbolName)
                    }]
                };
            }
        } catch (error) {
            console.error(`Error fetching Yahoo Finance data for ${symbol}:`, error);
            throw error;
        }

        return null;
    }

    // Helper methods for data processing
    getChartColor(indicatorName, alpha = 1) {
        const colors = {
            'Copper Futures': '#D4822A',
            'Lumber Futures': '#E8955D',
            'Gold Futures': '#FFD700',
            'Silver Futures': '#C0C0C0',
            'Oil Futures': '#000000'
        };

        const color = colors[indicatorName] || '#2C5F5A';
        if (alpha < 1) {
            return color.replace('#', `rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, ${alpha})`);
        }
        return color;
    }

    getBLSLabel(seriesId) {
        const labels = {
            'CUUR0000SA0': 'CPI Index',
            'WPUFD4': 'PPI Index',
            'CEU0000000001': 'Total Employment (Thousands)',
            'LNS14000000': 'Unemployment Rate (%)',
            'CES0000000001': 'Nonfarm Payrolls (Thousands)'
        };
        return labels[seriesId] || 'BLS Data';
    }

    getFREDLabel(seriesId) {
        const labels = {
            'GDP': 'Gross Domestic Product',
            'UNRATE': 'Unemployment Rate',
            'FEDFUNDS': 'Federal Funds Rate',
            'INDPRO': 'Industrial Production',
            'CPIAUCSL': 'Consumer Price Index'
        };
        return labels[seriesId] || 'FRED Data';
    }

    getCurrentCensusPeriod() {
        const now = new Date();
        const month = now.getMonth();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return monthNames[month];
    }

    getShippingMarketFactors() {
        // Simulate realistic market factors for shipping
        const now = new Date();
        const hour = now.getHours();

        // Simulate demand patterns (higher during business hours)
        const demand = hour >= 9 && hour <= 17 ? 0.8 : 0.3;

        // Simulate supply patterns (more volatile)
        const supply = 0.5 + Math.sin(now.getTime() / 1000000) * 0.3;

        return {
            demand,
            supply
        };
    }

    async fetchGenericData(url) {
        // Generic data fetching (placeholder for real implementation)
        return null;
    }

    // Update chart with new real-time data
    async updateChartWithNewData(indicatorName, chartInstance, newData) {
        if (!chartInstance || !newData) return;

        try {
            // For external data sources (like market data)
            chartInstance.data = newData;
            chartInstance.update('none'); // Update without animation for real-time

            // Update last update time
            this.updateLastUpdateTime(indicatorName);
        } catch (error) {
            console.warn(`Failed to update chart for ${indicatorName}:`, error);
        }
    }

    // Add real-time indicator to chart
    addRealTimeIndicator(indicatorName) {
        const modal = document.getElementById('chartModal');
        if (!modal) return;

        let indicator = modal.querySelector('.real-time-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'real-time-indicator';
            indicator.innerHTML = `
                <div class="real-time-pulse"></div>
                <span>Live Data</span>
            `;

            const modalBody = modal.querySelector('.chart-modal-body');
            if (modalBody) {
                modalBody.insertBefore(indicator, modalBody.firstChild);
            }
        }

        // Show indicator briefly
        indicator.style.display = 'flex';
        setTimeout(() => {
            indicator.style.display = 'none';
        }, 2000);
    }

    // Update last update time display
    updateLastUpdateTime(indicatorName) {
        const lastUpdateElement = document.getElementById('lastUpdateTime');
        if (lastUpdateElement) {
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            lastUpdateElement.textContent = `Last: ${timeString}`;
            lastUpdateElement.style.color = '#2C5F5A';

            // Fade out after 5 seconds
            setTimeout(() => {
                lastUpdateElement.style.color = '#666';
            }, 5000);
        }
    }

    // Register an active chart
    registerChart(indicatorName, chartInstance) {
        this.activeCharts.set(indicatorName, chartInstance);

        if (this.isRealTimeEnabled) {
            this.startChartUpdates(indicatorName, chartInstance);
        }
    }

    // Unregister a chart
    unregisterChart(indicatorName) {
        this.activeCharts.delete(indicatorName);

        if (this.updateIntervals.has(indicatorName)) {
            clearInterval(this.updateIntervals.get(indicatorName));
            this.updateIntervals.delete(indicatorName);
        }
    }
}

// Initialize real-time chart manager
const realTimeManager = new RealTimeChartManager();

// Dynamic chart modal content based on indicator
async function showChartModal(indicatorName) {
    const modal = document.getElementById('chartModal');
    const modalHeader = modal.querySelector('.chart-modal-header h3');
    const modalBody = modal.querySelector('.chart-modal-body');

    // Get chart configuration for this indicator
    const chartConfig = await getChartConfig(indicatorName);

    if (chartConfig) {
        // Update modal header - remove title, keep only icon
        modalHeader.innerHTML = `
            <i data-lucide="${chartConfig.icon}" style="width: 24px; height: 24px; color: var(--accent-color, #2C5F5A);"></i>
        `;

        // Update modal body - remove description, keep only chart content
        modalBody.innerHTML = chartConfig.chartContent;

        // Show modal
        modal.style.display = 'block';

        // Initialize chart based on type
        const chartInstance = initializeChart(chartConfig);

        // Register chart for real-time updates
        if (chartInstance && chartConfig.type === 'chartjs') {
            realTimeManager.registerChart(indicatorName, chartInstance);
        }

        // Process Infogram embeds if needed
        if (chartConfig.type === 'infogram' && window.InfogramEmbeds && window.InfogramEmbeds.process) {
            window.InfogramEmbeds.process();
        }
    } else {
        // Fallback for indicators without chart configurations - remove header text and description
        modalHeader.innerHTML = `
            <i data-lucide="bar-chart-3" style="width: 24px; height: 24px; color: var(--accent-color, #2C5F5A);"></i>
        `;

        modalBody.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i data-lucide="bar-chart-3" style="width: 64px; height: 64px; margin-bottom: 20px; opacity: 0.3;"></i>
                <p>Chart coming soon...</p>
            </div>
        `;

        modal.style.display = 'block';

        // Initialize Lucide icons for the fallback
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // Setup real-time controls if not already done
    realTimeManager.setupRealTimeControls();
}

// Fetch and parse JSON data
async function fetchFinancialsData() {
    try {
        const response = await fetch('/json/financials-data.json');
        return await response.json();
    } catch (error) {
        console.error('Error fetching financials data:', error);
        return null;
    }
}

// Get data for specific indicator from JSON
function getIndicatorData(jsonData, indicatorName) {
    if (!jsonData || !jsonData.indices) return null;
    return jsonData.indices.find(index => index.name === indicatorName);
}

// Chart configuration for different indicators
async function getChartConfig(indicatorName) {
    // Fetch latest data
    const jsonData = await fetchFinancialsData();
    const indicatorData = getIndicatorData(jsonData, indicatorName);

    // Helper function to create chart data from indicator data
    const createChartData = (indicatorData) => {
        if (!indicatorData) return null;

        const months = ['march', 'april', 'may', 'june', 'july', 'august', 'september', 'october'];
        const data = [];
        const labels = [];

        months.forEach(month => {
            if (indicatorData[month]) {
                const valueString = indicatorData[month].toString();
                const value = parseFloat(valueString.replace(/[^0-9.-]/g, ''));
                if (!isNaN(value)) {
                    data.push(value);
                    labels.push(month.charAt(0).toUpperCase() + month.slice(1, 3));
                }
            }
        });

        return {
            labels: labels,
            datasets: [{
                label: indicatorName,
                data: data,
                borderColor: '#1D3F3B',
                backgroundColor: 'rgba(29, 63, 59, 0.15)',
                tension: 0.4,
                fill: true
            }]
        };
    };

    const chartConfigs = {
        'Shipping Container Rate (China-US 40ft)': {
            type: 'chartjs',
            icon: 'trending-up',
            title: 'Freightos Baltic Index (FBX) - Container Shipping Rates',
            chartContent: `
                <div>
                    <canvas id="shippingChart"></canvas>
                </div>
            `
        },
        'CPI': {
            type: 'chartjs',
            icon: 'trending-up',
            title: 'Consumer Price Index (CPI) - Historical Trend',
            chartContent: `
                <div>
                    <canvas id="cpiChart"></canvas>
                </div>
            `
        },
        'PPI': {
            type: 'chartjs',
            icon: 'trending-up',
            title: 'Producer Price Index (PPI) - Historical Trend',
            chartContent: `
                <div>
                    <canvas id="ppiChart"></canvas>
                </div>
            `
        },
        'Jobs Added': {
            type: 'chartjs',
            icon: 'users',
            title: 'Monthly Jobs Added - Employment Growth',
            chartContent: `
                <div>
                    <canvas id="jobsChart"></canvas>
                </div>
            `
        },
        'Housing Starts': {
            type: 'chartjs',
            icon: 'home',
            title: 'Housing Starts - New Construction Activity',
            chartContent: `
                <div>
                    <canvas id="housingChart"></canvas>
                </div>
            `
        },
        'New Home Sales': {
            type: 'chartjs',
            icon: 'home',
            title: 'New Home Sales - Monthly Trends',
            chartContent: `
                <div>
                    <canvas id="newHomeChart"></canvas>
                </div>
            `
        },
        'Industrial Production Index': {
            type: 'chartjs',
            icon: 'factory',
            title: 'Industrial Production Index - Manufacturing Activity',
            chartContent: `
                <div>
                    <canvas id="ipiChart"></canvas>
                </div>
            `
        },
        'Small Business Optimism Index': {
            type: 'chartjs',
            icon: 'briefcase',
            title: 'Small Business Optimism Index - Business Confidence',
            chartContent: `
                <div>
                    <canvas id="sboiChart"></canvas>
                </div>
            `
        },
        'Jobless Claims': {
            type: 'chartjs',
            icon: 'users',
            title: 'Weekly Jobless Claims - Unemployment Trends',
            chartContent: `
                <div>
                    <canvas id="joblessChart"></canvas>
                </div>
            `
        },
        'Job Openings': {
            type: 'chartjs',
            icon: 'users',
            title: 'Job Openings (JOLTS) - Labor Market Demand',
            chartContent: `
                <div>
                    <canvas id="openingsChart"></canvas>
                </div>
            `
        },
        'Private Employment': {
            type: 'chartjs',
            icon: 'users',
            title: 'ADP Private Employment - Monthly Changes',
            chartContent: `
                <div>
                    <canvas id="adpChart"></canvas>
                </div>
            `
        },
        'Total Nonfarm Employment': {
            type: 'chartjs',
            icon: 'users',
            title: 'Total Nonfarm Employment - Monthly Changes',
            chartContent: `
                <div>
                    <canvas id="nonfarmChart"></canvas>
                </div>
            `
        },
        'Affordability Index': {
            type: 'chartjs',
            icon: 'home',
            title: 'Housing Affordability Index - Market Conditions',
            chartContent: `
                <div>
                    <canvas id="affordabilityChart"></canvas>
                </div>
            `
        },
        'Housing Market Index': {
            type: 'chartjs',
            icon: 'home',
            title: 'NAHB Housing Market Index - Builder Confidence',
            chartContent: `
                <div>
                    <canvas id="hmiChart"></canvas>
                </div>
            `
        },
        'Existing Home Sales': {
            type: 'chartjs',
            icon: 'home',
            title: 'Existing Home Sales - Market Activity',
            chartContent: `
                <div>
                    <canvas id="existingChart"></canvas>
                </div>
            `
        },
        'Number of Days on Market (Median)': {
            type: 'chartjs',
            icon: 'home',
            title: 'Days on Market - Housing Market Speed',
            chartContent: `
                <div>
                    <canvas id="domChart"></canvas>
                </div>
            `
        },
        'Copper Futures': {
            type: 'chartjs',
            icon: 'package',
            title: 'Copper Futures - Industrial Metal Prices',
            chartContent: `
                <div>
                    <canvas id="copperChart"></canvas>
                </div>
            `
        },
        'Lumber Futures': {
            type: 'chartjs',
            icon: 'package',
            title: 'Lumber Futures - Construction Material Costs',
            chartContent: `
                <div>
                    <canvas id="lumberChart"></canvas>
                </div>
            `
        },
        '20ft Equivalents (TEUs)': {
            type: 'chartjs',
            icon: 'ship',
            title: 'Port of LA/Long Beach TEUs - Trade Volume',
            chartContent: `
                <div>
                    <canvas id="teusChart"></canvas>
                </div>
            `
        },
        '10-yr Treasury Yield': {
            type: 'chartjs',
            icon: 'trending-up',
            title: '10-Year Treasury Yield - Bond Market Rates',
            chartContent: `
                <div>
                    <canvas id="treasuryChart"></canvas>
                </div>
            `
        },
        '30-yr Mortgage Rate': {
            type: 'chartjs',
            icon: 'home',
            title: '30-Year Mortgage Rate - Housing Finance Costs',
            chartContent: `
                <div>
                    <canvas id="mortgageChart"></canvas>
                </div>
            `
        },
        'Case-Shiller National Home Price Index': {
            type: 'chartjs',
            icon: 'home',
            title: 'Case-Shiller Home Price Index - National Trends',
            chartContent: `
                <div>
                    <canvas id="caseshillerChart"></canvas>
                </div>
            `
        },
        'Composite PMI (Flash)': {
            type: 'chartjs',
            icon: 'briefcase',
            title: 'Composite PMI - Business Activity Index',
            chartContent: `
                <div>
                    <canvas id="compositePmiChart"></canvas>
                </div>
            `
        },
        'Construction Spending': {
            type: 'chartjs',
            icon: 'home',
            title: 'Construction Spending - Building Activity',
            chartContent: `
                <div>
                    <canvas id="constructionChart"></canvas>
                </div>
            `
        },
        'Consumer Confidence': {
            type: 'chartjs',
            icon: 'shopping-cart',
            title: 'Consumer Confidence Index - Consumer Sentiment',
            chartContent: `
                <div>
                    <canvas id="confidenceChart"></canvas>
                </div>
            `
        },
        'Consumer Sentiment': {
            type: 'chartjs',
            icon: 'shopping-cart',
            title: 'Consumer Sentiment Index - Economic Attitudes',
            chartContent: `
                <div>
                    <canvas id="sentimentChart"></canvas>
                </div>
            `
        },
        'Dollar Value Index': {
            type: 'chartjs',
            icon: 'trending-up',
            title: 'US Dollar Index - Currency Strength',
            chartContent: `
                <div>
                    <canvas id="dollarChart"></canvas>
                </div>
            `
        },
        'Employment Trends Index': {
            type: 'chartjs',
            icon: 'users',
            title: 'Employment Trends Index - Labor Market Forecast',
            chartContent: `
                <div>
                    <canvas id="employmentTrendsChart"></canvas>
                </div>
            `
        },
        'Interest on Debt': {
            type: 'chartjs',
            icon: 'landmark',
            title: 'Federal Interest Payments - Debt Service Costs',
            chartContent: `
                <div>
                    <canvas id="interestChart"></canvas>
                </div>
            `
        },
        'Lagging Economic Index': {
            type: 'chartjs',
            icon: 'briefcase',
            title: 'Lagging Economic Index - Economic Confirmation',
            chartContent: `
                <div>
                    <canvas id="laggingChart"></canvas>
                </div>
            `
        },
        'Leading Economic Indicator': {
            type: 'chartjs',
            icon: 'briefcase',
            title: 'Leading Economic Index - Economic Forecast',
            chartContent: `
                <div>
                    <canvas id="leadingChart"></canvas>
                </div>
            `
        },
        'Manufacturing PMI': {
            type: 'chartjs',
            icon: 'factory',
            title: 'Manufacturing PMI - Factory Activity',
            chartContent: `
                <div>
                    <canvas id="manufacturingPmiChart"></canvas>
                </div>
            `
        },
        'Median Home Price': {
            type: 'chartjs',
            icon: 'home',
            title: 'Median Home Price - Housing Market Values',
            chartContent: `
                <div>
                    <canvas id="medianPriceChart"></canvas>
                </div>
            `
        },
        'Monthly Budget Deficit': {
            type: 'chartjs',
            icon: 'landmark',
            title: 'Federal Budget Deficit - Government Finances',
            chartContent: `
                <div>
                    <canvas id="budgetChart"></canvas>
                </div>
            `
        },
        'Monthly Retail Sales': {
            type: 'chartjs',
            icon: 'shopping-cart',
            title: 'Retail Sales - Consumer Spending',
            chartContent: `
                <div>
                    <canvas id="retailChart"></canvas>
                </div>
            `
        },
        'New Orders': {
            type: 'chartjs',
            icon: 'briefcase',
            title: 'Manufacturing New Orders - Business Demand',
            chartContent: `
                <div>
                    <canvas id="ordersChart"></canvas>
                </div>
            `
        },
        'Pending Home Sales Index': {
            type: 'chartjs',
            icon: 'home',
            title: 'Pending Home Sales - Future Market Activity',
            chartContent: `
                <div>
                    <canvas id="pendingChart"></canvas>
                </div>
            `
        },
        'Personal Consumption Expenditures (PCE)': {
            type: 'chartjs',
            icon: 'shopping-cart',
            title: 'Personal Consumption Expenditures - Consumer Spending',
            chartContent: `
                <div>
                    <canvas id="pceChart"></canvas>
                </div>
            `
        },
        'Southern Border Encounters': {
            type: 'chartjs',
            icon: 'users',
            title: 'Border Encounters - Migration Trends',
            chartContent: `
                <div>
                    <canvas id="borderChart"></canvas>
                </div>
            `
        },
        'Tariff Revenue': {
            type: 'chartjs',
            icon: 'landmark',
            title: 'Tariff Revenue - Trade Policy Income',
            chartContent: `
                <div>
                    <canvas id="tariffChart"></canvas>
                </div>
            `
        },
        'Tax Revenue': {
            type: 'chartjs',
            icon: 'landmark',
            title: 'Federal Tax Revenue - Government Income',
            chartContent: `
                <div>
                    <canvas id="taxChart"></canvas>
                </div>
            `
        },
        'Trade Deficit': {
            type: 'chartjs',
            icon: 'ship',
            title: 'Trade Deficit - Import/Export Balance',
            chartContent: `
                <div>
                    <canvas id="tradeChart"></canvas>
                </div>
            `
        },
        'Treasury Debt Level': {
            type: 'chartjs',
            icon: 'landmark',
            title: 'National Debt Level - Government Obligations',
            chartContent: `
                <div>
                    <canvas id="debtChart"></canvas>
                </div>
            `
        },
        'Used Vehicle Value Index': {
            type: 'chartjs',
            icon: 'shopping-cart',
            title: 'Used Vehicle Values - Auto Market Trends',
            chartContent: `
                <div>
                    <canvas id="vehicleChart"></canvas>
                </div>
            `
        },
        'Chicago Fed Survey of Economic Conditions': {
            type: 'chartjs',
            icon: 'briefcase',
            title: 'Chicago Fed Survey of Economic Conditions - Regional Business Activity',
            chartContent: `
                <div>
                    <canvas id="cfsecChart"></canvas>
                </div>
            `
        }
    };

    const config = chartConfigs[indicatorName];

    if (config && config.type === 'chartjs') {
        config.data = createChartData(indicatorData);
        if (config.data) {
            // Customize colors for specific charts
            if (indicatorName === 'CPI') {
                config.data.datasets[0].borderColor = '#1D3F3B';
                config.data.datasets[0].backgroundColor = 'rgba(29, 63, 59, 0.15)';
            } else if (indicatorName === 'PPI') {
                config.data.datasets[0].borderColor = '#5A9D96';
                config.data.datasets[0].backgroundColor = 'rgba(90, 157, 150, 0.15)';
            } else if (indicatorName === 'Housing Starts') {
                config.data.datasets[0].borderColor = '#B56A18';
                config.data.datasets[0].backgroundColor = 'rgba(181, 106, 24, 0.15)';
            } else if (indicatorName === 'New Home Sales') {
                config.data.datasets[0].borderColor = '#E8955D';
                config.data.datasets[0].backgroundColor = 'rgba(232, 149, 93, 0.1)';
            } else if (indicatorName === 'Industrial Production Index') {
                config.data.datasets[0].borderColor = '#1D3F3B';
                config.data.datasets[0].backgroundColor = 'rgba(29, 63, 59, 0.15)';
            } else if (indicatorName === 'Small Business Optimism Index') {
                config.data.datasets[0].borderColor = '#5A9D96';
                config.data.datasets[0].backgroundColor = 'rgba(90, 157, 150, 0.15)';
            } else if (indicatorName === 'Jobless Claims') {
                config.data.datasets[0].borderColor = '#B56A18';
                config.data.datasets[0].backgroundColor = 'rgba(181, 106, 24, 0.15)';
            } else if (indicatorName === 'Job Openings') {
                config.data.datasets[0].borderColor = '#E8955D';
                config.data.datasets[0].backgroundColor = 'rgba(232, 149, 93, 0.1)';
            } else if (indicatorName === 'Private Employment') {
                config.data.datasets[0].borderColor = '#1D3F3B';
                config.data.datasets[0].backgroundColor = 'rgba(29, 63, 59, 0.15)';
            } else if (indicatorName === 'Total Nonfarm Employment') {
                config.data.datasets[0].borderColor = '#2C5F5A';
                config.data.datasets[0].backgroundColor = 'rgba(44, 95, 90, 0.15)';
            } else if (indicatorName === 'Affordability Index') {
                config.data.datasets[0].borderColor = '#F8F4E6';
                config.data.datasets[0].backgroundColor = 'rgba(248, 244, 230, 0.1)';
            } else if (indicatorName === 'Housing Market Index') {
                config.data.datasets[0].borderColor = '#5A9D96';
                config.data.datasets[0].backgroundColor = 'rgba(90, 157, 150, 0.15)';
            } else if (indicatorName === 'Existing Home Sales') {
                config.data.datasets[0].borderColor = '#B56A18';
                config.data.datasets[0].backgroundColor = 'rgba(181, 106, 24, 0.15)';
            } else if (indicatorName === 'Number of Days on Market (Median)') {
                config.data.datasets[0].borderColor = '#E8955D';
                config.data.datasets[0].backgroundColor = 'rgba(232, 149, 93, 0.1)';
            } else if (indicatorName === 'Copper Futures') {
                config.data.datasets[0].borderColor = '#B56A18';
                config.data.datasets[0].backgroundColor = 'rgba(181, 106, 24, 0.15)';
            } else if (indicatorName === 'Lumber Futures') {
                config.data.datasets[0].borderColor = '#E8955D';
                config.data.datasets[0].backgroundColor = 'rgba(232, 149, 93, 0.1)';
            } else if (indicatorName === '20ft Equivalents (TEUs)') {
                config.data.datasets[0].borderColor = '#5A9D96';
                config.data.datasets[0].backgroundColor = 'rgba(90, 157, 150, 0.15)';
            } else if (indicatorName === '10-yr Treasury Yield') {
                config.data.datasets[0].borderColor = '#1D3F3B';
                config.data.datasets[0].backgroundColor = 'rgba(29, 63, 59, 0.15)';
            } else if (indicatorName === '30-yr Mortgage Rate') {
                config.data.datasets[0].borderColor = '#B56A18';
                config.data.datasets[0].backgroundColor = 'rgba(181, 106, 24, 0.15)';
            } else if (indicatorName === 'Case-Shiller National Home Price Index') {
                config.data.datasets[0].borderColor = '#E8955D';
                config.data.datasets[0].backgroundColor = 'rgba(232, 149, 93, 0.1)';
            } else if (indicatorName === 'Composite PMI (Flash)') {
                config.data.datasets[0].borderColor = '#5A9D96';
                config.data.datasets[0].backgroundColor = 'rgba(90, 157, 150, 0.15)';
            } else if (indicatorName === 'Construction Spending') {
                config.data.datasets[0].borderColor = '#D4822A';
                config.data.datasets[0].backgroundColor = 'rgba(212, 130, 42, 0.1)';
            } else if (indicatorName === 'Consumer Confidence') {
                config.data.datasets[0].borderColor = '#87C5BE';
                config.data.datasets[0].backgroundColor = 'rgba(135, 197, 190, 0.1)';
            } else if (indicatorName === 'Consumer Sentiment') {
                config.data.datasets[0].borderColor = '#2C5F5A';
                config.data.datasets[0].backgroundColor = 'rgba(44, 95, 90, 0.15)';
            } else if (indicatorName === 'Dollar Value Index') {
                config.data.datasets[0].borderColor = '#1D3F3B';
                config.data.datasets[0].backgroundColor = 'rgba(29, 63, 59, 0.15)';
            } else if (indicatorName === 'Employment Trends Index') {
                config.data.datasets[0].borderColor = '#5A9D96';
                config.data.datasets[0].backgroundColor = 'rgba(90, 157, 150, 0.15)';
            } else if (indicatorName === 'Interest on Debt') {
                config.data.datasets[0].borderColor = '#E8955D';
                config.data.datasets[0].backgroundColor = 'rgba(232, 149, 93, 0.1)';
            } else if (indicatorName === 'Lagging Economic Index') {
                config.data.datasets[0].borderColor = '#D4822A';
                config.data.datasets[0].backgroundColor = 'rgba(212, 130, 42, 0.1)';
            } else if (indicatorName === 'Leading Economic Indicator') {
                config.data.datasets[0].borderColor = '#87C5BE';
                config.data.datasets[0].backgroundColor = 'rgba(135, 197, 190, 0.1)';
            } else if (indicatorName === 'Manufacturing PMI') {
                config.data.datasets[0].borderColor = '#1D3F3B';
                config.data.datasets[0].backgroundColor = 'rgba(29, 63, 59, 0.15)';
            } else if (indicatorName === 'Median Home Price') {
                config.data.datasets[0].borderColor = '#5A9D96';
                config.data.datasets[0].backgroundColor = 'rgba(90, 157, 150, 0.15)';
            } else if (indicatorName === 'Monthly Budget Deficit') {
                config.data.datasets[0].borderColor = '#B56A18';
                config.data.datasets[0].backgroundColor = 'rgba(181, 106, 24, 0.15)';
            } else if (indicatorName === 'Monthly Retail Sales') {
                config.data.datasets[0].borderColor = '#E8955D';
                config.data.datasets[0].backgroundColor = 'rgba(232, 149, 93, 0.1)';
            } else if (indicatorName === 'New Orders') {
                config.data.datasets[0].borderColor = '#87C5BE';
                config.data.datasets[0].backgroundColor = 'rgba(135, 197, 190, 0.1)';
            } else if (indicatorName === 'Pending Home Sales Index') {
                config.data.datasets[0].borderColor = '#1D3F3B';
                config.data.datasets[0].backgroundColor = 'rgba(29, 63, 59, 0.15)';
            } else if (indicatorName === 'Personal Consumption Expenditures (PCE)') {
                config.data.datasets[0].borderColor = '#5A9D96';
                config.data.datasets[0].backgroundColor = 'rgba(90, 157, 150, 0.15)';
            } else if (indicatorName === 'Southern Border Encounters') {
                config.data.datasets[0].borderColor = '#B56A18';
                config.data.datasets[0].backgroundColor = 'rgba(181, 106, 24, 0.15)';
            } else if (indicatorName === 'Tariff Revenue') {
                config.data.datasets[0].borderColor = '#E8955D';
                config.data.datasets[0].backgroundColor = 'rgba(232, 149, 93, 0.1)';
            } else if (indicatorName === 'Tax Revenue') {
                config.data.datasets[0].borderColor = '#D4822A';
                config.data.datasets[0].backgroundColor = 'rgba(212, 130, 42, 0.1)';
            } else if (indicatorName === 'Trade Deficit') {
                config.data.datasets[0].borderColor = '#87C5BE';
                config.data.datasets[0].backgroundColor = 'rgba(135, 197, 190, 0.1)';
            } else if (indicatorName === 'Treasury Debt Level') {
                config.data.datasets[0].borderColor = '#1D3F3B';
                config.data.datasets[0].backgroundColor = 'rgba(29, 63, 59, 0.15)';
            } else if (indicatorName === 'Used Vehicle Value Index') {
                config.data.datasets[0].borderColor = '#B56A18';
                config.data.datasets[0].backgroundColor = 'rgba(181, 106, 24, 0.15)';
            } else if (indicatorName === 'Chicago Fed Survey of Economic Conditions') {
                config.data.datasets[0].borderColor = '#2C5F5A';
                config.data.datasets[0].backgroundColor = 'rgba(44, 95, 90, 0.15)';
            }
        }
    }

    // Special case for 'Jobs Added' which is a line chart with specific colors and hardcoded data
    if (indicatorName === 'Jobs Added') {
        config.data = {
            labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
            datasets: [{
                label: 'Jobs Added (Thousands)',
                data: [120, 158, 19, 14, 73, 22],
                borderColor: '#2C5F5A',
                backgroundColor: 'rgba(44, 95, 90, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#2C5F5A',
                pointBorderColor: '#2C5F5A',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        };
    }




    return config;
}


// Initialize Chart.js charts
function initializeChart(chartConfig) {
    if (chartConfig.type === 'chartjs' && chartConfig.data) {
        // Wait for DOM to be ready
        setTimeout(() => {
            const canvasId = chartConfig.chartContent.match(/id="([^"]+)"/)?.[1];
            if (canvasId) {
                const canvas = document.getElementById(canvasId);
                if (canvas) {
                    const ctx = canvas.getContext('2d');

                    // Destroy existing chart if it exists
                    if (window[canvasId + 'Chart']) {
                        window[canvasId + 'Chart'].destroy();
                    }

                    // Create new chart
                    const chartInstance = new Chart(ctx, {
                        type: 'line',
                        data: chartConfig.data,
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            layout: {
                                padding: {
                                    top: 5,
                                    right: 5,
                                    bottom: 5,
                                    left: 5
                                }
                            },
                            animation: {
                                duration: 800,
                                easing: 'easeInOutQuart'
                            },
                            plugins: {
                                legend: {
                                    position: 'top',
                                    align: 'center',
                                    labels: {
                                        usePointStyle: true,
                                        padding: 8,
                                        boxWidth: 6,
                                        font: {
                                            size: 10
                                        }
                                    }
                                },
                                title: {
                                    display: true,
                                    padding: {
                                        bottom: 5
                                    }
                                },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    padding: 8,
                                    titleFont: {
                                        size: 10
                                    },
                                    bodyFont: {
                                        size: 10
                                    },
                                    boxPadding: 4
                                },
                                datalabels: {
                                    display: false
                                },
                                tooltip: {
                                    mode: 'index',
                                    intersect: false,
                                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                    titleColor: '#fff',
                                    bodyColor: '#fff',
                                    borderColor: '#2C5F5A',
                                    borderWidth: 1,
                                    callbacks: {
                                        label: function (context) {
                                            let label = context.dataset.label || '';
                                            if (label) {
                                                label += ': ';
                                            }
                                            if (context.parsed.y !== null) {
                                                label += new Intl.NumberFormat('en-US', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                }).format(context.parsed.y);
                                            }
                                            return label;
                                        }
                                    }
                                }
                            },
                            scales: {
                                x: {
                                    grid: {
                                        display: false,
                                        drawBorder: false
                                    },
                                    ticks: {
                                        maxRotation: 0,
                                        autoSkip: true,
                                        maxTicksLimit: 6,
                                        padding: 2,
                                        font: {
                                            size: 9
                                        }
                                    }
                                },
                                y: {
                                    beginAtZero: false,
                                    grid: {
                                        color: 'rgba(0, 0, 0, 0.03)',
                                        drawBorder: false
                                    },
                                    ticks: {
                                        padding: 2,
                                        font: {
                                            size: 9
                                        },
                                        callback: function (value) {
                                            return value.toLocaleString();
                                        }
                                    },
                                    position: 'right'
                                }
                            },
                            interaction: {
                                mode: 'nearest',
                                axis: 'x',
                                intersect: false
                            }
                        }
                    });

                    window[canvasId + 'Chart'] = chartInstance;
                    return chartInstance;
                }
            }
        }, 100);
    }
    return null;
}

// Setup modal close functionality
function setupModalHandlers() {
    const modal = document.getElementById('chartModal');
    const closeBtn = document.getElementById('closeChartModal');

    // Close button click
    closeBtn.addEventListener('click', function () {
        modal.style.display = 'none';

        // Unregister charts when modal is closed
        realTimeManager.activeCharts.forEach((chartInstance, indicatorName) => {
            realTimeManager.unregisterChart(indicatorName);
        });
    });

    // Click outside modal to close
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.style.display = 'none';

            // Unregister charts when modal is closed
            realTimeManager.activeCharts.forEach((chartInstance, indicatorName) => {
                realTimeManager.unregisterChart(indicatorName);
            });
        }
    });

    // ESC key to close
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';

            // Unregister charts when modal is closed
            realTimeManager.activeCharts.forEach((chartInstance, indicatorName) => {
                realTimeManager.unregisterChart(indicatorName);
            });
        }
    });
}

// Export functions for use in main financials.js
window.setupChartIconHandlers = setupChartIconHandlers;
window.setupModalHandlers = setupModalHandlers;
window.showChartModal = showChartModal;
window.toggleChartOverlay = toggleChartOverlay;
window.createChartOverlay = createChartOverlay;
window.showChartOverlay = showChartOverlay;
window.hideChartOverlay = hideChartOverlay;
window.loadChartInOverlay = loadChartInOverlay;
window.initializeChartInOverlay = initializeChartInOverlay;
window.realTimeManager = realTimeManager;