#!/usr/bin/env python3
import os
import re
from collections import defaultdict

# Read all categories from posts
posts_dir = '_posts'
categories = set()

for filename in os.listdir(posts_dir):
    if not filename.endswith('.md'):
        continue

    filepath = os.path.join(posts_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find categories line
    match = re.search(r'^categories:\s*\[(.*?)\]', content, re.MULTILINE)
    if match:
        cats_str = match.group(1)
        # Parse individual categories from array
        cat_matches = re.findall(r'"([^"]+)"', cats_str)
        for cat in cat_matches:
            categories.add(cat)

# Create category directory
os.makedirs('category', exist_ok=True)

# Generate a page for each category
for category in sorted(categories):
    # Create slug from category name
    slug = category.lower()
    slug = re.sub(r'[^\w\s-]', '', slug)  # Remove special chars
    slug = re.sub(r'[-\s]+', '-', slug)   # Replace spaces/hyphens with single hyphen
    slug = slug.strip('-')

    filename = f'category/{slug}.md'

    content = f'''---
layout: category
title: "Category: {category}"
category: {category}
permalink: /category/{slug}/
---
'''

    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f'Generated: {filename}')

print(f'\nTotal categories: {len(categories)}')
