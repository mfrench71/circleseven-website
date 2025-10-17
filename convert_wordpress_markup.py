#!/usr/bin/env python3
"""
Convert WordPress markup to clean HTML in Jekyll posts
Removes WordPress bloat and converts embeds to standard iframes
"""

import os
import re
import glob

def extract_youtube_id(url):
    """Extract YouTube video ID from various URL formats"""
    patterns = [
        r'(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)',
        r'youtube\.com\/watch\?.*v=([^&\n?#]+)'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None

def extract_vimeo_id(url):
    """Extract Vimeo video ID from URL"""
    match = re.search(r'vimeo\.com\/(?:video\/)?(\d+)', url)
    return match.group(1) if match else None

def convert_youtube_embed(content):
    """Convert WordPress YouTube embeds to clean responsive iframe"""
    # Pattern 1: WordPress block editor format
    pattern1 = r'<figure class="wp-block-embed is-type-video is-provider-youtube[^"]*">\s*<div class="wp-block-embed__wrapper">\s*(https?://[^\s<]+youtube[^\s<]+)\s*</div>\s*</figure>'

    def replace_youtube(match):
        url = match.group(1)
        video_id = extract_youtube_id(url)
        if video_id:
            return f'<div class="embed-container"><iframe src="https://www.youtube.com/embed/{video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'
        return match.group(0)

    content = re.sub(pattern1, replace_youtube, content, flags=re.DOTALL)

    # Pattern 2: Legacy [embed] shortcode
    pattern2 = r'\[embed\](https?://[^\]]*(?:youtube\.com|youtu\.be)[^\]]*)\[/embed\]'

    def replace_youtube_shortcode(match):
        url = match.group(1)
        video_id = extract_youtube_id(url)
        if video_id:
            return f'<div class="embed-container"><iframe src="https://www.youtube.com/embed/{video_id}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>'
        return match.group(0)

    content = re.sub(pattern2, replace_youtube_shortcode, content)

    return content

def convert_vimeo_embed(content):
    """Convert WordPress Vimeo embeds to clean responsive iframe"""
    # Pattern 1: WordPress block editor format
    pattern1 = r'<figure class="wp-block-embed is-type-video is-provider-vimeo[^"]*">\s*<div class="wp-block-embed__wrapper">\s*(https?://[^\s<]+vimeo[^\s<]+)\s*</div>\s*</figure>'

    def replace_vimeo(match):
        url = match.group(1)
        video_id = extract_vimeo_id(url)
        if video_id:
            return f'<div class="embed-container"><iframe src="https://player.vimeo.com/video/{video_id}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>'
        return match.group(0)

    content = re.sub(pattern1, replace_vimeo, content, flags=re.DOTALL)

    # Pattern 2: Vimeo player with inline styles
    pattern2 = r'<div class="wp-block-vimeo-create[^>]*>\s*<iframe[^>]+src="([^"]+vimeo[^"]+)"[^>]*>[^<]*</iframe>\s*</div>'

    def replace_vimeo_player(match):
        src = match.group(1)
        video_id = extract_vimeo_id(src)
        if video_id:
            return f'<div class="embed-container"><iframe src="https://player.vimeo.com/video/{video_id}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div>'
        return match.group(0)

    content = re.sub(pattern2, replace_vimeo_player, content, flags=re.DOTALL)

    return content

def convert_soundcloud_embed(content):
    """Convert WordPress SoundCloud embeds to clean iframe"""
    pattern = r'<figure class="wp-block-embed is-type-rich is-provider-soundcloud[^"]*">\s*<div class="wp-block-embed__wrapper">\s*(https?://soundcloud\.com/[^\s<]+)\s*</div>\s*</figure>'

    def replace_soundcloud(match):
        url = match.group(1)
        return f'<iframe width="100%" height="166" scrolling="no" frameborder="no" allow="autoplay" src="https://w.soundcloud.com/player/?url={url}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe>'

    return re.sub(pattern, replace_soundcloud, content, flags=re.DOTALL)

def convert_leaflet_shortcode(content):
    """Convert WordPress Leaflet shortcodes to clean div (JavaScript will handle initialization)"""
    pattern = r'\[leaflet-map\s+lat=["\']?([-\d.]+)["\']?\s+lng=["\']?([-\d.]+)["\']?\s+zoom=["\']?(\d+)["\']?\]'

    def replace_leaflet(match):
        lat = match.group(1)
        lng = match.group(2)
        zoom = match.group(3)
        return f'<div class="leaflet-map" data-lat="{lat}" data-lng="{lng}" data-zoom="{zoom}"></div>'

    return re.sub(pattern, replace_leaflet, content)

def clean_wordpress_classes(content):
    """Remove WordPress-specific CSS classes from markup"""
    # Remove wp- classes from figure tags
    content = re.sub(r'<figure class="wp-block-[^"]*">', '<figure>', content)

    # Remove wp- classes from other elements but keep meaningful ones
    content = re.sub(r' class="wp-block-[^"]*"', '', content)
    content = re.sub(r' class="wp-element-[^"]*"', '', content)
    content = re.sub(r' class="has-nested-images[^"]*"', '', content)
    content = re.sub(r' class="columns-default[^"]*"', '', content)
    content = re.sub(r' class="is-cropped[^"]*"', '', content)
    content = re.sub(r' class="size-large[^"]*"', '', content)
    content = re.sub(r' class="size-full[^"]*"', '', content)

    # Clean up empty class attributes
    content = re.sub(r' class=""', '', content)

    return content

def process_post(filepath):
    """Process a single post file"""
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Convert embeds
    content = convert_youtube_embed(content)
    content = convert_vimeo_embed(content)
    content = convert_soundcloud_embed(content)
    content = convert_leaflet_shortcode(content)

    # Clean WordPress classes
    content = clean_wordpress_classes(content)

    # Only write if content changed
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True

    return False

def main():
    """Process all posts in _posts directory"""
    posts_dir = '_posts'

    if not os.path.exists(posts_dir):
        print(f"Error: {posts_dir} directory not found")
        return

    post_files = glob.glob(os.path.join(posts_dir, '*.md'))

    print(f"Found {len(post_files)} post files")
    print("Converting WordPress markup to clean HTML...\n")

    converted_count = 0

    for filepath in post_files:
        filename = os.path.basename(filepath)
        if process_post(filepath):
            print(f"✓ Converted: {filename}")
            converted_count += 1

    print(f"\n{'='*60}")
    print(f"Conversion complete!")
    print(f"Files processed: {len(post_files)}")
    print(f"Files converted: {converted_count}")
    print(f"Files unchanged: {len(post_files) - converted_count}")
    print(f"{'='*60}")

    print("\nClean markup conversions:")
    print("- WordPress YouTube embeds → <div class='embed-container'><iframe>")
    print("- WordPress Vimeo embeds → <div class='embed-container'><iframe>")
    print("- WordPress SoundCloud embeds → <iframe>")
    print("- [leaflet-map] shortcodes → <div class='leaflet-map' data-*>")
    print("- [embed] shortcodes → responsive iframes")
    print("- Removed: wp-block-*, wp-element-*, has-nested-images, etc.")

if __name__ == '__main__':
    main()
