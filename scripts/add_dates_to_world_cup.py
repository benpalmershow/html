#!/usr/bin/env python3
"""
Add date fields to existing world-cup.json data for proper sorting
"""

import json
from pathlib import Path
from datetime import datetime, timedelta

INPUT_FILE = Path(__file__).parent.parent / "json" / "world-cup.json"

def add_dates_to_matches():
    """Add date fields to matches based on stage and match ID"""
    with open(INPUT_FILE, 'r') as f:
        data = json.load(f)
    
    matches = data.get('matches', [])
    
    # Stage order and date offsets
    stage_days = {
        'GROUP_STAGE': 0,
        'LAST_32': 15,
        'LAST_16': 20,
        'QUARTER_FINAL': 25,
        'SEMI_FINAL': 30,
        'FINAL': 35,
        'THIRD_PLACE': 34,
        'SEMI_FINALS': 30,
    }
    
    base_date = datetime(2026, 6, 12)  # World Cup start date
    
    for match in matches:
        match_id = match.get('id', '')
        stage = match.get('stage', 'GROUP_STAGE')
        
        # Extract numeric ID for day offset
        try:
            id_num = int(match_id.split('-').pop())
        except (ValueError, IndexError):
            id_num = 0
        
        # Calculate date based on stage and ID
        stage_offset = stage_days.get(stage, 0)
        day_offset = stage_offset + (id_num % 10)  # Spread matches across days
        match_date = base_date + timedelta(days=day_offset)
        
        # Add date fields
        match['date'] = match_date.strftime('%Y-%m-%d')
        match['utcDate'] = match_date.strftime('%Y-%m-%dT15:00:00Z')
    
    # Update lastUpdated
    data['lastUpdated'] = datetime.utcnow().isoformat() + 'Z'
    
    # Write back
    with open(INPUT_FILE, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"Added date fields to {len(matches)} matches")
    print(f"Updated lastUpdated: {data['lastUpdated']}")

if __name__ == "__main__":
    add_dates_to_matches()
