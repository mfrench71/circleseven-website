#!/bin/bash
set -e

echo "Building Jekyll site with cache busting..."

# Generate a cache bust hash (using current timestamp)
CACHE_BUST=$(date +%s)

echo "Cache bust version: $CACHE_BUST"

# Update index.html to use versioned assets
sed -i.bak "s/app\.js?v=[0-9]*/app.js?v=$CACHE_BUST/g" admin-custom/index.html
sed -i.bak "s/styles\.css?v=[0-9]*/styles.css?v=$CACHE_BUST/g" admin-custom/index.html

# Also update service worker cache name to force cache refresh
sed -i.bak "s/circle-seven-admin-v[0-9]*/circle-seven-admin-v$CACHE_BUST/g" admin-custom/sw.js

# Clean up backup files
rm -f admin-custom/index.html.bak
rm -f admin-custom/sw.js.bak

echo "Cache busting complete. Updated to version: $CACHE_BUST"

# Run Jekyll build
bundle exec jekyll build

echo "Build complete!"
