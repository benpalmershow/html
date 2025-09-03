# Financials Interactive Charts Implementation

## Overview

This document describes the implementation of interactive charts for the financials page, extending the existing container rates chart system to support multiple indicators with different chart types.

## Architecture

### Chart Types Supported

1. **Infogram Embeds** - For external interactive charts (e.g., Freightos Baltic Index)
2. **Chart.js Charts** - For internal data visualization using the financials data

### Components

- `js/financials-chart.js` - Core chart functionality and modal management
- `financials.html` - Chart modal HTML and styling
- Chart.js library integration
- Infogram embed system

## Implementation Details

### Chart Configuration System

Each indicator with chart support has a configuration object containing:

```javascript
{
    type: 'chartjs' | 'infogram',
    icon: 'lucide-icon-name',
    title: 'Chart Title',
    description: 'Chart description text',
    chartContent: 'HTML content for chart container',
    data: { /* Chart.js data structure */ } // Only for Chart.js charts
}
```

### Supported Indicators

The following indicators now have interactive charts:

#### Employment Indicators
- **Jobs Added** - Monthly employment changes (bar chart)
- **Jobless Claims** - Weekly unemployment claims (line chart)
- **Job Openings** - Monthly job openings (line chart)
- **Private Employment** - ADP employment data (line chart)

#### Consumer Indicators
- **CPI** - Consumer Price Index trends (line chart)
- **PPI** - Producer Price Index trends (line chart)

#### Housing Market
- **Housing Starts** - New construction activity (line chart)
- **New Home Sales** - Monthly sales trends (line chart)
- **Affordability Index** - Housing affordability (line chart)
- **Housing Market Index** - Builder confidence (line chart)
- **Existing Home Sales** - Market activity (line chart)
- **Days on Market** - Market speed indicator (line chart)

#### Business Indicators
- **Industrial Production Index** - Manufacturing activity (line chart)
- **Small Business Optimism Index** - Business confidence (line chart)

#### Commodities
- **Copper Futures** - Industrial metal prices (line chart)
- **Lumber Futures** - Construction material costs (line chart)

#### Trade & Tariffs
- **Shipping Container Rate** - Freightos Baltic Index (Infogram embed)
- **Port TEUs** - Container volume (line chart)

### Chart Modal System

The chart modal provides a consistent interface for all chart types:

- **Dynamic Content** - Modal content updates based on selected indicator
- **Responsive Design** - Adapts to different screen sizes
- **Accessibility** - Keyboard navigation (ESC to close)
- **Performance** - Charts are initialized only when needed

### Chart.js Integration

Charts are created using Chart.js with consistent styling:

- **Color Scheme** - Uses the site's color palette
- **Responsive** - Automatically adjusts to container size
- **Interactive** - Hover tooltips, legend toggles
- **Performance** - Charts are destroyed and recreated to prevent memory leaks

## Usage

### Adding New Chart Configurations

1. Add a new configuration to the `getChartConfig` function in `financials-chart.js`
2. Include the indicator name in the chart icon array in `financials.html`
3. Ensure the indicator name matches exactly with the data

### Example Configuration

```javascript
'New Indicator': {
    type: 'chartjs',
    icon: 'trending-up',
    title: 'New Indicator - Chart Title',
    description: 'Description of what this chart shows.',
    chartContent: `
        <div style="position: relative; height: 500px; width: 100%;">
            <canvas id="newChart" style="width: 100%; height: 100%;"></canvas>
        </div>
    `,
    data: {
        labels: ['Jan', 'Feb', 'Mar'],
        datasets: [{
            label: 'Indicator Value',
            data: [100, 110, 105],
            borderColor: '#2C5F5A',
            backgroundColor: 'rgba(44, 95, 90, 0.1)',
            tension: 0.4,
            fill: true
        }]
    }
}
```

### Adding Infogram Charts

For external charts, use the Infogram type:

```javascript
'External Chart': {
    type: 'infogram',
    icon: 'external-link',
    title: 'External Chart Title',
    description: 'Description of external chart.',
    chartContent: `
        <div class="infogram-embed" 
             data-id="CHART_ID" 
             data-type="interactive" 
             data-title="Chart Title"
             style="width: 100%; height: 500px; border: none; border-radius: 4px;">
        </div>
    `
}
```

## Technical Notes

### Performance Considerations

- Charts are only initialized when the modal is opened
- Previous charts are properly destroyed to prevent memory leaks
- Chart.js instances are stored in window scope for cleanup

### Browser Compatibility

- Chart.js 4.x+ for modern browsers
- Infogram embeds for external charts
- Fallback handling for unsupported indicators

### Responsive Design

- Modal adapts to mobile and desktop screens
- Charts automatically resize to container
- Touch-friendly interactions

## Future Enhancements

### Potential Additions

1. **Real-time Data Updates** - Live chart updates ✅ **IMPLEMENTED**
2. **Export Functionality** - Download chart images/data
3. **Comparison Charts** - Multiple indicators on same chart
4. **Historical Data** - Extended time series
5. **Custom Chart Types** - Candlestick, heatmaps, etc.

### Data Sources

- **FRED API** - Federal Reserve Economic Data
- **BLS API** - Bureau of Labor Statistics
- **Census API** - Economic indicators
- **Real-time APIs** - Market data providers

## Real-time Data Updates

### Overview

The system now includes comprehensive real-time data update functionality that automatically refreshes chart data based on configurable intervals and data source types.

