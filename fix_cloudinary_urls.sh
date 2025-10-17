#!/bin/bash

# This script removes WordPress image size suffixes and uses Cloudinary's transformation URLs
# Pattern: filename-WIDTHxHEIGHT.jpg -> filename.jpg with Cloudinary transformations

find _posts _pages -name "*.md" -type f -exec sed -i '' \
  -e 's|https://res\.cloudinary\.com/circleseven/image/upload/\([^"]*\)-[0-9]\{1,4\}x[0-9]\{1,4\}\.\([a-zA-Z]\{3,4\}\)|https://res.cloudinary.com/circleseven/image/upload/\1.\2|g' \
  {} +

echo "Fixed Cloudinary URLs to use original filenames"
