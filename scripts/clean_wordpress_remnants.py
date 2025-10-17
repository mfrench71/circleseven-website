#!/usr/bin/env python3
"""
Clean WordPress remnants from markdown posts
- Remove wp-block-heading classes
- Remove wp-image-XXX classes
- Replace &nbsp; with proper spaces
"""

import os
import re
from pathlib import Path

def clean_wordpress_classes(content):
    """Remove WordPress-specific classes from HTML"""

    # Remove wp-block-heading class
    content = re.sub(r'<(h[1-6])\s+class="wp-block-heading"([^>]*)>', r'<\1\2>', content)

    # Remove wp-image-XXX class
    content = re.sub(r'\s*class="wp-image-\d+"', '', content)

    # Remove wp-block-image class
    content = re.sub(r'<figure\s+class="wp-block-image"([^>]*)>', r'<figure\1>', content)

    # Replace &nbsp; with regular space
    content = content.replace('&nbsp;', ' ')

    # Clean up double spaces that might result
    content = re.sub(r'  +', ' ', content)

    return content

def process_post_file(filepath):
    """Process a single post file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        original_content = content
        updated_content = clean_wordpress_classes(content)

        if updated_content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(updated_content)

            # Count changes
            wp_heading = len(re.findall(r'wp-block-heading', original_content))
            wp_image = len(re.findall(r'wp-image-\d+', original_content))
            nbsp = original_content.count('&nbsp;')

            changes = []
            if wp_heading: changes.append(f"{wp_heading} wp-block-heading")
            if wp_image: changes.append(f"{wp_image} wp-image-XXX")
            if nbsp: changes.append(f"{nbsp} &nbsp;")

            print(f"✅ {filepath.name}: Cleaned {', '.join(changes)}")
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

    print(f"\n✨ Done! Cleaned WordPress remnants from {updated_count} files.")

if __name__ == '__main__':
    main()
