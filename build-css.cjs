#!/usr/bin/env node

/**
 * CSS Build Script
 *
 * Concatenates and optimizes CSS files into two bundles:
 * 1. critical.css - Above-the-fold critical styles (~10KB)
 * 2. main.css - All remaining styles (~60KB)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CSS_DIR = path.join(__dirname, 'assets/css');
const SITE_DIR = path.join(__dirname, '_site/assets/css');
const OUTPUT_DIR = path.join(__dirname, 'assets/css/dist');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Critical CSS files (above-the-fold, essential for first paint)
// Note: google-fonts.css excluded because it contains Jekyll/Liquid syntax
// Note: menu.css is large (15KB) - only basics in critical, enhanced features async-loaded
const CRITICAL_FILES = [
  'variables.css',
  'layout.css',
  'font-optimization.css'
];

// Main CSS files (below-the-fold, can load async)
const MAIN_FILES = [
  'menu.css',
  'menu-enhanced.css',
  'cards.css',
  'post-layouts.css',
  'embeds.css',
  'tags.css',
  'contact.css',
  'footer.css',
  'gallery.css',
  'icons.css',
  'mobile-enhancements.css',
  'breadcrumbs.css',
  'back-to-top.css',
  'code-blocks.css',
  'featured-image.css',
  'edit-links.css',
  'comments.css'
];

// Minima theme CSS file (will be purged alongside custom CSS)
const MINIMA_FILE = '_site/assets/css/style.css';

/**
 * Concatenates CSS files in the specified order
 * Can optionally include a single additional file (like Minima theme CSS)
 */
function concatenateFiles(files, outputPath, additionalFile = null) {
  console.log(`\nConcatenating ${files.length} files into ${path.basename(outputPath)}...`);

  let combined = '';
  let totalSize = 0;

  // Add Minima CSS FIRST (so custom CSS can override it)
  if (additionalFile && fs.existsSync(additionalFile)) {
    const content = fs.readFileSync(additionalFile, 'utf8');
    totalSize += content.length;
    combined += `\n/* ${path.basename(additionalFile)} (Minima theme - loaded first, will be overridden by custom CSS) */\n${content}\n`;
    console.log(`  ✓ ${path.basename(additionalFile)} (${(content.length / 1024).toFixed(1)}KB)`);
  }

  // Add custom CSS files AFTER Minima (so they override Minima styles)
  files.forEach(file => {
    const filePath = path.join(CSS_DIR, file);

    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      totalSize += content.length;
      combined += `\n/* ${file} */\n${content}\n`;
      console.log(`  ✓ ${file} (${(content.length / 1024).toFixed(1)}KB)`);
    } else {
      console.warn(`  ⚠ ${file} not found, skipping`);
    }
  });

  fs.writeFileSync(outputPath, combined);
  console.log(`✓ Created ${path.basename(outputPath)} (${(totalSize / 1024).toFixed(1)}KB unminified)`);

  return outputPath;
}

/**
 * Minifies CSS using PostCSS with cssnano and PurgeCSS
 *
 * Note: PurgeCSS requires _site directory to exist (Jekyll must build first)
 * If _site doesn't exist, PurgeCSS will be skipped (only cssnano will run)
 */
function minifyCSS(inputPath, outputPath) {
  console.log(`\nMinifying ${path.basename(inputPath)}...`);

  try {
    const siteDir = path.join(__dirname, '_site');
    const siteExists = fs.existsSync(siteDir);

    if (!siteExists) {
      console.warn('⚠ Warning: _site directory not found. PurgeCSS will be skipped.');
      console.warn('  Run "bundle exec jekyll build" first for optimal CSS purging.');
      console.warn('  Proceeding with cssnano minification only...\n');
    }

    // Run PostCSS (uses postcss.config.cjs with PurgeCSS + cssnano)
    execSync(`npx postcss ${inputPath} -o ${outputPath}`, { stdio: 'inherit' });

    const minifiedSize = fs.statSync(outputPath).size;
    console.log(`✓ Minified to ${(minifiedSize / 1024).toFixed(1)}KB`);

    return outputPath;
  } catch (error) {
    console.error(`Error minifying ${inputPath}:`, error.message);
    throw error;
  }
}

/**
 * Main build function
 */
function build() {
  console.log('🔧 CSS Build Script Starting...\n');
  console.log('━'.repeat(50));

  try {
    // Step 1: Concatenate critical CSS (including Minima theme CSS)
    const criticalTemp = path.join(OUTPUT_DIR, 'critical.temp.css');
    concatenateFiles(CRITICAL_FILES, criticalTemp, MINIMA_FILE);

    // Step 2: Concatenate main CSS (WITHOUT Minima - only in critical to avoid async override)
    const mainTemp = path.join(OUTPUT_DIR, 'main.temp.css');
    concatenateFiles(MAIN_FILES, mainTemp);

    // Step 3: Minify critical CSS
    const criticalOutput = path.join(OUTPUT_DIR, 'critical.css');
    minifyCSS(criticalTemp, criticalOutput);

    // Step 4: Minify main CSS
    const mainOutput = path.join(OUTPUT_DIR, 'main.css');
    minifyCSS(mainTemp, mainOutput);

    // Step 5: Copy critical.css to _includes/ for Jekyll to inline
    const includesDir = path.join(__dirname, '_includes');
    const criticalInclude = path.join(includesDir, 'critical.css');
    fs.copyFileSync(criticalOutput, criticalInclude);
    console.log(`\n✓ Copied critical.css to _includes/ for Jekyll inlining`);

    // Step 6: Clean up temp files
    fs.unlinkSync(criticalTemp);
    fs.unlinkSync(mainTemp);

    console.log('\n━'.repeat(50));
    console.log('✅ CSS Build Complete!\n');
    console.log('Output files:');
    console.log(`  📄 ${criticalOutput}`);
    console.log(`  📄 ${criticalInclude} (for Jekyll)`);
    console.log(`  📄 ${mainOutput}`);
    console.log('\nNext steps:');
    console.log('  1. Inline critical.css in _includes/head.html');
    console.log('  2. Async load main.css');
    console.log('  3. Add style.css (Minima theme) to main.css or critical.css as needed');
    console.log('  4. Test the site to ensure all styles work correctly\n');

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
if (require.main === module) {
  build();
}

module.exports = { build };
