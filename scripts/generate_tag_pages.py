#!/usr/bin/env python3
"""
Generate individual tag pages for Jekyll
Creates a markdown file for each tag found in posts
"""

import os
import re
from pathlib import Path
from collections import defaultdict

def extract_tags_from_posts():
    """Extract all unique tags from posts"""
    posts_dir = Path('_posts')
    all_tags = defaultdict(list)

    for post_file in posts_dir.glob('*.md'):
        with open(post_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract front matter
        match = re.match(r'^---\s*\n(.*?\n)---', content, re.DOTALL)
        if not match:
            continue

        front_matter = match.group(1)

        # Extract tags
        tags_match = re.search(r'^tags:\s*\[(.*?)\]', front_matter, re.MULTILINE)
        if tags_match:
            tags_str = tags_match.group(1)
            # Parse tags (handle quotes)
            tags = [t.strip().strip('"\'') for t in tags_str.split(',')]

            # Get post title for reference
            title_match = re.search(r'^title:\s*["\']?([^"\'\n]+)["\']?', front_matter, re.MULTILINE)
            title = title_match.group(1) if title_match else post_file.stem

            for tag in tags:
                if tag:
                    all_tags[tag].append(title)

    return all_tags

def slugify(text):
    """Convert text to URL-friendly slug"""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[-\s]+', '-', text)
    return text.strip('-')

def create_tag_page(tag, post_count, tag_dir):
    """Create a markdown page for a tag"""
    slug = slugify(tag)
    tag_page_path = tag_dir / f"{slug}.md"

    content = f"""---
layout: tag
title: "Tag: {tag}"
tag: {tag}
permalink: /tag/{slug}/
---
"""

    with open(tag_page_path, 'w', encoding='utf-8') as f:
        f.write(content)

    return slug

def generate_all_tag_pages():
    """Generate tag pages for all tags"""
    # Create tag directory
    tag_dir = Path('tag')
    tag_dir.mkdir(exist_ok=True)

    # Extract tags
    all_tags = extract_tags_from_posts()

    # Generate pages
    created_pages = []
    for tag, posts in sorted(all_tags.items()):
        slug = create_tag_page(tag, len(posts), tag_dir)
        created_pages.append((tag, slug, len(posts)))
        print(f"✓ Created: tag/{slug}.md - {tag} ({len(posts)} posts)")

    print(f"\n{'='*60}")
    print(f"Total tags: {len(created_pages)}")
    print(f"Tag pages created in: tag/")
    print(f"{'='*60}")

    return created_pages

if __name__ == '__main__':
    print("Generating tag pages...\n")
    generate_all_tag_pages()
    print("\nDone!")
