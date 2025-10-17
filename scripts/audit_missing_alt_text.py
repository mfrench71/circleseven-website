#!/usr/bin/env python3
"""
Audit images for missing or empty alt text
Generates a report of all images that need alt text added
"""

import os
import re
from pathlib import Path

def find_images_missing_alt(content, filename):
    """Find all images with missing or empty alt text"""

    # Pattern to match img tags
    img_pattern = r'<img[^>]*>'
    images = re.findall(img_pattern, content)

    missing_alt = []

    for img_tag in images:
        # Check if alt attribute exists
        alt_match = re.search(r'alt=["\']([^"\']*)["\']', img_tag)

        if not alt_match:
            # No alt attribute at all
            missing_alt.append({
                'tag': img_tag,
                'issue': 'missing alt attribute',
                'src': extract_src(img_tag)
            })
        elif alt_match.group(1) == '':
            # Empty alt attribute
            missing_alt.append({
                'tag': img_tag,
                'issue': 'empty alt text',
                'src': extract_src(img_tag)
            })

    return missing_alt

def extract_src(img_tag):
    """Extract src from img tag"""
    src_match = re.search(r'src=["\']([^"\']+)["\']', img_tag)
    if src_match:
        src = src_match.group(1)
        # Get just the filename
        return src.split('/')[-1]
    return 'unknown'

def process_post_file(filepath):
    """Process a single post file"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        issues = find_images_missing_alt(content, filepath.name)

        if issues:
            return {
                'file': filepath.name,
                'issues': issues
            }

        return None

    except Exception as e:
        print(f"❌ Error processing {filepath.name}: {str(e)}")
        return None

def main():
    posts_dir = Path('_posts')

    if not posts_dir.exists():
        print("❌ _posts directory not found")
        return

    post_files = list(posts_dir.glob('*.md'))

    print(f"Auditing {len(post_files)} post files for missing alt text...\n")
    print("=" * 80)

    results = []
    total_issues = 0

    for filepath in sorted(post_files):
        result = process_post_file(filepath)
        if result:
            results.append(result)
            total_issues += len(result['issues'])

    # Generate report
    if results:
        print(f"\n📊 AUDIT REPORT: Found {total_issues} images with alt text issues in {len(results)} files\n")
        print("=" * 80)

        for result in results:
            print(f"\n📄 {result['file']}")
            print(f"   {len(result['issues'])} issue(s):")
            for i, issue in enumerate(result['issues'], 1):
                print(f"   {i}. {issue['issue']}: {issue['src']}")

        print("\n" + "=" * 80)
        print(f"\n💡 RECOMMENDATION:")
        print(f"   - Review {len(results)} files and add descriptive alt text")
        print(f"   - Decorative images should use alt=\"\" (empty)")
        print(f"   - Informative images need descriptive text")

    else:
        print("\n✅ All images have alt text! No issues found.")

    print("\n" + "=" * 80)

if __name__ == '__main__':
    main()
