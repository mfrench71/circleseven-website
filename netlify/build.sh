#!/bin/bash
set -e

echo "Building Jekyll site with cache busting..."

# Generate a cache bust hash (using current timestamp)
CACHE_BUST=$(date +%s)

echo "Cache bust version: $CACHE_BUST"

# Update index.html to use versioned assets
sed -i.bak "s/app\.js\?v=[0-9]*/app.js?v=$CACHE_BUST/g" admin-custom/index.html
sed -i.bak "s/styles\.css\?v=[0-9]*/styles.css?v=$CACHE_BUST/g" admin-custom/index.html

# Update all ES6 module imports with new version
sed -i.bak "s/\.js\?v=[0-9]*/.js?v=$CACHE_BUST/g" admin-custom/index.html

# Update module imports in all JavaScript module files
find admin-custom/js/modules -name "*.js" -type f -exec sed -i.bak "s/\.js\?v=[0-9]*/.js?v=$CACHE_BUST/g" {} \;
find admin-custom/js/core -name "*.js" -type f -exec sed -i.bak "s/\.js\?v=[0-9]*/.js?v=$CACHE_BUST/g" {} \;
find admin-custom/js/ui -name "*.js" -type f -exec sed -i.bak "s/\.js\?v=[0-9]*/.js?v=$CACHE_BUST/g" {} \;

# Also update service worker cache name to force cache refresh
sed -i.bak "s/circle-seven-admin-v[0-9]*/circle-seven-admin-v$CACHE_BUST/g" admin-custom/sw.js 2>/dev/null || true

# Clean up backup files
rm -f admin-custom/index.html.bak
rm -f admin-custom/sw.js.bak
find admin-custom/js -name "*.bak" -type f -delete

echo "Cache busting complete. Updated to version: $CACHE_BUST"

# Run tests before building
echo "Running tests..."
npm run test

if [ $? -ne 0 ]; then
  echo "Tests failed! Build aborted."
  exit 1
fi

echo "Tests passed!"

# Run Jekyll build
bundle exec jekyll build

echo "Build complete!"
