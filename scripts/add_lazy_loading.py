#!/usr/bin/env python3
"""
Add lazy loading to images in markdown posts
Adds loading="lazy" attribute to all <img> tags in _posts/*.md
"""

import os
import re
from pathlib import Path

def add_lazy_loading_to_images(content):
    """Add loading='lazy' to img tags that don't have it"""

    # Pattern to match img tags without loading attribute
    pattern = r'<img\s+(?![^>]*loading=)([^>]*)>'

    def add_lazy(match):
        img_attrs = match.group(1).strip()
        # Add loading="lazy" before the closing >
        return f'<img {img_attrs} loading="lazy">'

    # Replace all img tags that don't have loading attribute
    updated_content = re.sub(pattern, add_lazy, content)

    return updated_content

def process_post_file(filepath):
    """Process a single post file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if file has images
        if '<img' not in content:
            return False

        # Check if already has lazy loading
        if 'loading="lazy"' in content:
            print(f"⏭️  Skipping {filepath.name} (already has lazy loading)")
            return False

        updated_content = add_lazy_loading_to_images(content)

        if updated_content != content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(updated_content)
            print(f"✅ Updated {filepath.name}")
            return True
        else:
            return False

    except Exception as e:
        print(f"❌ Error processing {filepath.name}: {str(e)}")
        return False

def main():
    posts_dir = Path('_posts')

    if not posts_dir.exists():
        print("❌ _posts directory not found")
        return

    post_files = list(posts_dir.glob('*.md'))
    updated_count = 0

    print(f"Processing {len(post_files)} post files...\n")

    for filepath in sorted(post_files):
        if process_post_file(filepath):
            updated_count += 1

    print(f"\n✨ Done! Updated {updated_count} files with lazy loading.")

if __name__ == '__main__':
    main()
