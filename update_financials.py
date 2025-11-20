#!/usr/bin/env python3
import json
from datetime import datetime, timedelta
from dateutil import parser as date_parser

# Month mapping for determining dates
month_order = {
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 
    'may': 5, 'june': 6, 'july': 7, 'august': 8, 
    'september': 9, 'october': 10, 'november': 11, 'december': 12
}

def get_latest_month(item):
    """Extract the latest month from an item's data fields."""
    latest_month = None
    latest_month_num = 0
    
    for month, month_num in month_order.items():
        if month in item and item[month] and item[month].strip():
            if month_num > latest_month_num:
                latest_month = month
                latest_month_num = month_num
    
    return latest_month, latest_month_num

def get_update_timestamp(item):
    """Determine the lastUpdated timestamp for an item."""
    
    # If item already has lastUpdated, parse it
    if 'lastUpdated' in item and item['lastUpdated']:
        try:
            return date_parser.parse(item['lastUpdated']).isoformat() + 'Z'
        except:
            pass
    
    # Try to determine from month data
    latest_month, month_num = get_latest_month(item)
    
    if latest_month:
        # For items with monthly data, estimate the release date based on releaseDay
        current_year = 2025
        release_day = item.get('releaseDay', 15)
        
        if release_day == 0:
            # If no specific release day, use 15th
            release_day = 15
        
        try:
            release_date = datetime(current_year, month_num, min(release_day, 28))
            # Add a reasonable time (e.g., 2 PM UTC)
            release_datetime = release_date.replace(hour=14, minute=0, second=0)
            return release_datetime.isoformat() + 'Z'
        except:
            pass
    
    # Fallback to current date
    return datetime.utcnow().isoformat() + 'Z'

# Read the file
with open('/Users/benjaminpalmer/TBPS/html/html/json/financials-data.json', 'r') as f:
    data = json.load(f)

# Add lastUpdated to each item and collect timestamps
for item in data['indices']:
    if 'lastUpdated' not in item or not item['lastUpdated']:
        item['lastUpdated'] = get_update_timestamp(item)

# Sort by lastUpdated (newest first)
data['indices'].sort(key=lambda x: x.get('lastUpdated', ''), reverse=True)

# Update the root lastUpdated
data['lastUpdated'] = datetime.utcnow().isoformat() + 'Z'

# Write back
with open('/Users/benjaminpalmer/TBPS/html/html/json/financials-data.json', 'w') as f:
    json.dump(data, f, indent=4)

print("Done! Added lastUpdated to all items and sorted by latest first.")
