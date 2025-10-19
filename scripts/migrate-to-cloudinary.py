#!/usr/bin/env python3
"""
Migrate WordPress image URLs to Cloudinary with backup and rollback support

Features:
- Backs up all modified files to .backup directory
- Dry-run mode to preview changes
- Rollback capability to restore from backups
- Detailed logging of all changes
"""

import re
import os
import shutil
from pathlib import Path
from datetime import datetime
import json

class CloudinaryMigrator:
    def __init__(self, cloud_name, dry_run=False):
        self.cloud_name = cloud_name
        self.dry_run = dry_run
        self.posts_dir = Path('_posts')
        self.backup_dir = Path('.cloudinary-backup')
        self.changes_log = []
        self.stats = {
            'files_processed': 0,
            'files_modified': 0,
            'images_replaced': 0,
            'errors': []
        }

    def backup_file(self, file_path):
        """Create backup of file before modification"""
        if self.dry_run:
            return True

        backup_path = self.backup_dir / file_path.name
        self.backup_dir.mkdir(exist_ok=True)

        try:
            shutil.copy2(file_path, backup_path)
            return True
        except Exception as e:
            self.stats['errors'].append(f"Backup failed for {file_path}: {e}")
            return False

    def strip_wordpress_sizes(self, filename):
        """Remove WordPress size suffixes like -1024x768, -300x200, etc."""
        # Remove extension first
        name_no_ext = os.path.splitext(filename)[0]

        # Strip WordPress size patterns: -WIDTHxHEIGHT at end of filename
        # Examples: -1024x768, -300x200, -150x150
        name_no_ext = re.sub(r'-\d+x\d+$', '', name_no_ext)

        return name_no_ext

    def extract_filename(self, url):
        """Extract filename and path from WordPress URL"""
        # Match: /wp-content/uploads/YYYY/MM/filename or {{ site.baseurl }}/wp-content/uploads/YYYY/MM/filename
        match = re.search(r'/wp-content/uploads/(\d{4})/(\d{2})/([^"\s<>]+)', url)
        if match:
            year = match.group(1)
            month = match.group(2)
            filename = match.group(3)

            # Strip WordPress size suffixes and extension
            clean_name = self.strip_wordpress_sizes(filename)

            # Cloudinary public_id: MM/filename (without extension or size suffix)
            # Using just month (not year/month) to match your Cloudinary structure
            public_id = f"{month}/{clean_name}"
            return public_id, filename

        # Fallback for URLs without date path
        match = re.search(r'/wp-content/uploads/([^"\s<>]+)', url)
        if match:
            filename = match.group(1)
            clean_name = self.strip_wordpress_sizes(filename)
            return clean_name, filename

        return None, None

    def generate_cloudinary_url(self, public_id, transformation=''):
        """Generate Cloudinary URL from public_id (already has path, no extension)"""
        if transformation:
            return f"https://res.cloudinary.com/{self.cloud_name}/image/upload/{transformation}/{public_id}"
        else:
            return f"https://res.cloudinary.com/{self.cloud_name}/image/upload/{public_id}"

    def migrate_figure_tags(self, content, file_path):
        """Migrate <figure> tags with WordPress images to Cloudinary"""
        modified = False

        # Pattern for <figure> with WordPress image
        # Captures: href, src, alt, caption
        pattern = r'<figure>(?:<a href="([^"]*wp-content/uploads[^"]*)">)?<img src="(https://www\.circleseven\.co\.uk/wp-content/uploads[^"]*)" alt="([^"]*)"([^>]*)>(?:</a>)?(?:<figcaption>(.*?)</figcaption>)?</figure>'

        def replace_figure(match):
            nonlocal modified
            href = match.group(1) if match.group(1) else None
            src = match.group(2)
            alt = match.group(3)
            img_attrs = match.group(4)  # loading="lazy" etc
            caption = match.group(5) if match.group(5) else None

            # Extract public_id (with folder path, no extension)
            public_id, filename = self.extract_filename(src)
            if not public_id:
                return match.group(0)  # Return unchanged if can't parse

            # Generate Cloudinary URLs using public_id
            # Use q_auto,f_auto for automatic quality/format optimization
            full_url = self.generate_cloudinary_url(public_id, 'q_auto,f_auto')
            thumb_url = self.generate_cloudinary_url(public_id, 'c_limit,w_800,h_800,q_auto,f_auto')

            # Build new figure tag
            new_figure = '<figure>'

            # Link to full resolution
            new_figure += f'<a href="{full_url}">'

            # Responsive image with srcset
            new_figure += f'<img src="{thumb_url}" '
            new_figure += f'srcset="{self.generate_cloudinary_url(public_id, "c_limit,w_400,q_auto,f_auto")} 400w, '
            new_figure += f'{self.generate_cloudinary_url(public_id, "c_limit,w_800,q_auto,f_auto")} 800w, '
            new_figure += f'{self.generate_cloudinary_url(public_id, "c_limit,w_1200,q_auto,f_auto")} 1200w" '
            new_figure += f'sizes="(max-width: 768px) 100vw, 800px" '
            new_figure += f'alt="{alt}"{img_attrs}>'

            new_figure += '</a>'

            # Add caption if present
            if caption:
                new_figure += f'<figcaption>{caption}</figcaption>'

            new_figure += '</figure>'

            modified = True
            self.changes_log.append({
                'file': str(file_path),
                'old_src': src,
                'new_src': full_url,
                'filename': filename
            })

            return new_figure

        new_content = re.sub(pattern, replace_figure, content, flags=re.DOTALL)

        return new_content, modified

    def migrate_standalone_images(self, content, file_path):
        """Migrate standalone <img> tags (not in figures) to Cloudinary"""
        modified = False

        # Pattern for standalone img tags with WordPress URLs
        pattern = r'<img src="(https://www\.circleseven\.co\.uk/wp-content/uploads[^"]*)"([^>]*)>'

        def replace_img(match):
            nonlocal modified
            src = match.group(1)
            img_attrs = match.group(2)

            # Extract public_id (with folder path, no extension)
            public_id, filename = self.extract_filename(src)
            if not public_id:
                return match.group(0)

            # Generate Cloudinary URL with automatic optimization
            cloudinary_url = self.generate_cloudinary_url(public_id, 'q_auto,f_auto')

            modified = True
            self.changes_log.append({
                'file': str(file_path),
                'old_src': src,
                'new_src': cloudinary_url,
                'filename': filename
            })

            return f'<img src="{cloudinary_url}"{img_attrs}>'

        new_content = re.sub(pattern, replace_img, content)

        return new_content, modified

    def migrate_baseurl_links(self, content, file_path):
        """Migrate {{ site.baseurl }}/wp-content/uploads links to Cloudinary"""
        modified = False

        # Pattern for links with {{ site.baseurl }}/wp-content/uploads
        pattern = r'<a href="\{\{ site\.baseurl \}\}/wp-content/uploads/([^"]+)">'

        def replace_link(match):
            nonlocal modified
            url_path = match.group(1)

            # Extract public_id from the path
            public_id, filename = self.extract_filename(f'/wp-content/uploads/{url_path}')
            if not public_id:
                return match.group(0)

            # Generate Cloudinary URL (full resolution for lightbox)
            cloudinary_url = self.generate_cloudinary_url(public_id, 'q_auto,f_auto')

            modified = True
            self.changes_log.append({
                'file': str(file_path),
                'old_href': f'{{{{ site.baseurl }}}}/wp-content/uploads/{url_path}',
                'new_href': cloudinary_url,
                'filename': filename
            })

            return f'<a href="{cloudinary_url}">'

        new_content = re.sub(pattern, replace_link, content)

        return new_content, modified

    def migrate_file(self, file_path):
        """Migrate a single markdown file"""
        self.stats['files_processed'] += 1

        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check if file has WordPress URLs
        if 'circleseven.co.uk/wp-content/uploads' not in content and 'site.baseurl }}/wp-content/uploads' not in content:
            return False

        # Backup file first
        if not self.backup_file(file_path):
            return False

        # Migrate figure tags
        content, fig_modified = self.migrate_figure_tags(content, file_path)

        # Migrate standalone images
        content, img_modified = self.migrate_standalone_images(content, file_path)

        # Migrate {{ site.baseurl }}/wp-content/uploads links
        content, link_modified = self.migrate_baseurl_links(content, file_path)

        modified = fig_modified or img_modified or link_modified

        if modified:
            if not self.dry_run:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content)
            self.stats['files_modified'] += 1
            return True

        return False

    def run(self):
        """Run migration on all posts"""
        if not self.posts_dir.exists():
            print(f"Error: {self.posts_dir} directory not found")
            return

        print(f"{'DRY RUN: ' if self.dry_run else ''}Starting Cloudinary migration...")
        print(f"Cloud name: {self.cloud_name}")
        print()

        # Process all markdown files
        for post_file in sorted(self.posts_dir.glob('*.md')):
            if self.migrate_file(post_file):
                action = "Would modify" if self.dry_run else "Modified"
                print(f"✓ {action}: {post_file.name}")

        # Count total images replaced
        self.stats['images_replaced'] = len(self.changes_log)

        # Print summary
        print(f"\n{'DRY RUN ' if self.dry_run else ''}Summary:")
        print(f"Files processed: {self.stats['files_processed']}")
        print(f"Files {'to be ' if self.dry_run else ''}modified: {self.stats['files_modified']}")
        print(f"Images {'to be ' if self.dry_run else ''}replaced: {self.stats['images_replaced']}")

        if self.stats['errors']:
            print(f"\nErrors: {len(self.stats['errors'])}")
            for error in self.stats['errors']:
                print(f"  - {error}")

        # Save detailed log
        if not self.dry_run and self.changes_log:
            log_file = self.backup_dir / f'migration-log-{datetime.now().strftime("%Y%m%d-%H%M%S")}.json'
            with open(log_file, 'w') as f:
                json.dump({
                    'timestamp': datetime.now().isoformat(),
                    'cloud_name': self.cloud_name,
                    'stats': self.stats,
                    'changes': self.changes_log
                }, f, indent=2)
            print(f"\nDetailed log saved to: {log_file}")

        if not self.dry_run:
            print(f"\nBackups saved to: {self.backup_dir}")
            print("To rollback, run: python3 scripts/migrate-to-cloudinary.py --rollback")

    def rollback(self):
        """Rollback migration by restoring from backups"""
        if not self.backup_dir.exists():
            print("Error: No backup directory found. Nothing to rollback.")
            return

        print("Rolling back Cloudinary migration...")

        restored = 0
        for backup_file in self.backup_dir.glob('*.md'):
            original_file = self.posts_dir / backup_file.name
            try:
                shutil.copy2(backup_file, original_file)
                restored += 1
                print(f"✓ Restored: {backup_file.name}")
            except Exception as e:
                print(f"✗ Failed to restore {backup_file.name}: {e}")

        print(f"\nRestored {restored} files from backup")
        print(f"Backup directory preserved at: {self.backup_dir}")
        print("To delete backups, run: rm -rf {self.backup_dir}")

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Migrate WordPress images to Cloudinary')
    parser.add_argument('--cloud-name', required=False, help='Cloudinary cloud name')
    parser.add_argument('--dry-run', action='store_true', help='Preview changes without modifying files')
    parser.add_argument('--rollback', action='store_true', help='Rollback migration using backups')

    args = parser.parse_args()

    if args.rollback:
        migrator = CloudinaryMigrator('')
        migrator.rollback()
        return

    if not args.cloud_name:
        print("Error: --cloud-name is required (unless using --rollback)")
        print("Usage: python3 scripts/migrate-to-cloudinary.py --cloud-name YOUR_CLOUD_NAME [--dry-run]")
        return

    migrator = CloudinaryMigrator(args.cloud_name, dry_run=args.dry_run)
    migrator.run()

if __name__ == '__main__':
    main()
