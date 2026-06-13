#!/usr/bin/env python3
"""
Fix South Africa flag in world-cup.json and fetch_world_cup.py
"""

import json
from pathlib import Path

# Fix in world-cup.json
json_file = Path(__file__).parent.parent / "json" / "world-cup.json"
with open(json_file, 'r') as f:
    data = json.load(f)

matches = data.get('matches', [])
fixed_count = 0

for match in matches:
    # Check both teamA and teamB for South Africa
    for team_key in ['teamA', 'teamB']:
        team = match.get(team_key, {})
        if team.get('name') == 'South Africa':
            if team.get('flag') != '🇿🇦':
                team['flag'] = '🇿🇦'
                fixed_count += 1
                print(f"Fixed South Africa flag in match: {match.get('teamA', {}).get('name')} vs {match.get('teamB', {}).get('name')}")

with open(json_file, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Fixed {fixed_count} South Africa flags in {json_file}")

# Fix in fetch_world_cup.py
script_file = Path(__file__).parent / "fetch_world_cup.py"
with open(script_file, 'r') as f:
    content = f.read()

# Replace the corrupted South Africa flag
old_line = "'South Africa': '🇦',"
new_line = "'South Africa': '🇿🇦',"

if old_line in content:
    content = content.replace(old_line, new_line)
    with open(script_file, 'w') as f:
        f.write(content)
    print(f"Fixed South Africa flag in {script_file}")
else:
    print(f"Could not find the line to fix in {script_file}")
