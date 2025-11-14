/**
 * Analytics Tracking Netlify Function
 *
 * Tracks page views, visitors, and referrers with persistent storage using Netlify Blobs.
 * Data is stored in Netlify's blob storage (does NOT trigger deploys).
 *
 * Tracks:
 * - Page views per URL
 * - Unique visitors (by session)
 * - Referrers
 * - User agents (browsers/devices)
 * - Time-series data (hourly, daily)
 *
 * Updated to use utility pattern for Blobs access.
 *
 * @module netlify/functions/analytics-track
 */

import { getStore } from '@netlify/blobs';

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

    // Convert uniqueVisitors array back to Set
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

// Rate limiting (inline simple version)
const requestCounts = new Map();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(event) {
  const clientIP = event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown';
  const now = Date.now();

  if (!requestCounts.has(clientIP)) {
    requestCounts.set(clientIP, []);
  }

  const requests = requestCounts.get(clientIP).filter(time => now - time < RATE_WINDOW);
  requests.push(now);
  requestCounts.set(clientIP, requests);

  if (requests.length > RATE_LIMIT) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return null;
}

// Response helpers (Functions v2 format - Web Response API)
function successResponse(data, statusCode = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...additionalHeaders
    }
  });
}

function methodNotAllowedResponse() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}

function serverErrorResponse(error, options = {}) {
  return new Response(JSON.stringify({
    error: 'Internal server error',
    message: error.message,
    ...(options.includeStack && { stack: error.stack })
  }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' }
  });
}

function corsPreflightResponse() {
  return new Response('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
    }
  });
}

function badRequestResponse(message) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Parse user agent to extract browser info
 */
function parseBrowser(userAgent) {
  if (!userAgent) return 'Unknown';

  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('Chrome/')) return 'Chrome';
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('Opera/') || userAgent.includes('OPR/')) return 'Opera';

  return 'Other';
}

/**
 * Parse user agent to extract device type
 */
function parseDevice(userAgent) {
  if (!userAgent) return 'Unknown';

  const ua = userAgent.toLowerCase();

  // Mobile devices
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipod')) {
    return 'Mobile';
  }

  // Tablets
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'Tablet';
  }

  // Desktop
  return 'Desktop';
}

/**
 * Get date bucket (for time-series data)
 * Returns YYYY-MM-DD format
 */
function getDateBucket(timestamp) {
  const date = new Date(timestamp);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Get hour bucket (for hourly data)
 * Returns YYYY-MM-DD HH format
 */
function getHourBucket(timestamp) {
  const date = new Date(timestamp);
  const hour = date.getUTCHours().toString().padStart(2, '0');
  return `${date.toISOString().split('T')[0]} ${hour}`;
}

/**
 * Track a page view
 */
async function trackPageView(trackData) {
  const { path, referrer, sessionId, userAgent, timestamp, country, city } = trackData;
  const now = timestamp || new Date().toISOString();

  const data = await loadAnalyticsData();

  // Initialize enhanced data structures if they don't exist
  if (!data.devices) data.devices = {};
  if (!data.countries) data.countries = {};
  if (!data.cities) data.cities = {};
  if (!data.viewsByDay) data.viewsByDay = {};
  if (!data.viewsByHour) data.viewsByHour = {};
  if (!data.pageViewDetails) data.pageViewDetails = {};
  if (!data.sessions) data.sessions = {};

  // Track page view (legacy counter)
  data.pageViews[path] = (data.pageViews[path] || 0) + 1;

  // Track detailed page view with timestamp
  if (!data.pageViewDetails[path]) {
    data.pageViewDetails[path] = [];
  }
  data.pageViewDetails[path].push({
    timestamp: now,
    sessionId,
    referrer: referrer || 'direct',
    browser: parseBrowser(userAgent),
    device: parseDevice(userAgent),
    country: country || 'Unknown',
    city: city || 'Unknown'
  });

  // Keep only last 1000 detailed views per page (prevent unbounded growth)
  if (data.pageViewDetails[path].length > 1000) {
    data.pageViewDetails[path] = data.pageViewDetails[path].slice(-1000);
  }

  // Track time-series data by day
  const dateBucket = getDateBucket(now);
  data.viewsByDay[dateBucket] = (data.viewsByDay[dateBucket] || 0) + 1;

  // Track time-series data by hour
  const hourBucket = getHourBucket(now);
  data.viewsByHour[hourBucket] = (data.viewsByHour[hourBucket] || 0) + 1;

  // Track unique visitor
  if (sessionId) {
    if (!data.uniqueVisitors) data.uniqueVisitors = new Set();
    data.uniqueVisitors.add(sessionId);

    // Track session details
    if (!data.sessions[sessionId]) {
      data.sessions[sessionId] = {
        firstSeen: now,
        lastSeen: now,
        pageViews: 0,
        pages: []
      };
    }
    data.sessions[sessionId].lastSeen = now;
    data.sessions[sessionId].pageViews += 1;
    if (!data.sessions[sessionId].pages.includes(path)) {
      data.sessions[sessionId].pages.push(path);
    }
  }

  // Track referrer (only external)
  if (referrer && !referrer.includes('circleseven.co.uk')) {
    try {
      const refUrl = new URL(referrer);
      const refDomain = refUrl.hostname;
      data.referrers[refDomain] = (data.referrers[refDomain] || 0) + 1;
    } catch (e) {
      // Invalid URL, skip
    }
  }

  // Track browser
  const browser = parseBrowser(userAgent);
  data.browsers[browser] = (data.browsers[browser] || 0) + 1;

  // Track device type
  const device = parseDevice(userAgent);
  data.devices[device] = (data.devices[device] || 0) + 1;

  // Track geographic data
  if (country && country !== 'Unknown') {
    data.countries[country] = (data.countries[country] || 0) + 1;
  }
  if (city && city !== 'Unknown') {
    data.cities[city] = (data.cities[city] || 0) + 1;
  }

  // Clean up old hourly data (keep last 30 days = 720 hours)
  const hourBuckets = Object.keys(data.viewsByHour).sort();
  if (hourBuckets.length > 720) {
    const toDelete = hourBuckets.slice(0, hourBuckets.length - 720);
    toDelete.forEach(bucket => delete data.viewsByHour[bucket]);
  }

  // Clean up old sessions (keep active sessions from last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  Object.keys(data.sessions).forEach(sid => {
    if (data.sessions[sid].lastSeen < sevenDaysAgo) {
      delete data.sessions[sid];
    }
  });

  // Save to Netlify Blobs (await to catch errors)
  try {
    await saveAnalyticsData(data);
  } catch (err) {
    console.error('Failed to save analytics:', err);
    // Don't throw - still return tracked response even if save fails
  }

  return data;
}

