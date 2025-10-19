#!/usr/bin/env python3
"""
Fix ALL remaining image path issues:
1. featured_image in frontmatter with -scaled suffixes or wrong folders
2. Any remaining src/href attributes that weren't caught
"""

import cloudinary
import cloudinary.api
import re
import sys
from pathlib import Path

def get_cloudinary_assets(cloud_name, api_key, api_secret):
    """Fetch all assets from Cloudinary."""
    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret
    )

    print("Fetching Cloudinary assets...")
    assets = []
    next_cursor = None

    while True:
        result = cloudinary.api.resources(
            type='upload',
            max_results=500,
            next_cursor=next_cursor
        )

        assets.extend(result['resources'])
        next_cursor = result.get('next_cursor')

        if not next_cursor:
            break

    print(f"Found {len(assets)} assets in Cloudinary\n")
    return assets

def fix_file(file_path, cloudinary_by_basename):
    """Fix all image references in a file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    changes = []

    # Fix featured_image in frontmatter
    # Pattern: featured_image: FOLDER/FILENAME or featured_image: FOLDER/FILENAME-scaled
    def fix_featured_image(match):
        full_path = match.group(1)
        # Remove -scaled suffix and get basename
        clean_path = re.sub(r'-scaled$', '', full_path)
        filename = clean_path.split('/')[-1]

        if filename in cloudinary_by_basename:
            asset = cloudinary_by_basename[filename]
            actual_path = asset['public_id']

            if actual_path != full_path:
                changes.append(f"  featured_image: {full_path} -> {actual_path}")
                return f"featured_image: {actual_path}"

        return match.group(0)

    content = re.sub(r'^featured_image:\s*(.+)$', fix_featured_image, content, flags=re.MULTILINE)

    # Fix any Cloudinary URLs in the content
    # Pattern: https://res.cloudinary.com/circleseven/image/upload/TRANSFORMS/PATH
    def fix_cloudinary_url(match):
        full_url = match.group(0)
        transforms = match.group(1)
        path = match.group(2)

        # Remove file extension and -scaled suffix
        clean_path = re.sub(r'\.(jpg|png|gif|webp|jpeg)$', '', path, flags=re.IGNORECASE)
        clean_path = re.sub(r'-scaled$', '', clean_path)

        # Get just the filename (after last /)
        filename = clean_path.split('/')[-1]

        if filename in cloudinary_by_basename:
            asset = cloudinary_by_basename[filename]
            actual_path = asset['public_id']

            # Only replace if paths differ
            if clean_path != actual_path:
                new_url = f"https://res.cloudinary.com/circleseven/image/upload/{transforms}/{actual_path}"
                changes.append(f"  {clean_path} -> {actual_path}")
                return new_url

        return full_url

    pattern = r'https://res\.cloudinary\.com/circleseven/image/upload/([^/]+)/([^"\s<>)]+?)(?=["<\s)])'
    content = re.sub(pattern, fix_cloudinary_url, content)

    if content != original_content:
        return content, changes

    return None, []

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 fix-all-remaining-paths.py CLOUD_NAME API_KEY API_SECRET")
        sys.exit(1)

    cloud_name = sys.argv[1]
    api_key = sys.argv[2]
    api_secret = sys.argv[3]

    # Get Cloudinary assets
    assets = get_cloudinary_assets(cloud_name, api_key, api_secret)

    # Create lookup by basename
    cloudinary_by_basename = {}
    for asset in assets:
        public_id = asset['public_id']
        basename = public_id.split('/')[-1]
        if basename not in cloudinary_by_basename:
            cloudinary_by_basename[basename] = asset

    print(f"Indexed {len(cloudinary_by_basename)} unique basenames\n")
    print("Fixing all remaining image paths...\n")

    # Fix all posts
    posts_dir = Path('_posts')
    total_changes = 0
    files_modified = []

    for post_file in posts_dir.glob('*.md'):
        new_content, changes = fix_file(post_file, cloudinary_by_basename)

        if new_content:
            with open(post_file, 'w', encoding='utf-8') as f:
                f.write(new_content)

            total_changes += len(changes)
            files_modified.append(post_file.name)
            print(f"\n{post_file.name}:")
            for change in changes:
                print(change)

    print(f"\n{'='*80}")
    print(f"Fixed {total_changes} references in {len(files_modified)} posts")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()
