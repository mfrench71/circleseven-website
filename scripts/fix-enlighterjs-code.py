#!/usr/bin/env python3
"""
Convert EnlighterJS code blocks to standard HTML code blocks
that work with Highlight.js
"""

import re
from pathlib import Path
import html

def fix_enlighterjs_code(file_path):
    """Convert EnlighterJS pre tags to standard pre/code tags"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    modified = False

    # Pattern to match EnlighterJS pre tags
    # <pre class="EnlighterJSRAW" data-enlighter-language="LANG" ...>CODE</pre>
    pattern = r'<pre class="EnlighterJSRAW"[^>]*data-enlighter-language="([^"]*)"[^>]*>(.*?)</pre>'

    def replace_with_standard(match):
        nonlocal modified
        language = match.group(1)
        code_content = match.group(2)

        # Unescape HTML entities in the code
        # The content is already HTML-encoded in the source

        modified = True
        if language:
            return f'```{language}\n{code_content}\n```'
        else:
            return f'```\n{code_content}\n```'

    # Replace EnlighterJS blocks
    content = re.sub(pattern, replace_with_standard, content, flags=re.DOTALL)

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
        if fix_enlighterjs_code(post_file):
            fixed_count += 1
            print(f'✓ Fixed: {post_file.name}')

    print(f'\nSummary:')
    print(f'Total posts: {total_posts}')
    print(f'Fixed: {fixed_count}')
    print(f'Unchanged: {total_posts - fixed_count}')

if __name__ == '__main__':
    main()
