#!/usr/bin/env python3
import json
import re

with open('json/journal.json', 'r') as f:
    data = json.load(f)

# Pattern to extract source link from content
source_pattern = re.compile(r'<br><br><a href="([^"]+)" target="_blank" rel="noopener noreferrer">Source</a>')

for day in data:
    for entry in day.get('entries', []):
        content = entry.get('content', '')
        match = source_pattern.search(content)
        if match:
            entry['link'] = match.group(1)
            # Remove the source link from content
            entry['content'] = source_pattern.sub('', content).rstrip()

with open('json/journal.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Done restoring link fields with emojis preserved")