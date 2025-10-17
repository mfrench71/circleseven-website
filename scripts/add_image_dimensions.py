#!/usr/bin/env python3
"""
Add width and height attributes to img tags to prevent layout shift (CLS)
This script extracts dimensions from the image filenames where available
(e.g., image-1024x768.jpg -> width="1024" height="768")
"""

import os
import re
from pathlib import Path

def extract_dimensions_from_filename(src):
    """
    Extract dimensions from filename patterns like:
    - image-1024x768.jpg
    - image-scaled-1-1024x642.jpg
    Returns (width, height) or None if not found
    """
    # Pattern: digits x digits before file extension
    # e.g., -1024x768.jpg or -1024x768.png
    pattern = r'-(\d+)x(\d+)\.(jpg|jpeg|png|gif|webp)'
    match = re.search(pattern, src, re.IGNORECASE)

    if match:
        width = match.group(1)
        height = match.group(2)
        return (width, height)

    return None

def add_dimensions_to_img(content):
    """Add width and height attributes to img tags that don't have them"""
    changes_made = 0

    # Find all img tags
    img_pattern = r'<img([^>]*)>'

    def process_img_tag(match):
        nonlocal changes_made
        img_attrs = match.group(1)

        # Skip if already has width and height
        if 'width=' in img_attrs and 'height=' in img_attrs:
            return match.group(0)

        # Extract src attribute
        src_match = re.search(r'src=["\']([^"\']+)["\']', img_attrs)
        if not src_match:
            return match.group(0)

        src = src_match.group(1)

        # Try to extract dimensions from filename
        dimensions = extract_dimensions_from_filename(src)
        if not dimensions:
            return match.group(0)

        width, height = dimensions

        # Add width and height attributes after src
        new_attrs = img_attrs.replace(
            f'src="{src}"',
            f'src="{src}" width="{width}" height="{height}"'
        )

        # Handle single quotes
        if f"src='{src}'" in img_attrs:
            new_attrs = img_attrs.replace(
                f"src='{src}'",
                f"src='{src}' width='{width}' height='{height}'"
            )

        changes_made += 1
        return f'<img{new_attrs}>'

    new_content = re.sub(img_pattern, process_img_tag, content)

    return new_content, changes_made

def process_markdown_files(posts_dir):
    """Process all markdown files in the posts directory"""
    posts_path = Path(posts_dir)
    files_processed = 0
    total_changes = 0
    files_changed = 0

    for md_file in posts_path.glob('*.md'):
        files_processed += 1

        with open(md_file, 'r', encoding='utf-8') as f:
            original_content = f.read()

        new_content, changes = add_dimensions_to_img(original_content)

        if changes > 0:
            files_changed += 1
            total_changes += changes
            with open(md_file, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"✓ {md_file.name}: {changes} images updated")

    print(f"\n{'='*50}")
    print(f"Files processed: {files_processed}")
    print(f"Files changed: {files_changed}")
    print(f"Total images updated: {total_changes}")
    print(f"{'='*50}")

if __name__ == '__main__':
    posts_dir = '_posts'

    if not os.path.exists(posts_dir):
        print(f"Error: {posts_dir} directory not found!")
        exit(1)

    print("Adding width/height attributes to images...\n")
    process_markdown_files(posts_dir)
    print("\nDone!")