### Features

✅ **Automatic Updates** - Charts update automatically based on data source frequency
✅ **Configurable Intervals** - Users can adjust update frequency (30s, 1m, 5m, 15m, 1h)
✅ **Real-time Toggle** - Enable/disable real-time updates with a toggle switch
✅ **Live Indicators** - Visual feedback when new data arrives
✅ **Update Timestamps** - Shows last update time for each chart
✅ **Smart Intervals** - Different update frequencies for different data types

### Data Source Types

#### Market Data (High Frequency)
- **Copper Futures** - Real-time data from Yahoo Finance API
- **Lumber Futures** - Real-time data from Yahoo Finance API
- **Gold Futures** - Real-time data from Yahoo Finance API
- **Silver Futures** - Real-time data from Yahoo Finance API
- **Oil Futures** - Real-time data from Yahoo Finance API
- **Update Interval**: 60 seconds

#### Economic Indicators (Medium Frequency)
- **CPI, PPI, Jobs Data** - Real data from BLS (Bureau of Labor Statistics) API
- **Housing Data** - Real data from Census Bureau API
- **Industrial Data** - Real data from Federal Reserve Economic Data (FRED) API
- **Update Interval**: 24 hours (monthly data)

#### Trade Data (Low Frequency)
- **Shipping Container Rates** - Freightos data (requires partnership for real-time)
- **Port TEUs** - Monthly updates
- **Update Interval**: 24 hours to 30 days

### Technical Implementation

#### RealTimeChartManager Class

```javascript
class RealTimeChartManager {
    constructor() {
        this.activeCharts = new Map();        // Active chart instances
        this.updateIntervals = new Map();     // Update intervals
        this.dataSources = new Map();         // Data source configs
        this.isRealTimeEnabled = true;        // Global toggle
        this.updateFrequency = 30000;         // Default: 30 seconds
    }
}
```

#### Data Fetching Methods

- `fetchMarketData()` - Real-time market data from Yahoo Finance API
- `fetchBLSData()` - Official Bureau of Labor Statistics data
- `fetchFedData()` - Federal Reserve Economic Data (FRED) API
- `fetchCensusData()` - U.S. Census Bureau API
- `fetchFreightosData()` - Shipping data (simulated until partnership available)
- `fetchFREDData()` - Additional FRED series data
- `fetchYahooFinanceData()` - Extended market instruments

#### Chart Updates

- Charts update automatically without animation for real-time performance
- New data points are added with "Live" labels
- Smooth transitions between historical and live data
- Memory management with proper chart cleanup

### User Experience

#### Visual Feedback

1. **Real-time Pulse** - Animated indicator when new data arrives
2. **Live Data Points** - Newest data points are clearly marked
3. **Update Notifications** - Brief overlay showing "Live Data" message
4. **Timestamp Display** - Shows last update time with color coding

#### Performance Features

- **Efficient Updates** - Only active charts receive updates
- **Memory Management** - Charts are properly destroyed when modal closes
- **Interval Management** - Smart cleanup of update intervals
- **Responsive Design** - Controls adapt to mobile and desktop

### Configuration Options

#### Update Frequencies

- **30 seconds** - For high-frequency market data
- **1 minute** - For moderate frequency updates
- **5 minutes** - For balanced performance
- **15 minutes** - For lower resource usage
- **1 hour** - For infrequent updates

#### Data Source Configuration

Each indicator can have custom update intervals based on data availability:

```javascript
'Copper Futures': {
    type: 'market',
    updateInterval: 60000,        // 1 minute
    url: 'https://www.cmegroup.com/markets/metals/base/copper.html'
}
```

### Future Real-time Enhancements

#### Planned Features

1. **WebSocket Integration** - True real-time streaming data
2. **API Rate Limiting** - Respect API limits and quotas
3. **Data Validation** - Verify data integrity before updates
4. **Error Recovery** - Automatic retry on failed updates
5. **User Preferences** - Save update frequency preferences

#### Real API Integration

When ready for production:

- **BLS API Keys** - Official Bureau of Labor Statistics data
- **FRED API** - Federal Reserve Economic Data
- **Market Data APIs** - Real-time commodity and equity data
- **WebSocket Feeds** - Live streaming for high-frequency data

### Troubleshooting Real-time Features

#### Common Issues

- **Charts Not Updating** - Check if real-time toggle is enabled
- **High CPU Usage** - Reduce update frequency or disable real-time
- **Data Not Loading** - Verify data source URLs are accessible
- **Memory Leaks** - Ensure modal is properly closed to clean up charts

#### Performance Monitoring

- Monitor chart update frequency
- Check memory usage for active charts
- Verify interval cleanup on modal close
- Test on different devices and browsers

## Maintenance

### Regular Tasks

1. **Data Updates** - Ensure chart data matches current financials data
2. **Chart.js Updates** - Keep library version current
3. **Infogram Maintenance** - Verify external chart links
4. **Performance Monitoring** - Check for memory leaks or slow rendering
5. **Real-time Monitoring** - Monitor update intervals and data source health

### Troubleshooting

- **Charts Not Loading** - Check console for JavaScript errors
- **Data Mismatches** - Verify indicator names match exactly
- **Modal Issues** - Check CSS conflicts or JavaScript errors
- **Performance Issues** - Monitor chart initialization and cleanup
- **Real-time Issues** - Verify toggle state and update intervals
