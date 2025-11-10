/**
 * Analytics Tracking Netlify Function
 *
 * Tracks page views, visitors, and referrers using localStorage for simple persistence.
 * Data is stored in memory and resets on function cold starts (suitable for basic tracking).
 * For production use, consider integrating with a database.
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
const {
  successResponse,
  methodNotAllowedResponse,
  serverErrorResponse,
  corsPreflightResponse
} = require('../utils/response-helpers.cjs');

// In-memory storage (resets on cold start - for demo/basic tracking)
// For production, you'd want to use a database like MongoDB, DynamoDB, or FaunaDB
let analyticsData = {
  pageViews: {}, // { '/path': count }
  uniqueVisitors: new Set(), // Set of session IDs
  referrers: {}, // { 'referrer': count }
  browsers: {}, // { 'browser': count }
  lastReset: new Date().toISOString()
};

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
function trackPageView(data) {
  const { path, referrer, sessionId, userAgent } = data;

  // Track page view
  analyticsData.pageViews[path] = (analyticsData.pageViews[path] || 0) + 1;

  // Track unique visitor
  if (sessionId) {
    analyticsData.uniqueVisitors.add(sessionId);
  }

  // Track referrer (only external)
  if (referrer && !referrer.includes('circleseven.co.uk')) {
    try {
      const refUrl = new URL(referrer);
      const refDomain = refUrl.hostname;
      analyticsData.referrers[refDomain] = (analyticsData.referrers[refDomain] || 0) + 1;
    } catch (e) {
      // Invalid URL, skip
    }
  }

  // Track browser
  const browser = parseBrowser(userAgent);
  analyticsData.browsers[browser] = (analyticsData.browsers[browser] || 0) + 1;
}

/**
 * Get analytics statistics
 */
function getStats() {
  // Get top pages
  const topPages = Object.entries(analyticsData.pageViews)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([path, views]) => ({ path, views }));

  // Get top referrers
  const topReferrers = Object.entries(analyticsData.referrers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([referrer, count]) => ({ referrer, count }));

  // Get browser stats
  const browserStats = Object.entries(analyticsData.browsers)
    .sort((a, b) => b[1] - a[1])
    .map(([browser, count]) => ({ browser, count }));

  return {
    summary: {
      totalPageViews: Object.values(analyticsData.pageViews).reduce((sum, count) => sum + count, 0),
      uniqueVisitors: analyticsData.uniqueVisitors.size,
      totalPages: Object.keys(analyticsData.pageViews).length,
      lastReset: analyticsData.lastReset
    },
    topPages,
    topReferrers,
    browserStats
  };
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
      let data;
      try {
        data = JSON.parse(event.body);
      } catch (error) {
        return {
          statusCode: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          },
          body: JSON.stringify({ error: 'Invalid JSON' })
        };
      }

      trackPageView(data);

      return successResponse({ tracked: true });
    }

    // GET - Retrieve stats
    if (event.httpMethod === 'GET') {
      const stats = getStats();
      return successResponse(stats, 200, {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
    }

    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
};
