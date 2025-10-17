#!/usr/bin/env python3
"""
Upload WordPress images to Cloudinary
Excludes 2023/05 folder
"""

import os
import sys
from pathlib import Path

try:
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api
except ImportError:
    print("Installing cloudinary package...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "cloudinary"])
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api

# Configure Cloudinary
cloudinary.config(
    cloud_name="circleseven",
    api_key="732138267195618",
    api_secret="6T4dCAm5CfL3VG4jjoOkm-jy7UE"
)

def upload_images(uploads_dir):
    """Upload images from WordPress uploads directory"""
    uploads_path = Path(uploads_dir).expanduser()

    if not uploads_path.exists():
        print(f"Error: Directory not found: {uploads_path}")
        return

    print(f"Scanning: {uploads_path}")

    # Count files first
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'}
    all_files = []

    for root, dirs, files in os.walk(uploads_path):
        # Skip 2023/05 folder
        if '2023/05' in root or '2023\\05' in root:
            print(f"Skipping: {root}")
            continue

        for file in files:
            if Path(file).suffix.lower() in image_extensions:
                all_files.append(os.path.join(root, file))

    total = len(all_files)
    print(f"\nFound {total} images to upload (excluding 2023/05)")

    if total == 0:
        print("No images found!")
        return

    response = input(f"\nProceed with uploading {total} images? (y/n): ")
    if response.lower() != 'y':
        print("Upload cancelled")
        return

    # Upload files
    uploaded = 0
    failed = 0
    skipped = 0

    for i, filepath in enumerate(all_files, 1):
        try:
            # Get relative path from uploads directory
            rel_path = os.path.relpath(filepath, uploads_path)

            # Create public_id preserving folder structure
            # e.g., 2022/12/image.jpg -> wp-content/uploads/2022/12/image
            public_id = f"wp-content/uploads/{os.path.splitext(rel_path)[0]}"

            print(f"[{i}/{total}] Uploading: {rel_path}...", end=" ")

            result = cloudinary.uploader.upload(
                filepath,
                public_id=public_id,
                overwrite=False,  # Don't overwrite if already exists
                resource_type="auto",
                folder=""  # Don't add extra folder prefix
            )

            print(f"✓ {result['secure_url']}")
            uploaded += 1

        except cloudinary.exceptions.Error as e:
            if "already exists" in str(e):
                print(f"⊘ Already exists")
                skipped += 1
            else:
                print(f"✗ Error: {e}")
                failed += 1
        except Exception as e:
            print(f"✗ Error: {e}")
            failed += 1

    print(f"\n{'='*60}")
    print(f"Upload complete!")
    print(f"  Uploaded: {uploaded}")
    print(f"  Skipped (already exist): {skipped}")
    print(f"  Failed: {failed}")
    print(f"{'='*60}")

if __name__ == "__main__":
    uploads_dir = os.path.expanduser("~/Downloads/uploads")

    if len(sys.argv) > 1:
        uploads_dir = sys.argv[1]

    upload_images(uploads_dir)
