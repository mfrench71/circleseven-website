#!/usr/bin/env python3
"""
Fix image paths in posts to match actual Cloudinary locations.
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

def extract_images_from_posts(posts_dir):
    """Extract all image references from posts."""
    image_refs = {}

    for post_file in Path(posts_dir).glob('*.md'):
        with open(post_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Match Cloudinary URLs
        pattern = r'https://res\.cloudinary\.com/circleseven/image/upload/[^/]+/([^"\s<>)]+)'
        matches = re.findall(pattern, content)

        for match in matches:
            # Remove file extension if present
            clean_match = re.sub(r'\.(jpg|png|gif|webp|jpeg)$', '', match, flags=re.IGNORECASE)

            if clean_match not in image_refs:
                image_refs[clean_match] = []
            image_refs[clean_match].append(post_file)

    return image_refs

def fix_posts(posts_dir, cloudinary_lookup, image_refs):
    """Fix image paths in posts."""
    fixed_count = 0
    post_files_modified = set()

    for ref_path, post_files in image_refs.items():
        # Skip if already exists (exact match)
        if ref_path in cloudinary_lookup:
            continue

        # Extract just the filename (after the last /)
        filename = ref_path.split('/')[-1]

        # Check if this filename exists in Cloudinary
        if filename not in cloudinary_lookup:
            continue

        asset = cloudinary_lookup[filename]
        actual_path = asset['public_id']

        # Fix in all posts that reference this
        for post_file in post_files:
            with open(post_file, 'r', encoding='utf-8') as f:
                content = f.read()

            # Replace the old path with the new path
            # Match both with and without file extensions
            old_url_pattern = re.escape(ref_path)
            new_path = actual_path

            # Replace in URLs
            pattern = r'(https://res\.cloudinary\.com/circleseven/image/upload/[^/]+/)' + old_url_pattern + r'(\.[a-z]+)?'
            new_content = re.sub(pattern, r'\1' + new_path, content)

            if new_content != content:
                with open(post_file, 'w', encoding='utf-8') as f:
                    f.write(new_content)

                fixed_count += 1
                post_files_modified.add(post_file.name)
                print(f"Fixed: {ref_path} -> {actual_path} in {post_file.name}")

    return fixed_count, post_files_modified

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 fix-image-paths.py CLOUD_NAME API_KEY API_SECRET")
        sys.exit(1)

    cloud_name = sys.argv[1]
    api_key = sys.argv[2]
    api_secret = sys.argv[3]

    # Get Cloudinary assets
    assets = get_cloudinary_assets(cloud_name, api_key, api_secret)

    # Create lookup by public_id (both full path and basename)
    cloudinary_lookup = {}
    for asset in assets:
        public_id = asset['public_id']
        basename = public_id.split('/')[-1]
        cloudinary_lookup[basename] = asset
        cloudinary_lookup[public_id] = asset

    # Get image references from posts
    posts_dir = '_posts'
    image_refs = extract_images_from_posts(posts_dir)

    print(f"Found {len(image_refs)} unique image references in posts\n")
    print("Fixing image paths...\n")

    # Fix posts
    fixed_count, post_files_modified = fix_posts(posts_dir, cloudinary_lookup, image_refs)

    print(f"\n{'='*80}")
    print(f"Fixed {fixed_count} image references in {len(post_files_modified)} posts")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()
