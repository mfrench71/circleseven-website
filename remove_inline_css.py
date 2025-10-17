#!/usr/bin/env python3
"""
Remove duplicate inline CSS from template files
Styles are now in /assets/css/post-layouts.css
"""

import re

def remove_inline_styles_index():
    """Remove inline styles from index.html"""
    filepath = 'index.html'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove the <style> block (lines 72-184 approximately)
    pattern = r'<style>\s*\.post-list \{.*?</style>'
    content = re.sub(pattern, '', content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Removed inline styles from {filepath}")

def remove_inline_styles_categories():
    """Remove inline styles from categories.md"""
    filepath = 'categories.md'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove the <style> block
    pattern = r'<style>\s*\.categories-page \{.*?</style>'
    content = re.sub(pattern, '', content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Removed inline styles from {filepath}")

def remove_inline_styles_category_layout():
    """Remove inline styles from _layouts/category.html"""
    filepath = '_layouts/category.html'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove the <style> block
    pattern = r'<style>\s*\.category-archive \{.*?</style>'
    content = re.sub(pattern, '', content, flags=re.DOTALL)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"✓ Removed inline styles from {filepath}")

def main():
    print("Removing duplicate inline CSS from templates...")
    print("Styles moved to /assets/css/post-layouts.css\n")

    remove_inline_styles_index()
    remove_inline_styles_categories()
    remove_inline_styles_category_layout()

    print("\n✓ Complete! Inline CSS removed from 3 files")
    print("Estimated savings: ~15KB")

if __name__ == '__main__':
    main()
