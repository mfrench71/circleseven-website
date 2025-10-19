#!/usr/bin/env python3
"""
Fix image paths in posts to match actual Cloudinary locations.
Handles both full URLs and partial URLs correctly.
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

def fix_posts(posts_dir, cloudinary_by_basename):
    """Fix image paths in posts."""
    fixed_count = 0
    post_files_modified = set()

    for post_file in Path(posts_dir).glob('*.md'):
        with open(post_file, 'r', encoding='utf-8') as f:
            content = f.read()

        new_content = content

        # Find all Cloudinary URLs with folder/filename pattern
        # Matches: https://res.cloudinary.com/circleseven/image/upload/TRANSFORMS/FOLDER/FILENAME
        pattern = r'https://res\.cloudinary\.com/circleseven/image/upload/([^/]+)/([^/]+)/([^"\s<>)]+?)(\.[a-z]+)?(?=["\s<>)])'

        def replace_url(match):
            transforms = match.group(1)  # e.g., "q_auto,f_auto"
            folder = match.group(2)       # e.g., "05" or "12"
            filename = match.group(3)     # e.g., "aerial-plan_33490774068_o"
            ext = match.group(4) or ''    # e.g., ".jpg" or empty

            # Remove extension from filename for lookup
            filename_no_ext = re.sub(r'\.(jpg|png|gif|webp|jpeg)$', '', filename, flags=re.IGNORECASE)

            # Check if this basename exists in Cloudinary root
            if filename_no_ext in cloudinary_by_basename:
                asset = cloudinary_by_basename[filename_no_ext]
                actual_path = asset['public_id']

                # Only replace if the paths are different
                current_path = f"{folder}/{filename_no_ext}"
                if current_path != actual_path:
                    # Build new URL with actual path
                    new_url = f"https://res.cloudinary.com/circleseven/image/upload/{transforms}/{actual_path}"
                    nonlocal fixed_count, post_files_modified
                    fixed_count += 1
                    post_files_modified.add(post_file.name)
                    print(f"  {current_path} -> {actual_path} in {post_file.name}")
                    return new_url

            # No change
            return match.group(0)

        new_content = re.sub(pattern, replace_url, new_content)

        if new_content != content:
            with open(post_file, 'w', encoding='utf-8') as f:
                f.write(new_content)

    return fixed_count, post_files_modified

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 fix-image-paths-v2.py CLOUD_NAME API_KEY API_SECRET")
        sys.exit(1)

    cloud_name = sys.argv[1]
    api_key = sys.argv[2]
    api_secret = sys.argv[3]

    # Get Cloudinary assets
    assets = get_cloudinary_assets(cloud_name, api_key, api_secret)

    # Create lookup by basename only (for matching across different folder structures)
    cloudinary_by_basename = {}
    for asset in assets:
        public_id = asset['public_id']
        basename = public_id.split('/')[-1]
        # Only store if not already present (avoid conflicts)
        if basename not in cloudinary_by_basename:
            cloudinary_by_basename[basename] = asset

    print(f"Indexed {len(cloudinary_by_basename)} unique basenames\n")
    print("Fixing image paths...\n")

    # Fix posts
    posts_dir = '_posts'
    fixed_count, post_files_modified = fix_posts(posts_dir, cloudinary_by_basename)

    print(f"\n{'='*80}")
    print(f"Fixed {fixed_count} image references in {len(post_files_modified)} posts")
    print(f"{'='*80}")

if __name__ == '__main__':
    main()
