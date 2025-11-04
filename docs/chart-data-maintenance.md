# Chart Data Maintenance Guide

## Monthly JSON Data Updates

The charts are now automatically generated from the JSON data. No manual configuration updates are required.

When `financials-data.json` is updated with new monthly data:

1. **Check JSON Updates**
   - Open `json/financials-data.json`
   - Review all indicators for new monthly data
   - Ensure data is in the correct format with month keys (e.g., "march", "april", etc.)

2. **Automatic Chart Generation**
   - Charts are dynamically created using the `getChartConfig()` function in `js/financials.js`
   - No manual updates needed - charts pull data directly from the JSON file

3. **Testing**
   - After updates, test each chart by:
     - Opening the financials page
     - Clicking each chart icon
     - Verifying the latest data point is visible
     - Confirming historical data matches JSON file

## Important Notes

- Keep consistent formatting in JSON (month keys in lowercase, e.g., "march", "april")
- Charts auto-update when opened - no manual synchronization required
- Chart labels are automatically generated as abbreviated months ('Mar', 'Apr', etc.)

## Affected Files

- `/json/financials-data.json` - Source of truth for data
- `/js/financials.js` - Contains chart generation logic
