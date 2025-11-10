/**
 * Analytics Tracking Netlify Function
 *
 * Tracks page views, visitors, and referrers with persistent storage using GitHub.
 * Data is stored in analytics-data.json in the repo root.
 *
 * Tracks:
 * - Page views per URL
 * - Unique visitors (by session)
 * - Referrers
 * - User agents (browsers/devices)
 *
 * @module netlify/functions/analytics-track
 */

const { checkRateLimit } = require('../utils/rate-limiter.cjs');
const { githubRequest, GITHUB_BRANCH } = require('../utils/github-api.cjs');
const {
  successResponse,
  methodNotAllowedResponse,
  serverErrorResponse,
  corsPreflightResponse,
  badRequestResponse,
  serviceUnavailableResponse
} = require('../utils/response-helpers.cjs');

const DATA_FILE = 'analytics-data.json';

// In-memory cache to reduce GitHub API calls
let cachedData = null;
let cacheTime = null;
const CACHE_TTL = 60000; // 1 minute

/**
 * Load analytics data from GitHub
 */
async function loadData() {
  // Return cached data if fresh
  if (cachedData && cacheTime && (Date.now() - cacheTime < CACHE_TTL)) {
    return cachedData;
  }

  try {
    const fileData = await githubRequest(`/contents/${DATA_FILE}?ref=${GITHUB_BRANCH}`);
    const content = Buffer.from(fileData.content, 'base64').toString('utf8');
    const data = JSON.parse(content);

    // Convert uniqueVisitors array back to Set
    data.uniqueVisitors = new Set(data.uniqueVisitors || []);

    cachedData = { ...data, _sha: fileData.sha };
    cacheTime = Date.now();
    return cachedData;
  } catch (error) {
    // File doesn't exist yet, create default
    if (error.status === 404) {
      const defaultData = {
        pageViews: {},
        uniqueVisitors: new Set(),
        referrers: {},
        browsers: {},
        createdAt: new Date().toISOString()
      };
      cachedData = defaultData;
      cacheTime = Date.now();
      return defaultData;
    }
    throw error;
  }
}

/**
 * Save analytics data to GitHub
 */
async function saveData(data) {
  // Convert Set to array for JSON serialization
  const dataToSave = {
    ...data,
    uniqueVisitors: Array.from(data.uniqueVisitors)
  };
  delete dataToSave._sha;

  const content = JSON.stringify(dataToSave, null, 2);
  const base64Content = Buffer.from(content).toString('base64');

  const payload = {
    message: 'Update analytics data',
    content: base64Content,
    branch: GITHUB_BRANCH
  };

  // Include SHA if updating existing file
  if (data._sha) {
    payload.sha = data._sha;
  }

  const result = await githubRequest(`/contents/${DATA_FILE}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: payload
  });

  // Update cache
  cachedData = { ...data, _sha: result.content.sha };
  cacheTime = Date.now();

  return result;
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
 * Track a page view
 */
async function trackPageView(trackData) {
  const { path, referrer, sessionId, userAgent } = trackData;

  const data = await loadData();

  // Track page view
  data.pageViews[path] = (data.pageViews[path] || 0) + 1;

  // Track unique visitor
  if (sessionId) {
    data.uniqueVisitors.add(sessionId);
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

  // Save to GitHub (async, don't wait)
  saveData(data).catch(err => console.error('Failed to save analytics:', err));

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
  const topReferrers = Object.entries(data.referrers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([referrer, count]) => ({ referrer, count }));

  // Get browser stats
  const browserStats = Object.entries(data.browsers)
    .sort((a, b) => b[1] - a[1])
    .map(([browser, count]) => ({ browser, count }));

  return {
    summary: {
      totalPageViews: Object.values(data.pageViews).reduce((sum, count) => sum + count, 0),
      uniqueVisitors: data.uniqueVisitors.size,
      totalPages: Object.keys(data.pageViews).length,
      lastReset: data.createdAt || new Date().toISOString()
    },
    topPages,
    topReferrers,
    browserStats
  };
}

/**
 * Purge all analytics data
 */
async function purgeData() {
  const newData = {
    pageViews: {},
    uniqueVisitors: new Set(),
    referrers: {},
    browsers: {},
    createdAt: new Date().toISOString()
  };

  // Get current SHA to update file
  const currentData = await loadData();
  newData._sha = currentData._sha;

  await saveData(newData);

  // Clear cache
  cachedData = null;
  cacheTime = null;

  return newData;
}

/**
 * Main handler function
 */
exports.handler = async (event, context) => {
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

      await trackPageView(trackData);

      return successResponse({ tracked: true });
    }

    // GET - Retrieve stats
    if (event.httpMethod === 'GET') {
      const data = await loadData();
      const stats = getStats(data);
      return successResponse(stats, 200, {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
    }

    // DELETE - Purge analytics data
    if (event.httpMethod === 'DELETE') {
      // Check for GitHub token
      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse('GITHUB_TOKEN environment variable is missing');
      }

      await purgeData();

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
};
