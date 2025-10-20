#!/usr/bin/env node

/**
 * Sync Taxonomy to CMS Config
 *
 * This script reads categories and tags from _data/taxonomy.yml
 * and updates the options in admin/config.yml to keep them in sync.
 *
 * Run this after updating taxonomy in the CMS Settings.
 *
 * Usage: node scripts/sync-taxonomy.js
 */

const fs = require('fs');
const yaml = require('js-yaml');

const TAXONOMY_FILE = '_data/taxonomy.yml';
const CONFIG_FILE = 'admin/config.yml';

console.log('🔄 Syncing taxonomy to CMS config...\n');

try {
  // Read taxonomy file
  console.log(`📖 Reading ${TAXONOMY_FILE}...`);
  const taxonomyContent = fs.readFileSync(TAXONOMY_FILE, 'utf8');
  const taxonomy = yaml.load(taxonomyContent);

  if (!taxonomy.categories || !taxonomy.tags) {
    console.error('❌ Error: taxonomy.yml must contain categories and tags arrays');
    process.exit(1);
  }

  // Extract strings from taxonomy (handles both simple strings and {item: "string"} format)
  const extractStrings = (arr) => arr.map(item =>
    typeof item === 'string' ? item : (item.item || item)
  );

  const categories = extractStrings(taxonomy.categories);
  const tags = extractStrings(taxonomy.tags);

  console.log(`   Found ${categories.length} categories`);
  console.log(`   Found ${tags.length} tags\n`);

  // Read config file
  console.log(`📖 Reading ${CONFIG_FILE}...`);
  const configContent = fs.readFileSync(CONFIG_FILE, 'utf8');

  // Function to create properly formatted YAML list with correct indentation
  function formatOptions(items, indent = 10) {
    const spaces = ' '.repeat(indent);
    return items.map(item => {
      // Quote items that contain special characters or start with numbers
      const needsQuotes = /[:\-\s]/.test(item) || /^\d/.test(item);
      const quotedItem = needsQuotes ? `"${item.replace(/"/g, '\\"')}"` : item;
      return `${spaces}- ${quotedItem}`;
    }).join('\n');
  }

  // Replace categories options
  console.log('✏️  Updating categories options...');
  const categoriesPattern = /(- label: "Categories"\s+name: "categories"\s+widget: "select"\s+multiple: true\s+required: false\s+options:\s*\n)((?:\s+- [^\n]+\n)+)/;
  const categoriesOptions = formatOptions(categories);
  const updatedConfig1 = configContent.replace(
    categoriesPattern,
    `$1${categoriesOptions}\n`
  );

  if (updatedConfig1 === configContent) {
    console.error('❌ Error: Could not find categories section in config.yml');
    process.exit(1);
  }

  // Replace tags options
  console.log('✏️  Updating tags options...');
  const tagsPattern = /(- label: "Tags"\s+name: "tags"\s+widget: "select"\s+multiple: true\s+required: false\s+options:\s*\n)((?:\s+- [^\n]+\n)+)/;
  const tagsOptions = formatOptions(tags);
  const updatedConfig2 = updatedConfig1.replace(
    tagsPattern,
    `$1${tagsOptions}\n`
  );

  if (updatedConfig2 === updatedConfig1) {
    console.error('❌ Error: Could not find tags section in config.yml');
    process.exit(1);
  }

  // Write updated config
  console.log(`💾 Writing updated config to ${CONFIG_FILE}...\n`);
  fs.writeFileSync(CONFIG_FILE, updatedConfig2, 'utf8');

  console.log('✅ Taxonomy synced successfully!\n');
  console.log('Summary:');
  console.log(`   Categories: ${categories.length} items`);
  console.log(`   Tags: ${tags.length} items\n`);
  console.log('💡 Don\'t forget to commit the changes to admin/config.yml');

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
