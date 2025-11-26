#!/usr/bin/env node

/**
 * JavaScript Build Script
 *
 * Bundles and minifies JavaScript files using esbuild:
 * - Concatenates multiple JS files
 * - Minifies output
 * - Tree-shakes unused code
 * - Outputs a single bundle
 */

const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const JS_DIR = path.join(__dirname, 'assets/js');
const OUTPUT_DIR = path.join(__dirname, 'assets/js/dist');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// JavaScript files to bundle (in order)
const JS_FILES = [
  'lazy-cards.js',
  'gallery-fix.js',
  'embeds.js',
  'menu.js',
  'lightbox.js',
  'back-to-top.js',
  'code-copy.js',
  'edit-links.js',
  'leaflet-init.js'
];

/**
 * Creates an entry point file that imports all JS modules
 */
function createEntryPoint() {
  const entryPath = path.join(OUTPUT_DIR, 'entry.js');
  const imports = JS_FILES.map(file =>
    `import '${path.join(JS_DIR, file)}';`
  ).join('\n');

  fs.writeFileSync(entryPath, imports);
  console.log(`✓ Created entry point with ${JS_FILES.length} imports`);

  return entryPath;
}

/**
 * Bundles and minifies JavaScript using esbuild
 */
async function bundle() {
  console.log('🔧 JavaScript Build Script Starting...\n');
  console.log('━'.repeat(50));

  try {
    // Step 1: Create entry point
    const entryPoint = createEntryPoint();

    // Step 2: Bundle with esbuild
    console.log('\nBundling JavaScript files...');

    const result = await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      minify: true,
      format: 'iife', // Immediately Invoked Function Expression
      outfile: path.join(OUTPUT_DIR, 'bundle.js'),
      target: ['es2015'], // Support older browsers
      logLevel: 'info'
    });

    // Step 3: Get file sizes
    const bundleSize = fs.statSync(path.join(OUTPUT_DIR, 'bundle.js')).size;

    // Calculate original size
    let originalSize = 0;
    JS_FILES.forEach(file => {
      const filePath = path.join(JS_DIR, file);
      if (fs.existsSync(filePath)) {
        originalSize += fs.statSync(filePath).size;
      }
    });

    // Step 4: Clean up entry point
    fs.unlinkSync(entryPoint);

    console.log('\n━'.repeat(50));
    console.log('✅ JavaScript Build Complete!\n');
    console.log('File sizes:');
    console.log(`  📄 Original: ${(originalSize / 1024).toFixed(1)}KB (${JS_FILES.length} files)`);
    console.log(`  📄 Bundled: ${(bundleSize / 1024).toFixed(1)}KB (1 file)`);
    console.log(`  💾 Savings: ${((1 - bundleSize / originalSize) * 100).toFixed(1)}% size reduction`);
    console.log(`  🚀 HTTP requests: ${JS_FILES.length} → 1 (${JS_FILES.length - 1} fewer)\n`);

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
if (require.main === module) {
  bundle();
}

module.exports = { bundle };
