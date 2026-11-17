#!/usr/bin/env python3
import json

with open('json/journal.json', 'r') as f:
    data = json.load(f)

for day in data:
    for entry in day.get('entries', []):
        link = entry.get('link')
        if link:
            link_html = f'\n\n<br><br><a href="{link}" target="_blank" rel="noopener noreferrer">Source</a>'
            if 'content' in entry:
                entry['content'] = entry['content'].rstrip() + link_html
            else:
                entry['content'] = link_html.lstrip('<br>')

with open('json/journal.json', 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print("Done embedding all links at bottom of content")