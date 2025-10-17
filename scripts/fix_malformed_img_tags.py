#!/usr/bin/env python3
"""
Fix malformed img tags in markdown files
Fixes: alt="" / loading="lazy" -> alt="" loading="lazy"
"""

import os
import re
from pathlib import Path

def fix_img_tags(content):
    """Fix malformed img tags with space before /"""
    # Pattern: alt="" / loading="lazy">
    # Should be: alt="" loading="lazy">
    content = re.sub(r'alt="([^"]*)" / loading="lazy"', r'alt="\1" loading="lazy"', content)

    # Also fix any other attributes with this pattern
    content = re.sub(r'" / ([a-z]+=)', r'" \1', content)

    return content

def process_markdown_files(posts_dir):
    """Process all markdown files in the posts directory"""
    posts_path = Path(posts_dir)
    files_processed = 0
    files_changed = 0

    for md_file in posts_path.glob('*.md'):
        files_processed += 1

        with open(md_file, 'r', encoding='utf-8') as f:
            original_content = f.read()

        fixed_content = fix_img_tags(original_content)

        if fixed_content != original_content:
            files_changed += 1
            with open(md_file, 'w', encoding='utf-8') as f:
                f.write(fixed_content)
            print(f"✓ Fixed: {md_file.name}")

    print(f"\n{'='*50}")
    print(f"Files processed: {files_processed}")
    print(f"Files changed: {files_changed}")
    print(f"{'='*50}")

if __name__ == '__main__':
    posts_dir = '_posts'

    if not os.path.exists(posts_dir):
        print(f"Error: {posts_dir} directory not found!")
        exit(1)

    print("Fixing malformed img tags in markdown files...\n")
    process_markdown_files(posts_dir)
    print("\nDone!")
