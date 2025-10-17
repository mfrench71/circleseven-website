#!/usr/bin/env python3
import os
import re

posts_dir = '_posts'

# Mapping of patterns to fix
fixes = {
    # Pattern: "CourseCode - Name Digital Art and Technology" -> ["CourseCode - Name", "Digital Art and Technology"]
    r'\["(DAT\d+ - [^"]+) Digital Art and Technology"\]': r'["\1", "Digital Art and Technology"]',

    # Pattern: "Digital Art and Technology INDE601 - Netscapes" -> ["Digital Art and Technology", "INDE601 - Netscapes"]
    r'\["Digital Art and Technology (INDE\d+ - [^"]+)"\]': r'["Digital Art and Technology", "\1"]',

    # Pattern: "Projects Retro Computing" -> ["Projects", "Retro Computing"]
    r'\["Projects Retro Computing"\]': r'["Projects", "Retro Computing"]',

    # Pattern: "Photography Projects" -> ["Projects", "Photography"]
    r'\["Photography Projects"\]': r'["Projects", "Photography"]',

    # Pattern: "Motion Graphics Projects" -> ["Projects", "Motion Graphics"]
    r'\["Motion Graphics Projects"\]': r'["Projects", "Motion Graphics"]',
}

for filename in os.listdir(posts_dir):
    if not filename.endswith('.md'):
        continue

    filepath = os.path.join(posts_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Apply all fixes
    for pattern, replacement in fixes.items():
        content = re.sub(pattern, replacement, content)

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed: {filename}')

print('Done!')
