#!/usr/bin/env python3
"""
Match missing images from posts with actual Cloudinary assets.
Finds images that are referenced with folder prefixes but exist in root.
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
            image_refs[clean_match].append(post_file.name)

    return image_refs

def main():
    if len(sys.argv) != 4:
        print("Usage: python3 match-missing-images.py CLOUD_NAME API_KEY API_SECRET")
        sys.exit(1)

    cloud_name = sys.argv[1]
    api_key = sys.argv[2]
    api_secret = sys.argv[3]

    # Get Cloudinary assets
    assets = get_cloudinary_assets(cloud_name, api_key, api_secret)

    # Create lookup by public_id (base name without folder)
    cloudinary_lookup = {}
    for asset in assets:
        public_id = asset['public_id']
        # Store both full path and basename
        basename = public_id.split('/')[-1]
        cloudinary_lookup[basename] = asset
        cloudinary_lookup[public_id] = asset

    # Get image references from posts
    posts_dir = '_posts'
    image_refs = extract_images_from_posts(posts_dir)

    print(f"Found {len(image_refs)} unique image references in posts\n")

    # Find matches for images referenced with folder prefix
    matches = []

    for ref_path, post_files in image_refs.items():
        # Skip if already exists (exact match)
        if ref_path in cloudinary_lookup:
            continue

        # Extract just the filename (after the last /)
        filename = ref_path.split('/')[-1]

        # Check if this filename exists in Cloudinary root
        if filename in cloudinary_lookup:
            asset = cloudinary_lookup[filename]
            matches.append({
                'referenced': ref_path,
                'actual': asset['public_id'],
                'url': asset['secure_url'],
                'posts': post_files
            })

    # Output results
    if matches:
        print(f"Found {len(matches)} images that can be fixed:\n")
        print("=" * 80)

        for match in matches:
            print(f"\nReferenced as: {match['referenced']}")
            print(f"Actually at:   {match['actual']}")
            print(f"URL:           {match['url']}")
            print(f"In posts:      {', '.join(match['posts'][:3])}")
            if len(match['posts']) > 3:
                print(f"               ... and {len(match['posts']) - 3} more")
    else:
        print("No matches found. Images may be truly missing.")

if __name__ == '__main__':
    main()
