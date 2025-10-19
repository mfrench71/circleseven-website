#!/usr/bin/env python3
"""
Verify which -scaled images exist without the suffix in Cloudinary.
Only report ones that are safe to fix.
"""

import requests
import time

# List of missing images with -scaled suffix
scaled_images = [
    "05/boathouse-radford-lake-archive-image_46451516625_o-scaled",
    "05/dsc0023_46699515701_o-scaled",
    "05/sawmill-south-pool-salcombe_32214330017_o-scaled",
    "05/sawmill-south-pool-salcombe_33281038758_o-scaled",
    "05/sawmill-south-pool-salcombe_46242182475_o-scaled",
    "05/sawmill-south-pool-salcombe_46432810484_o-scaled",
    "06/boathouse-radford-lake-present-day_32234305677_o-scaled",
    "06/boathouse-radford-lake-present-day_32234306377_o-scaled",
    "06/boathouse-radford-lake-present-day_32234306457_o-scaled",
    "06/boathouse-radford-lake-present-day_32234306737_o-scaled",
    "06/boathouse-radford-lake-present-day_32234306827_o-scaled",
    "06/boathouse-radford-lake-present-day_32234307117_o-scaled",
    "06/boathouse-radford-lake-present-day_32234307697_o-scaled",
    "06/boathouse-radford-lake-present-day_46261899775_o-scaled",
    "06/boathouse-radford-lake-present-day_46261901745_o-scaled",
    "06/boathouse-radford-lake-present-day_46261901925_o-scaled",
]

def check_url(url):
    """Check if URL returns 200."""
    try:
        response = requests.head(url, timeout=5)
        return response.status_code == 200
    except:
        return False

safe_to_fix = []
not_safe = []

print("Verifying which -scaled images exist without suffix...\n")

for image_path in scaled_images:
    # Remove -scaled suffix
    clean_path = image_path.replace('-scaled', '')

    # Build URLs
    scaled_url = f"https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/{image_path}.jpg"
    clean_url = f"https://res.cloudinary.com/circleseven/image/upload/q_auto,f_auto/{clean_path}.jpg"

    # Check both
    scaled_exists = check_url(scaled_url)
    clean_exists = check_url(clean_url)

    print(f"Checking: {image_path}")
    print(f"  With -scaled: {'✓ EXISTS' if scaled_exists else '✗ MISSING'}")
    print(f"  Without -scaled: {'✓ EXISTS' if clean_exists else '✗ MISSING'}")

    if clean_exists and not scaled_exists:
        print(f"  → SAFE TO FIX")
        safe_to_fix.append(image_path)
    else:
        print(f"  → NOT SAFE - skip this one")
        not_safe.append(image_path)

    print()
    time.sleep(0.2)  # Be nice to the server

print("="*80)
print(f"\nSafe to fix ({len(safe_to_fix)} images):")
for img in safe_to_fix:
    print(f"  - {img}")

print(f"\nNOT safe to fix ({len(not_safe)} images):")
for img in not_safe:
    print(f"  - {img}")
