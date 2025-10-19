#!/usr/bin/env python3
"""
Fix href paths to match src paths in img tags.
Many hrefs have wrong paths or -scaled suffixes that don't exist.
"""

import re
import sys
from pathlib import Path

def fix_hrefs_in_file(file_path):
    """Fix hrefs to match their corresponding src attributes."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    changes = []

    # Find all <a><img> pairs within figures
    # Pattern: <a href="CLOUDINARY_URL"><img src="CLOUDINARY_URL"
    pattern = r'<a href="(https://res\.cloudinary\.com/circleseven/image/upload/[^"]+)"><img src="(https://res\.cloudinary\.com/circleseven/image/upload/[^"]+)"'

    def fix_href(match):
        href_url = match.group(1)
        src_url = match.group(2)

        # Extract paths from URLs
        # Pattern: .../upload/TRANSFORMS/PATH
        href_match = re.search(r'/upload/([^/]+)/(.+)$', href_url)
        src_match = re.search(r'/upload/([^/]+)/(.+)$', src_url)

        if href_match and src_match:
            href_transforms = href_match.group(1)
            href_path = href_match.group(2)
            src_transforms = src_match.group(1)
            src_path = src_match.group(2)

            # If paths differ, use src path for href (but keep href transforms)
            # Strip file extensions for comparison
            href_path_base = re.sub(r'\.(jpg|png|gif|webp|jpeg)$', '', href_path, flags=re.IGNORECASE)
            src_path_base = re.sub(r'\.(jpg|png|gif|webp|jpeg)$', '', src_path, flags=re.IGNORECASE)

            if href_path_base != src_path_base:
                # Build new href using src path but original href transforms
                new_href_url = f"https://res.cloudinary.com/circleseven/image/upload/{href_transforms}/{src_path_base}"
                changes.append(f"  {href_path_base} -> {src_path_base}")
                return f'<a href="{new_href_url}"><img src="{src_url}"'

        return match.group(0)

    new_content = re.sub(pattern, fix_href, content)

    return new_content, changes

def main():
    posts_dir = Path('_posts')
    total_changes = 0
    files_modified = []

    for post_file in posts_dir.glob('*.md'):
        new_content, changes = fix_hrefs_in_file(post_file)

        if changes:
            with open(post_file, 'w', encoding='utf-8') as f:
                f.write(new_content)

            total_changes += len(changes)
            files_modified.append(post_file.name)
            print(f"\n{post_file.name}:")
            for change in changes:
                print(change)

    print(f"\n{'='*80}")
    print(f"Fixed {total_changes} href references in {len(files_modified)} posts")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()
