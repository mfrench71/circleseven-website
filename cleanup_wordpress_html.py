#!/usr/bin/env python3
"""
Clean up WordPress HTML and Gutenberg blocks from Jekyll markdown files.
Preserves all image tags and links.
"""

import re
import os
import glob

def clean_wordpress_html(content):
    """Remove WordPress HTML comments and convert basic formatting."""

    # Remove WordPress/Gutenberg comment blocks but NOT the content inside
    # Remove opening comments like <!-- wp:paragraph -->
    content = re.sub(r'<!-- wp:[^>]+-->\n?', '', content)

    # Remove closing comments like <!-- /wp:paragraph -->
    content = re.sub(r'<!-- /wp:[^>]+-->\n?', '', content)

    # Convert simple paragraph tags to blank lines (but preserve img/a tags)
    # Only remove <p> tags that don't contain img or figure tags
    lines = content.split('\n')
    cleaned_lines = []

    for line in lines:
        # Skip empty lines
        if not line.strip():
            cleaned_lines.append(line)
            continue

        # Preserve lines with images, figures, or complex HTML
        if any(tag in line for tag in ['<img', '<figure', '<a href', '<iframe', '<embed', '<video']):
            cleaned_lines.append(line)
            continue

        # Remove simple <p> tags (no attributes or just class)
        if line.strip().startswith('<p>') and line.strip().endswith('</p>'):
            # Extract content between <p> and </p>
            text = re.sub(r'^<p[^>]*>', '', line.strip())
            text = re.sub(r'</p>$', '', text)
            # Don't create empty lines
            if text.strip():
                cleaned_lines.append(text)
        elif line.strip().startswith('<p ') and line.strip().endswith('</p>'):
            # Handle <p class="...">content</p>
            text = re.sub(r'^<p[^>]*>', '', line.strip())
            text = re.sub(r'</p>$', '', text)
            if text.strip():
                cleaned_lines.append(text)
        else:
            cleaned_lines.append(line)

    content = '\n'.join(cleaned_lines)

    # Convert <strong> to **
    content = re.sub(r'<strong>(.*?)</strong>', r'**\1**', content)

    # Convert <em> to *
    content = re.sub(r'<em>(.*?)</em>', r'*\1*', content)

    # Convert simple lists
    # Convert <ul> and </ul> tags
    content = re.sub(r'<ul[^>]*>\n?', '', content)
    content = re.sub(r'</ul>\n?', '\n', content)

    # Convert <li> tags to markdown list items
    content = re.sub(r'<li[^>]*>(.*?)</li>', r'- \1', content)

    # Remove extra blank lines (more than 2 consecutive)
    content = re.sub(r'\n{3,}', '\n\n', content)

    return content

def process_file(filepath):
    """Process a single markdown file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split front matter and content
    parts = content.split('---\n', 2)
    if len(parts) < 3:
        print(f"Skipping {filepath} - no front matter found")
        return False

    front_matter = parts[1]
    post_content = parts[2]

    # Clean the content
    cleaned_content = clean_wordpress_html(post_content)

    # Reconstruct the file
    new_content = f"---\n{front_matter}---\n{cleaned_content}"

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return True

def main():
    """Process all markdown files in _posts and _pages."""
    posts = glob.glob('_posts/*.md')
    pages = glob.glob('_pages/*.md')

    all_files = posts + pages
    processed = 0

    for filepath in all_files:
        if process_file(filepath):
            processed += 1
            print(f"Cleaned: {filepath}")

    print(f"\nProcessed {processed} files")

if __name__ == '__main__':
    main()
