# Chart Data Maintenance Guide

## Monthly JSON Data Updates

When `financials-data.min.json` is updated with new monthly data, the following steps must be taken to ensure chart synchronization:

1. **Check JSON Updates**
   - Open `json/financials-data.min.json`
   - Review all indicators for new monthly data
   - Note which indicators have new data points

2. **Update Chart Configurations**
   - Open `js/financials-chart.js`
   - For each indicator with new data:
     - Locate the chart configuration object
     - Update the `labels` array to include the new month
     - Update the `data` array with the new value
     - Verify all historical values match exactly with the JSON file
     - Ensure data arrays and label arrays have matching lengths

3. **Example**
   ```javascript
   // Before update
   data: {
       labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul'],
       datasets: [{
           data: [148.061, 147.686, 148.227, 148.303, 149.341],
       }]
   }

   // After update (with August data)
   data: {
       labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
       datasets: [{
           data: [148.061, 147.686, 148.227, 148.303, 149.341, 149.160],
       }]
   }
   ```

4. **Testing**
   - After updates, test each modified chart by:
     - Opening the financials page
     - Clicking each updated chart icon
     - Verifying the latest data point is visible
     - Confirming historical data matches JSON file

## Important Notes

- Always maintain exact precision from JSON file (don't round numbers)
- Keep consistent formatting (e.g., 'Mar', 'Apr', etc. for month labels)
- Charts auto-update when opened, but configurations must be manually updated
- The `RealTimeChartManager` class handles real-time updates but relies on correct chart configurations

## Affected Files

- `/json/financials-data.min.json` - Source of truth for data
- `/js/financials-chart.js` - Chart configurations
