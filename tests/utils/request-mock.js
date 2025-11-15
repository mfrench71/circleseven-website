/**
 * Mock Request object for testing Netlify Functions v2
 * Converts v1-style event objects to v2-style request objects
 */

/**
 * Creates a mock Request object compatible with Netlify Functions v2
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {string} [body] - Request body (for POST/PUT)
 * @param {Object} [headers] - Request headers
 * @param {Object} [queryParams] - Query parameters
 * @returns {Object} Mock request object
 */
export function createMockRequest(method, body = null, headers = {}, queryParams = {}) {
  // Build URL with query parameters
  let url = 'http://localhost/.netlify/functions/test';
  if (queryParams && Object.keys(queryParams).length > 0) {
    const searchParams = new URLSearchParams(queryParams);
    url += '?' + searchParams.toString();
  }

  return {
    method,
    url,
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
    event.headers || {},
    event.queryStringParameters || {}
  );
}

/**
 * Wrapper to call v2 handlers with v1 event syntax
 * Converts Response objects back to v1 format for test compatibility
 * @param {Function} handler - v2 handler function
 * @param {Object} event - v1-style event object
 * @param {Object} [context] - Function context
 * @returns {Promise<Object>} Handler response in v1 format
 */
export async function callV2Handler(handler, event, context = {}) {
  const request = eventToRequest(event);
  const response = await handler(request, context);

  // Convert Response object to v1 format
  if (response instanceof Response) {
    const body = await response.text();
    const headers = {};
    // Use for-of loop to iterate headers (they're automatically lowercased)
    for (const [key, value] of response.headers) {
      // Store with original casing for test compatibility
      // Map common headers to expected casing
      const originalKey = key === 'access-control-allow-origin' ? 'Access-Control-Allow-Origin' :
                         key === 'access-control-allow-headers' ? 'Access-Control-Allow-Headers' :
                         key === 'access-control-allow-methods' ? 'Access-Control-Allow-Methods' :
                         key === 'content-type' ? 'Content-Type' :
                         key;
      headers[originalKey] = value;
    }
    return {
      statusCode: response.status,
      headers: headers,
      body: body
    };
  }

  // Already in v1 format (shouldn't happen with v2 functions)
  return response;
}
