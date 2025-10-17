#!/usr/bin/env python3
"""
Add tags to posts based on content analysis
Analyzes post content and categories to suggest relevant tags
"""

import os
import re
from pathlib import Path

# Define tag keywords and their associated tags
TAG_KEYWORDS = {
    'Blender': ['blender', '3d model', 'modelling', 'mesh'],
    'Unity': ['unity', 'game engine', 'unity3d'],
    'Photogrammetry': ['photogrammetry', 'realitycapture', 'reality capture'],
    'Python': ['python', 'python3', 'pip', 'django'],
    'JavaScript': ['javascript', 'js', 'node.js', 'jquery'],
    'After Effects': ['after effects', 'ae ', 'motion graphics'],
    'Photoshop': ['photoshop', 'ps ', 'adobe photoshop'],
    'Illustrator': ['illustrator', 'vector', 'adobe illustrator'],
    'Arduino': ['arduino', 'microcontroller'],
    'Web Development': ['html', 'css', 'web design', 'responsive'],
    'Photography': ['photograph', 'camera', 'dslr', 'nikon'],
    'Video': ['video', 'vimeo', 'youtube embed'],
    'Sound': ['sound', 'audio', 'soundcloud'],
    'Academic': ['assignment', 'brief:', 'module', 'dissertation'],
    'Tutorial': ['tutorial', 'how to', 'guide', 'step by step'],
}

def extract_front_matter(content):
    """Extract YAML front matter from post"""
    match = re.match(r'^---\s*\n(.*?\n)---\s*\n', content, re.DOTALL)
    if match:
        front_matter = match.group(1)
        body = content[match.end():]
        return front_matter, body
    return None, content

def parse_front_matter(front_matter):
    """Parse front matter into dict"""
    data = {}
    for line in front_matter.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            data[key.strip()] = value.strip()
    return data

def suggest_tags(title, categories, content):
    """Suggest tags based on content"""
    tags = set()

    # Combine title, categories, and content for analysis
    text_to_analyze = f"{title} {categories} {content}".lower()

    # Check for tag keywords
    for tag, keywords in TAG_KEYWORDS.items():
        for keyword in keywords:
            if keyword.lower() in text_to_analyze:
                tags.add(tag)
                break

    # Add course codes as tags
    course_codes = re.findall(r'DAT\d{3}|INDE\d{3}', title + categories, re.IGNORECASE)
    for code in course_codes:
        tags.add(code.upper())

    return sorted(list(tags))

def add_tags_to_post(filepath):
    """Add tags to a post if it doesn't have them"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    front_matter, body = extract_front_matter(content)
    if not front_matter:
        return False, "No front matter found"

    # Check if already has tags
    if 'tags:' in front_matter:
        return False, "Already has tags"

    # Parse front matter
    fm_data = parse_front_matter(front_matter)
    title = fm_data.get('title', '').strip('"\'')
    categories = fm_data.get('categories', '')

    # Suggest tags
    tags = suggest_tags(title, categories, body[:2000])  # Analyze first 2000 chars

    if not tags:
        return False, "No tags suggested"

    # Format tags for YAML
    tags_yaml = 'tags: [' + ', '.join(f'"{tag}"' for tag in tags) + ']'

    # Insert tags after categories line
    lines = front_matter.split('\n')
    new_lines = []
    tags_inserted = False

    for line in lines:
        new_lines.append(line)
        if line.startswith('categories:') and not tags_inserted:
            new_lines.append(tags_yaml)
            tags_inserted = True

    # Reconstruct content
    new_front_matter = '\n'.join(new_lines)
    new_content = f"---\n{new_front_matter}\n---\n{body}"

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return True, f"Added {len(tags)} tags: {', '.join(tags)}"

def process_all_posts():
    """Process all posts in _posts directory"""
    posts_dir = Path('_posts')
    total = 0
    updated = 0

    for post_file in sorted(posts_dir.glob('*.md')):
        total += 1
        success, message = add_tags_to_post(post_file)

        if success:
            updated += 1
            print(f"✓ {post_file.name}: {message}")
        else:
            print(f"  {post_file.name}: {message}")

    print(f"\n{'='*60}")
    print(f"Total posts: {total}")
    print(f"Updated: {updated}")
    print(f"{'='*60}")

if __name__ == '__main__':
    print("Adding tags to posts based on content analysis...\n")
    process_all_posts()
    print("\nDone!")
