#!/usr/bin/env python3
import os
import re

posts_dir = '_posts'

for filename in os.listdir(posts_dir):
    if not filename.endswith('.md'):
        continue

    filepath = os.path.join(posts_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the categories line and convert to array format
    # Match: categories: Some Category Name
    # Convert to: categories: [Some Category Name]
    pattern = r'^categories:\s+(.+?)$'

    def replace_category(match):
        category_text = match.group(1).strip()
        # Don't modify if already in array format
        if category_text.startswith('['):
            return match.group(0)
        # Wrap in array brackets
        return f'categories: ["{category_text}"]'

    new_content = re.sub(pattern, replace_category, content, flags=re.MULTILINE)

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f'Fixed: {filename}')

print('Done!')
