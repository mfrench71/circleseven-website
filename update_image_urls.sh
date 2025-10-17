#!/bin/bash

# Update WordPress image URLs to point to Cloudinary
# Cloud name: circleseven

CLOUD_NAME="circleseven"

echo "Updating image URLs to point to Cloudinary..."
echo "Cloud name: $CLOUD_NAME"
echo ""

# Find all posts and pages with wp-content/uploads references
echo "Searching for WordPress image URLs..."

# Replace the full WordPress URL pattern with Cloudinary
# Pattern: https://www.circleseven.co.uk/wp-content/uploads/YYYY/MM/filename.jpg
# Replace with: https://res.cloudinary.com/circleseven/image/upload/filename.jpg

find _posts _pages -name "*.md" -type f -exec sed -i '' \
  -e 's|https://www\.circleseven\.co\.uk/wp-content/uploads/[0-9]\{4\}/[0-9]\{2\}/\([^"]*\)|https://res.cloudinary.com/circleseven/image/upload/\1|g' \
  {} +

echo "✓ Updated image URLs in posts and pages"
echo ""
echo "Checking results..."

# Count how many files were modified
MODIFIED=$(git status --short | grep "^ M" | wc -l)
echo "Modified files: $MODIFIED"

# Show sample of changes
echo ""
echo "Sample changes:"
git diff _posts/ _pages/ | grep "^[-+].*cloudinary" | head -10

echo ""
echo "Done! Review the changes with: git diff"
