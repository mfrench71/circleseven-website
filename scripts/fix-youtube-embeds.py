#!/usr/bin/env python3
"""
Fix YouTube embeds in blog posts.
Converts plain YouTube URLs to proper embed iframes.
"""

import re
from pathlib import Path

def extract_youtube_id(url):
    """Extract YouTube video ID from various URL formats"""
    patterns = [
        r'(?:https?://)?(?:www\.)?youtube\.com/watch\?v=([a-zA-Z0-9_-]+)',
        r'(?:https?://)?(?:www\.)?youtu\.be/([a-zA-Z0-9_-]+)',
        r'(?:https?://)?(?:www\.)?youtube\.com/embed/([a-zA-Z0-9_-]+)',
    ]

    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def fix_youtube_embeds(file_path):
    """Fix YouTube embeds in a post"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    modified = False

    # Pattern 1: <figure><div>URL</div></figure>
    pattern1 = r'<figure>\s*<div>\s*(https://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]+)(?:[^\s<]*)?)\s*</div>\s*</figure>'

    def replace_with_embed(match):
        nonlocal modified
        url = match.group(1)
        video_id = extract_youtube_id(url)
        if video_id:
            modified = True
            return f'''<figure>
<div class="embed-container">
<iframe src="https://www.youtube.com/embed/{video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
</figure>'''
        return match.group(0)

    content = re.sub(pattern1, replace_with_embed, content, flags=re.MULTILINE)

    # Pattern 2: Plain URLs in paragraphs that should be embeds
    # Only convert if the URL is alone on its line
    pattern2 = r'^(https://(?:www\.)?(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]+)(?:[^\s]*))\s*$'

    def replace_plain_url(match):
        nonlocal modified
        url = match.group(1)
        video_id = extract_youtube_id(url)
        if video_id:
            modified = True
            return f'''<figure>
<div class="embed-container">
<iframe src="https://www.youtube.com/embed/{video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
</figure>'''
        return match.group(0)

    content = re.sub(pattern2, replace_plain_url, content, flags=re.MULTILINE)

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
        if fix_youtube_embeds(post_file):
            fixed_count += 1
            print(f'✓ Fixed: {post_file.name}')

    print(f'\nSummary:')
    print(f'Total posts: {total_posts}')
    print(f'Fixed: {fixed_count}')
    print(f'Unchanged: {total_posts - fixed_count}')

if __name__ == '__main__':
    main()
