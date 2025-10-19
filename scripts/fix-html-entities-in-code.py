#!/usr/bin/env python3
"""
Decode HTML entities within markdown code blocks
"""

import re
from pathlib import Path
import html

def fix_html_entities_in_code(file_path):
    """Decode HTML entities in markdown code blocks"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    modified = False

    # Pattern to match markdown code blocks
    # ```language\nCODE\n```
    pattern = r'```(\w*)\n(.*?)```'

    def decode_entities(match):
        nonlocal modified
        language = match.group(1)
        code_content = match.group(2)

        # Check if there are HTML entities
        if '&lt;' in code_content or '&gt;' in code_content or '&amp;' in code_content or '&quot;' in code_content:
            # Decode HTML entities
            decoded_content = html.unescape(code_content)
            modified = True
            if language:
                return f'```{language}\n{decoded_content}```'
            else:
                return f'```\n{decoded_content}```'

        # No changes needed
        return match.group(0)

    # Replace code blocks with decoded versions
    content = re.sub(pattern, decode_entities, content, flags=re.DOTALL)

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        return True

    return False

def main():
    posts_dir = Path('_posts')

    if not posts_dir.exists():
        print(f"Error: {posts_dir} directory not found")
        return

    fixed_count = 0
    total_posts = 0

    for post_file in sorted(posts_dir.glob('*.md')):
        total_posts += 1
        if fix_html_entities_in_code(post_file):
            fixed_count += 1
            print(f'✓ Fixed: {post_file.name}')

    print(f'\nSummary:')
    print(f'Total posts: {total_posts}')
    print(f'Fixed: {fixed_count}')
    print(f'Unchanged: {total_posts - fixed_count}')

if __name__ == '__main__':
    main()
