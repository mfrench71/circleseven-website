#!/usr/bin/env python3
"""
Upload WordPress images to Cloudinary with proper folder structure

Reads WordPress XML export, finds images locally, and uploads to Cloudinary
with MM/filename structure matching the migration scripts.
"""

import os
import re
import xml.etree.ElementTree as ET
from pathlib import Path
import cloudinary
import cloudinary.uploader
from cloudinary.utils import cloudinary_url

class CloudinaryUploader:
    def __init__(self, cloud_name, api_key, api_secret, xml_path, upload_dir):
        # Configure Cloudinary
        cloudinary.config(
            cloud_name=cloud_name,
            api_key=api_key,
            api_secret=api_secret,
            secure=True
        )

        self.xml_path = xml_path
        self.upload_dir = Path(upload_dir)
        self.stats = {
            'total_images': 0,
            'found_locally': 0,
            'uploaded': 0,
            'skipped': 0,
            'errors': []
        }
        self.image_urls = []

    def parse_xml(self):
        """Extract all image URLs from WordPress XML"""
        print("Parsing WordPress XML export...")

        tree = ET.parse(self.xml_path)
        root = tree.getroot()

        namespaces = {
            'wp': 'http://wordpress.org/export/1.2/',
            'content': 'http://purl.org/rss/1.0/modules/content/'
        }

        # Find all attachment items (images)
        for item in root.findall('.//item'):
            post_type = item.find('wp:post_type', namespaces)
            if post_type is not None and post_type.text == 'attachment':
                attachment_url = item.find('wp:attachment_url', namespaces)
                if attachment_url is not None:
                    url = attachment_url.text
                    # Only process images from wp-content/uploads
                    if '/wp-content/uploads/' in url:
                        self.image_urls.append(url)

        self.stats['total_images'] = len(self.image_urls)
        print(f"Found {self.stats['total_images']} images in WordPress export")

    def extract_path_info(self, url):
        """Extract year, month, and filename from WordPress URL"""
        # Match: /wp-content/uploads/YYYY/MM/filename.ext
        match = re.search(r'/wp-content/uploads/(\d{4})/(\d{2})/([^/]+)$', url)
        if match:
            year = match.group(1)
            month = match.group(2)
            filename = match.group(3)
            return year, month, filename
        return None, None, None

    def find_local_file(self, filename, year, month):
        """Find image file in local uploads directory"""
        # Search patterns in order of preference
        search_paths = [
            self.upload_dir / year / month / filename,  # Full path
            self.upload_dir / month / filename,          # Month only
            self.upload_dir / filename,                  # Root level
        ]

        # Also search recursively as fallback
        for file_path in search_paths:
            if file_path.exists():
                return file_path

        # Recursive search in upload_dir
        for file_path in self.upload_dir.rglob(filename):
            return file_path

        return None

    def upload_image(self, local_path, public_id, filename):
        """Upload single image to Cloudinary"""
        try:
            print(f"  Uploading: {public_id}")

            result = cloudinary.uploader.upload(
                str(local_path),
                public_id=public_id,
                overwrite=True,  # Replace if already exists
                resource_type="image",
                quality="auto",
                fetch_format="auto"
            )

            self.stats['uploaded'] += 1
            print(f"  ✓ Success: {result['secure_url']}")
            return True

        except Exception as e:
            error_msg = f"Failed to upload {filename}: {str(e)}"
            self.stats['errors'].append(error_msg)
            print(f"  ✗ Error: {error_msg}")
            return False

    def process_images(self):
        """Process all images from XML export"""
        print(f"\nProcessing images from {self.upload_dir}...\n")

        for url in self.image_urls:
            year, month, filename = self.extract_path_info(url)

            if not all([year, month, filename]):
                print(f"⚠ Skipping (no date path): {url}")
                self.stats['skipped'] += 1
                continue

            # Find local file
            local_path = self.find_local_file(filename, year, month)

            if not local_path:
                print(f"⚠ Not found locally: {filename}")
                self.stats['skipped'] += 1
                continue

            self.stats['found_locally'] += 1

            # Generate Cloudinary public_id: MM/filename (without extension)
            filename_no_ext = os.path.splitext(filename)[0]
            public_id = f"{month}/{filename_no_ext}"

            print(f"\n[{self.stats['found_locally']}/{self.stats['total_images']}] {filename}")
            print(f"  Local: {local_path}")
            print(f"  Public ID: {public_id}")

            # Upload to Cloudinary
            self.upload_image(local_path, public_id, filename)

    def print_summary(self):
        """Print upload summary"""
        print("\n" + "="*60)
        print("UPLOAD SUMMARY")
        print("="*60)
        print(f"Total images in WordPress: {self.stats['total_images']}")
        print(f"Found locally: {self.stats['found_locally']}")
        print(f"Uploaded to Cloudinary: {self.stats['uploaded']}")
        print(f"Skipped: {self.stats['skipped']}")

        if self.stats['errors']:
            print(f"\nErrors: {len(self.stats['errors'])}")
            for error in self.stats['errors'][:10]:  # Show first 10 errors
                print(f"  - {error}")
            if len(self.stats['errors']) > 10:
                print(f"  ... and {len(self.stats['errors']) - 10} more errors")

        print("\n" + "="*60)

    def run(self):
        """Main execution"""
        self.parse_xml()
        self.process_images()
        self.print_summary()


def main():
    import argparse

    parser = argparse.ArgumentParser(description='Upload WordPress images to Cloudinary')
    parser.add_argument('--cloud-name', default='circleseven', help='Cloudinary cloud name')
    parser.add_argument('--api-key', required=True, help='Cloudinary API key')
    parser.add_argument('--api-secret', required=True, help='Cloudinary API secret')
    parser.add_argument('--xml', default='matthewfrench.WordPress.2025-10-17.xml',
                        help='WordPress XML export file')
    parser.add_argument('--upload-dir', default='/Users/matthewfrench/Downloads/uploads',
                        help='Directory containing WordPress uploads')

    args = parser.parse_args()

    uploader = CloudinaryUploader(
        cloud_name=args.cloud_name,
        api_key=args.api_key,
        api_secret=args.api_secret,
        xml_path=args.xml,
        upload_dir=args.upload_dir
    )

    uploader.run()


if __name__ == '__main__':
    main()
