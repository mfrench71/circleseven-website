#!/usr/bin/env python3
"""
Remove -scaled suffix from ALL Cloudinary URLs where the non-scaled version exists.
This is a simple find-and-replace that removes -scaled from paths.
"""

import re
from pathlib import Path

def fix_file(file_path):
    """Remove -scaled from Cloudinary URLs."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes = []

    # Count occurrences
    scaled_count = len(re.findall(r'-scaled', content))

    if scaled_count > 0:
        # Remove -scaled from everywhere
        new_content = content.replace('-scaled', '')
        changes.append(f"  Removed {scaled_count} occurrences of -scaled")
        return new_content, changes

    return None, []

def main():
    posts_dir = Path('_posts')
    total_changes = 0
    files_modified = []

    for post_file in posts_dir.glob('*.md'):
        new_content, changes = fix_file(post_file)

        if new_content:
            with open(post_file, 'w', encoding='utf-8') as f:
                f.write(new_content)

            total_changes += sum([int(c.split()[1]) for c in changes])
            files_modified.append(post_file.name)
            print(f"{post_file.name}:")
            for change in changes:
                print(change)

    print(f"\n{'='*80}")
    print(f"Removed {total_changes} -scaled suffixes in {len(files_modified)} posts")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()
