#!/usr/bin/env python3
"""
Safely fix ONLY the verified -scaled images that exist without the suffix.
"""

import re
from pathlib import Path

# ONLY the images we verified are safe to fix
SAFE_TO_FIX = [
    "06/boathouse-radford-lake-present-day_32234305677_o-scaled",
    "06/boathouse-radford-lake-present-day_32234306377_o-scaled",
    "06/boathouse-radford-lake-present-day_32234306457_o-scaled",
    "06/boathouse-radford-lake-present-day_32234306737_o-scaled",
    "06/boathouse-radford-lake-present-day_32234306827_o-scaled",
    "06/boathouse-radford-lake-present-day_32234307117_o-scaled",
    "06/boathouse-radford-lake-present-day_32234307697_o-scaled",
    "06/boathouse-radford-lake-present-day_46261899775_o-scaled",
    "06/boathouse-radford-lake-present-day_46261901745_o-scaled",
    "06/boathouse-radford-lake-present-day_46261901925_o-scaled",
]

def fix_file(file_path):
    """Fix only the safe -scaled references."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes = []

    for scaled_path in SAFE_TO_FIX:
        # Remove -scaled
        clean_path = scaled_path.replace('-scaled', '')

        # Replace in content (escape for regex)
        escaped_scaled = re.escape(scaled_path)

        # Count occurrences first
        count = len(re.findall(escaped_scaled, content))

        if count > 0:
            content = re.sub(escaped_scaled, clean_path, content)
            changes.append(f"  {scaled_path} -> {clean_path} ({count} times)")

    if content != original_content:
        return content, changes

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

            total_changes += len(changes)
            files_modified.append(post_file.name)
            print(f"\n{post_file.name}:")
            for change in changes:
                print(change)

    print(f"\n{'='*80}")
    print(f"Fixed {total_changes} safe -scaled references in {len(files_modified)} posts")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()
