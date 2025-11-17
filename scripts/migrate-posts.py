#!/usr/bin/env python3
"""
Migrate inline content from posts.json to markdown files
"""
import json
import os
from datetime import datetime

# Read posts.json
with open('json/posts.json', 'r', encoding='utf-8') as f:
    posts = json.load(f)

# Track new posts
new_posts = []
migrated_count = 0

for post in posts:
    if 'content' in post and 'file' not in post:
        # Extract date
        date_str = post['date']
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        date_prefix = dt.strftime('%Y-%m-%d')
        time_suffix = dt.strftime('%H%M%S')
        
        # Generate filename
        filename = f"article/posts/{date_prefix}-{time_suffix}.md"
        
        # Check if file already exists
        if os.path.exists(filename):
            # Use existing file
            new_posts.append({
                'date': post['date'],
                'file': filename
            })
            print(f"File already exists: {filename}")
        else:
            # Write content to file
            content = post['content']
            with open(filename, 'w', encoding='utf-8') as f:
                f.write(content)
            
            new_posts.append({
                'date': post['date'],
                'file': filename
            })
            migrated_count += 1
            print(f"Created: {filename}")
    else:
        # Keep as-is (already has file reference)
        new_posts.append(post)

# Write updated posts.json
with open('json/posts.json', 'w', encoding='utf-8') as f:
    json.dump(new_posts, f, indent=2, ensure_ascii=False)

print(f"\nMigrated {migrated_count} posts to markdown files")
print(f"Updated posts.json with {len(new_posts)} total entries")
