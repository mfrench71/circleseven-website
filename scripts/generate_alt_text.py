#!/usr/bin/env python3
"""
Generate intelligent alt text for images based on context
This script analyzes post content and filenames to suggest meaningful alt text
"""

import os
import re
from pathlib import Path

def extract_post_context(content, img_tag_position):
    """Extract context around an image to help determine appropriate alt text"""
    # Get text before and after the image
    before_text = content[max(0, img_tag_position-500):img_tag_position]
    after_text = content[img_tag_position:min(len(content), img_tag_position+200)]

    # Extract the paragraph or sentence containing the image
    sentences = re.split(r'[.!?]\s+', before_text)
    if sentences:
        context = sentences[-1] if sentences[-1] else ""
    else:
        context = ""

    return context.strip()

def generate_alt_from_filename(filename):
    """Generate alt text from filename"""
    # Remove extension and size suffix
    name = re.sub(r'-\d+x\d+\.(jpg|jpeg|png|gif|webp)$', '', filename, flags=re.IGNORECASE)
    name = re.sub(r'\.(jpg|jpeg|png|gif|webp)$', '', name, flags=re.IGNORECASE)

    # Remove common prefixes
    name = re.sub(r'^(dsc|img|image)_?', '', name, flags=re.IGNORECASE)

    # Remove numbers and special chars, convert to words
    name = re.sub(r'[-_]', ' ', name)
    name = re.sub(r'\d+', '', name)
    name = ' '.join(name.split())

    # Clean up scale indicators
    name = re.sub(r'\s+scaled\s*', '', name, flags=re.IGNORECASE)
    name = re.sub(r'\s+o\s*$', '', name, flags=re.IGNORECASE)

    if name.strip():
        return name.strip()
    return None

def extract_post_title(content):
    """Extract post title from front matter"""
    title_match = re.search(r'^title:\s*["\']?([^"\'\n]+)["\']?', content, re.MULTILINE)
    if title_match:
        return title_match.group(1).strip()
    return ""

def extract_post_category(content):
    """Extract main category from front matter"""
    cat_match = re.search(r'^categories:\s*\[([^\]]+)\]', content, re.MULTILINE)
    if cat_match:
        cats = cat_match.group(1).split(',')
        return cats[0].strip(' "\'') if cats else ""
    return ""

def generate_contextual_alt_text(content, img_tag, position, filename):
    """Generate smart alt text based on post context"""
    post_title = extract_post_title(content)
    post_category = extract_post_category(content)
    context = extract_post_context(content, position)
    filename_alt = generate_alt_from_filename(filename)

    # Build alt text from available context
    alt_parts = []

    # Use filename if meaningful
    if filename_alt and len(filename_alt) > 3:
        alt_parts.append(filename_alt)

    # Add context from category/title if filename is not descriptive
    if not alt_parts:
        if 'DAT' in post_category or 'INDE' in post_category:
            # Academic/project work
            alt_parts.append(f"Image from {post_category} project")
        elif context:
            # Use surrounding context
            words = context.split()[:10]
            alt_parts.append(' '.join(words))

    alt_text = ', '.join(alt_parts) if alt_parts else "Image"

    # Capitalize first letter
    alt_text = alt_text[0].upper() + alt_text[1:] if alt_text else "Image"

    # Limit length
    if len(alt_text) > 125:
        alt_text = alt_text[:122] + "..."

    return alt_text

def add_alt_text_to_images(content, filepath):
    """Add alt text to images that are missing it"""
    changes_made = 0
    new_content = content

    # Find all img tags
    img_pattern = r'<img([^>]*)>'

    for match in re.finditer(img_pattern, content):
        img_attrs = match.group(1)
        img_tag = match.group(0)

        # Check if alt is empty or missing
        alt_match = re.search(r'alt=["\']([^"\']*)["\']', img_attrs)

        if not alt_match or alt_match.group(1) == '':
            # Extract src
            src_match = re.search(r'src=["\']([^"\']+)["\']', img_attrs)
            if not src_match:
                continue

            src = src_match.group(1)
            filename = os.path.basename(src)

            # Generate alt text
            position = match.start()
            alt_text = generate_contextual_alt_text(content, img_tag, position, filename)

            # Replace or add alt attribute
            if alt_match:
                # Replace empty alt
                new_img_attrs = img_attrs.replace('alt=""', f'alt="{alt_text}"')
                new_img_tag = f'<img{new_img_attrs}>'
            else:
                # Add alt after src
                new_img_attrs = img_attrs.replace(
                    f'src="{src}"',
                    f'src="{src}" alt="{alt_text}"'
                )
                new_img_tag = f'<img{new_img_attrs}>'

            new_content = new_content.replace(img_tag, new_img_tag, 1)
            changes_made += 1

            print(f"  → Added: alt=\"{alt_text}\"")

    return new_content, changes_made

def process_markdown_files(posts_dir):
    """Process all markdown files in the posts directory"""
    posts_path = Path(posts_dir)
    files_processed = 0
    total_changes = 0
    files_changed = 0

    for md_file in posts_path.glob('*.md'):
        with open(md_file, 'r', encoding='utf-8') as f:
            original_content = f.read()

        # Check if file has images with missing alt text
        missing_alt = re.search(r'<img[^>]*alt=["\']["\'][^>]*>', original_content)
        missing_alt_attr = re.search(r'<img(?![^>]*alt=)[^>]*>', original_content)

        if missing_alt or missing_alt_attr:
            files_processed += 1
            print(f"\n📄 {md_file.name}")

            new_content, changes = add_alt_text_to_images(original_content, md_file)

            if changes > 0:
                files_changed += 1
                total_changes += changes

                with open(md_file, 'w', encoding='utf-8') as f:
                    f.write(new_content)

                print(f"  ✓ Updated {changes} images")

    print(f"\n{'='*80}")
    print(f"Files processed: {files_processed}")
    print(f"Files changed: {files_changed}")
    print(f"Total alt texts added: {total_changes}")
    print(f"{'='*80}")

if __name__ == '__main__':
    posts_dir = '_posts'

    if not os.path.exists(posts_dir):
        print(f"Error: {posts_dir} directory not found!")
        exit(1)

    print("Generating contextual alt text for images...\n")
    process_markdown_files(posts_dir)
    print("\nDone!")
