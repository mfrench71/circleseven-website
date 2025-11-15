/**
 * Mock Request object for testing Netlify Functions v2
 * Converts v1-style event objects to v2-style request objects
 */

/**
 * Creates a mock Request object compatible with Netlify Functions v2
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {string} [body] - Request body (for POST/PUT)
 * @param {Object} [headers] - Request headers
 * @returns {Object} Mock request object
 */
export function createMockRequest(method, body = null, headers = {}) {
  return {
    method,
    url: 'http://localhost/.netlify/functions/test',
    headers: {
      get: (name) => headers[name] || null,
      ...headers
    },
    async text() {
      return body || '';
    },
    async json() {
      return body ? JSON.parse(body) : {};
    }
  };
}

/**
 * Converts a v1 event object to a v2 request object
 * @param {Object} event - Netlify Functions v1 event object
 * @returns {Object} Mock request object for v2 functions
 */
export function eventToRequest(event) {
  return createMockRequest(
    event.httpMethod,
    event.body || null,
    event.headers || {}
  );
}

/**
 * Wrapper to call v2 handlers with v1 event syntax
 * @param {Function} handler - v2 handler function
 * @param {Object} event - v1-style event object
 * @param {Object} [context] - Function context
 * @returns {Promise<Object>} Handler response
 */
export async function callV2Handler(handler, event, context = {}) {
  const request = eventToRequest(event);
  return await handler(request, context);
}
