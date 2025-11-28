#!/usr/bin/env node
/**
 * Clear Menus Blob Cache
 *
 * This script clears the cached menu data from Netlify Blobs.
 * Run this after making direct changes to _data/menus.yml to force
 * the admin interface to reload fresh data.
 */

import { getStore } from '@netlify/blobs';

const BLOB_CACHE_KEY = 'menus.json';

async function clearMenuCache() {
  try {
    console.log('Clearing menu cache...');
    const store = getStore('cache');

    // Delete the cache entry
    await store.delete(BLOB_CACHE_KEY);

    console.log('✓ Menu cache cleared successfully');
    console.log('The admin interface will now fetch fresh menu data from GitHub on next load.');
  } catch (error) {
    console.error('Error clearing menu cache:', error);
    process.exit(1);
  }
}

clearMenuCache();
