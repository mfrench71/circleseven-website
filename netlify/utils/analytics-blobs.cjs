/**
 * Netlify Blobs Analytics Storage Utility
 *
 * Stores analytics data in Netlify Blobs for zero build consumption.
 */

const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'analytics';
const DATA_KEY = 'analytics-data';

// In-memory cache to reduce blob reads
let cachedData = null;
let cacheTime = null;
const CACHE_TTL = 30000; // 30 seconds

function getAnalyticsStore() {
  return getStore(STORE_NAME);
}

/**
 * Load analytics data from Netlify Blobs
 */
async function loadAnalyticsData() {
  // Return cached data if fresh
  if (cachedData && cacheTime && (Date.now() - cacheTime < CACHE_TTL)) {
    console.log('[Analytics] Returning cached data');
    return cachedData;
  }

  try {
    console.log('[Analytics] Loading data from Blobs...');
    const store = getAnalyticsStore();

    // DEBUG: List all keys in the store
    try {
      const { blobs } = await store.list();
      console.log('[Analytics] DEBUG: Keys in store:', blobs ? blobs.map(b => b.key).join(', ') : 'none');
    } catch (listError) {
      console.log('[Analytics] DEBUG: Could not list keys:', listError.message);
    }

    const dataString = await store.get(DATA_KEY);
    console.log('[Analytics] Raw data from Blobs:', dataString ? `Found (${dataString.length} bytes)` : 'Not found');

    if (!dataString) {
      console.log('[Analytics] No data found, returning defaults');
      const defaultData = {
        pageViews: {},
        uniqueVisitors: [],
        referrers: {},
        browsers: {},
        devices: {},
        countries: {},
        cities: {},
        viewsByDay: {},
        viewsByHour: {},
        pageViewDetails: {},
        sessions: {},
        createdAt: new Date().toISOString()
      };
      cachedData = defaultData;
      cacheTime = Date.now();
      return defaultData;
    }

    const data = JSON.parse(dataString);
    console.log('[Analytics] Parsed data, page views:', Object.keys(data.pageViews).length);

    // Convert uniqueVisitors array back to Set for easier manipulation
    if (Array.isArray(data.uniqueVisitors)) {
      data.uniqueVisitors = new Set(data.uniqueVisitors);
    } else if (!data.uniqueVisitors) {
      data.uniqueVisitors = new Set();
    }

    cachedData = data;
    cacheTime = Date.now();
    return data;
  } catch (error) {
    console.error('[Analytics] Failed to load analytics data:', error);
    console.error('[Analytics] Error stack:', error.stack);
    // Return default on error
    return {
      pageViews: {},
      uniqueVisitors: new Set(),
      referrers: {},
      browsers: {},
      devices: {},
      countries: {},
      cities: {},
      viewsByDay: {},
      viewsByHour: {},
      pageViewDetails: {},
      sessions: {},
      createdAt: new Date().toISOString()
    };
  }
}

/**
 * Save analytics data to Netlify Blobs
 */
async function saveAnalyticsData(data) {
  try {
    console.log('[Analytics] Attempting to save data...');
    const dataToSave = {
      ...data,
      uniqueVisitors: Array.from(data.uniqueVisitors || [])
    };

    console.log('[Analytics] Getting blob store:', STORE_NAME);
    const store = getAnalyticsStore();
    console.log('[Analytics] Store obtained, setting key:', DATA_KEY);
    await store.set(DATA_KEY, JSON.stringify(dataToSave));
    console.log('[Analytics] Data saved successfully');

    // Update cache
    cachedData = data;
    cacheTime = Date.now();

    return true;
  } catch (error) {
    console.error('[Analytics] Failed to save analytics data:', error);
    console.error('[Analytics] Error stack:', error.stack);
    throw error;
  }
}

/**
 * Purge all analytics data
 */
async function purgeAnalyticsData() {
  const newData = {
    pageViews: {},
    uniqueVisitors: [],
    referrers: {},
    browsers: {},
    devices: {},
    countries: {},
    cities: {},
    viewsByDay: {},
    viewsByHour: {},
    pageViewDetails: {},
    sessions: {},
    createdAt: new Date().toISOString()
  };

  await saveAnalyticsData(newData);

  // Clear cache
  cachedData = null;
  cacheTime = null;

  return newData;
}

/**
 * Clear the in-memory cache
 */
function clearCache() {
  cachedData = null;
  cacheTime = null;
}

module.exports = {
  loadAnalyticsData,
  saveAnalyticsData,
  purgeAnalyticsData,
  clearCache
};
