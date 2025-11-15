/**
 * Rate Limiting Utility for Netlify Functions
 *
 * Provides simple in-memory rate limiting to prevent API abuse.
 * Uses IP-based tracking with configurable limits and time windows.
 *
 * Note: This is a simple implementation suitable for single-instance deployments.
 * For production at scale, consider using Redis or a distributed rate limiting service.
 *
 * @module netlify/utils/rate-limiter
 */

/**
 * In-memory store for tracking request counts per IP
 * Structure: { 'ip-address': { count: number, resetTime: number } }
 */
const requestCounts = new Map();

/**
 * Default rate limit configuration
 */
const DEFAULT_CONFIG = {
  maxRequests: 100,        // Maximum requests per window
  windowMs: 60 * 1000,     // Time window in milliseconds (1 minute)
  message: 'Too many requests, please try again later.'
};

/**
 * Cleans up expired entries from the request count store
 * Runs periodically to prevent memory leaks
 */
function cleanup() {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (data.resetTime < now) {
      requestCounts.delete(ip);
    }
  }
}

// Run cleanup every 5 minutes
setInterval(cleanup, 5 * 60 * 1000);

/**
 * Extracts client IP address from Netlify event or request
 *
 * @param {Object} eventOrRequest - Netlify function event object (v1) or Request object (v2)
 * @returns {string} Client IP address
 */
function getClientIp(eventOrRequest) {
  // Handle v2 Request objects
  if (eventOrRequest && eventOrRequest.headers && typeof eventOrRequest.headers.get === 'function') {
    return eventOrRequest.headers.get('client-ip') ||
           eventOrRequest.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
           eventOrRequest.headers.get('x-real-ip') ||
           'unknown';
  }

  // Handle v1 event objects
  if (!eventOrRequest || !eventOrRequest.headers) {
    return 'unknown';
  }

  return eventOrRequest.headers['client-ip'] ||
         eventOrRequest.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         eventOrRequest.headers['x-real-ip'] ||
         'unknown';
}

/**
 * Checks if a request should be rate limited
 *
 * @param {Object} eventOrRequest - Netlify function event object (v1) or Request object (v2)
 * @param {Object} [config={}] - Rate limit configuration
 * @param {number} [config.maxRequests=100] - Maximum requests per window
 * @param {number} [config.windowMs=60000] - Time window in milliseconds
 * @param {string} [config.message] - Custom error message
 * @returns {Object|null} Rate limit response object if limited, null if allowed
 *
 * @example
 * const rateLimitResponse = checkRateLimit(event, { maxRequests: 10, windowMs: 60000 });
 * if (rateLimitResponse) {
 *   return rateLimitResponse; // Return 429 Too Many Requests
 * }
 * // Continue with normal request handling
 */
export function checkRateLimit(eventOrRequest, config = {}) {
  const { maxRequests, windowMs, message } = { ...DEFAULT_CONFIG, ...config };
  const ip = getClientIp(eventOrRequest);
  const now = Date.now();

  // Get or create request data for this IP
  let requestData = requestCounts.get(ip);

  if (!requestData || requestData.resetTime < now) {
    // First request or window expired - start new window
    requestData = {
      count: 1,
      resetTime: now + windowMs
    };
    requestCounts.set(ip, requestData);
    return null; // Allow request
  }

  // Increment request count
  requestData.count++;

  if (requestData.count > maxRequests) {
    // Rate limit exceeded
    const resetIn = Math.ceil((requestData.resetTime - now) / 1000);

    return {
      statusCode: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': resetIn.toString(),
        'X-RateLimit-Limit': maxRequests.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': requestData.resetTime.toString()
      },
      body: JSON.stringify({
        error: 'Rate limit exceeded',
        message: message,
        retryAfter: resetIn,
        limit: maxRequests,
        window: windowMs / 1000
      })
    };
  }

  // Request allowed - update count
  requestCounts.set(ip, requestData);
  return null;
}

/**
 * Gets current rate limit status for a client without incrementing the counter
 *
 * @param {Object} eventOrRequest - Netlify function event object (v1) or Request object (v2)
 * @returns {Object} Rate limit status information
 */
export function getRateLimitStatus(eventOrRequest) {
  const ip = getClientIp(eventOrRequest);
  const requestData = requestCounts.get(ip);
  const now = Date.now();

  if (!requestData || requestData.resetTime < now) {
    return {
      limit: DEFAULT_CONFIG.maxRequests,
      remaining: DEFAULT_CONFIG.maxRequests,
      reset: now + DEFAULT_CONFIG.windowMs
    };
  }

  return {
    limit: DEFAULT_CONFIG.maxRequests,
    remaining: Math.max(0, DEFAULT_CONFIG.maxRequests - requestData.count),
    reset: requestData.resetTime
  };
}
