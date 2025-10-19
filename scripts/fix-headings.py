#!/usr/bin/env python3
"""
Fix heading hierarchy in blog posts.
Converts standalone bold text that acts as headings to proper markdown h2 headings.
"""

import re
import os
from pathlib import Path

def is_likely_heading(line):
    """Check if a bold line is likely a heading"""
    # Remove the bold markers
    text = line.replace('**', '').strip()

    # Skip if empty
    if not text:
        return False

    # Likely a heading if:
    # 1. Starts with capital letter
    # 2. Relatively short (less than 80 chars)
    # 3. Doesn't end with common sentence punctuation
    # 4. Contains mostly title-case words

    if not text[0].isupper():
        return False

    if len(text) > 80:
        return False

    # Don't convert if it ends with common sentence punctuation
    if text.endswith(('.', '!', ',', ';')):
        return False

    # Don't convert if it contains multiple sentences
    if '. ' in text or '! ' in text or '? ' in text:
        return False

    return True

def fix_post_headings(file_path):
    """Fix headings in a single post file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    modified = False
    new_lines = []
    in_frontmatter = False
    frontmatter_count = 0

    for i, line in enumerate(lines):
        # Track frontmatter
        if line.strip() == '---':
            frontmatter_count += 1
            if frontmatter_count <= 2:
                in_frontmatter = not in_frontmatter

        # Skip frontmatter
        if in_frontmatter or frontmatter_count < 2:
            new_lines.append(line)
            continue

        # Check if line is a standalone bold text (likely a heading)
        if re.match(r'^\*\*[^*]+\*\*\s*$', line):
            if is_likely_heading(line):
                # Convert to h2 heading
                heading_text = line.strip().replace('**', '')
                new_line = f'## {heading_text}\n'
                new_lines.append(new_line)
                modified = True
                continue

        new_lines.append(line)

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.writelines(new_lines)
        return True

    return False

def main():
    posts_dir = Path('_posts')

    if not posts_dir.exists():
        print(f"Error: {posts_dir} directory not found")
        return

    modified_count = 0
    total_posts = 0

    for post_file in sorted(posts_dir.glob('*.md')):
        total_posts += 1
        if fix_post_headings(post_file):
            modified_count += 1
            print(f'✓ Fixed: {post_file.name}')

    print(f'\nSummary:')
    print(f'Total posts: {total_posts}')
    print(f'Modified: {modified_count}')
    print(f'Unchanged: {total_posts - modified_count}')

if __name__ == '__main__':
    main()