/**
 * Get analytics statistics
 */
function getStats(data) {
  // Get top pages
  const topPages = Object.entries(data.pageViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  // Get top referrers
  const topReferrers = Object.entries(data.referrers || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([referrer, count]) => ({ referrer, count }));

  // Get browser stats
  const browserStats = Object.entries(data.browsers || {})
    .sort((a, b) => b[1] - a[1])
    .map(([browser, count]) => ({ browser, count }));

  // Get device stats
  const deviceStats = Object.entries(data.devices || {})
    .sort((a, b) => b[1] - a[1])
    .map(([device, count]) => ({ device, count }));

  // Get geographic stats
  const countryStats = Object.entries(data.countries || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([country, count]) => ({ country, count }));

  const cityStats = Object.entries(data.cities || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([city, count]) => ({ city, count }));

  // Get time-series data (last 30 days)
  const viewsByDay = data.viewsByDay || {};
  const sortedDays = Object.keys(viewsByDay).sort();
  const last30Days = sortedDays.slice(-30);
  const dailyViews = last30Days.map(day => ({
    date: day,
    views: viewsByDay[day]
  }));

  // Get time-series data (last 24 hours)
  const viewsByHour = data.viewsByHour || {};
  const sortedHours = Object.keys(viewsByHour).sort();
  const last24Hours = sortedHours.slice(-24);
  const hourlyViews = last24Hours.map(hour => ({
    hour,
    views: viewsByHour[hour]
  }));

  // Calculate average session length and pages per session
  const sessions = data.sessions || {};
  const sessionValues = Object.values(sessions);
  const avgPagesPerSession = sessionValues.length > 0
    ? sessionValues.reduce((sum, s) => sum + s.pageViews, 0) / sessionValues.length
    : 0;

  const uniqueVisitors = data.uniqueVisitors instanceof Set
    ? data.uniqueVisitors.size
    : (Array.isArray(data.uniqueVisitors) ? data.uniqueVisitors.length : 0);

  return {
    summary: {
      totalPageViews: Object.values(data.pageViews).reduce((sum, count) => sum + count, 0),
      uniqueVisitors,
      totalPages: Object.keys(data.pageViews).length,
      avgPagesPerSession: Math.round(avgPagesPerSession * 10) / 10,
      activeSessions: sessionValues.length,
      lastReset: data.createdAt || new Date().toISOString()
    },
    topPages,
    topReferrers,
    browserStats,
    deviceStats,
    countryStats,
    cityStats,
    dailyViews,
    hourlyViews
  };
}


/**
 * Main handler function
 * Using Functions v2 format for Blobs support
 */
export default async function handler(event, context) {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsPreflightResponse();
  }

  // Check rate limit
  const rateLimitResponse = checkRateLimit(event);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // POST - Track page view
    if (event.httpMethod === 'POST') {
      let trackData;
      try {
        trackData = JSON.parse(event.body);
      } catch (error) {
        return badRequestResponse('Invalid JSON');
      }

      // Extract geographic data from Netlify edge headers (privacy-friendly, no IP storage)
      const country = event.headers['x-nf-country-code'] || event.headers['X-Nf-Country-Code'];
      const city = event.headers['x-nf-city'] || event.headers['X-Nf-City'];

      // Add geographic data to trackData
      trackData.country = country;
      trackData.city = city;

      await trackPageView(trackData);

      return successResponse({ tracked: true });
    }

    // GET - Retrieve stats
    if (event.httpMethod === 'GET') {
      const data = await loadAnalyticsData();
      const stats = getStats(data);
      return successResponse(stats, 200, {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
    }

    // DELETE - Purge analytics data
    if (event.httpMethod === 'DELETE') {
      await purgeAnalyticsData();

      return successResponse({
        success: true,
        message: 'Analytics data purged successfully'
      });
    }

    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
}
