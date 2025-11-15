/**
 * Response Helpers Utility
 *
 * Provides standardized response builders for Netlify functions.
 * Ensures consistent response format across all API endpoints for both
 * success and error responses.
 *
 * @module netlify/utils/response-helpers
 */

/**
 * Standard CORS headers for all responses
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json'
};

/**
 * Creates a standardized success response
 *
 * @param {Object} data - Response data to send to client
 * @param {number} [statusCode=200] - HTTP status code
 * @param {Object} [additionalHeaders={}] - Additional headers to merge
 * @returns {Object} Netlify function response object
 *
 * @example
 * return successResponse({ posts: [...] });
 *
 * @example
 * return successResponse({ message: 'Created successfully' }, 201);
 */
export function successResponse(data, statusCode = 200, additionalHeaders = {}) {
  return {
    statusCode,
    headers: { ...CORS_HEADERS, ...additionalHeaders },
    body: JSON.stringify(data)
  };
}

/**
 * Creates a standardized error response
 *
 * @param {string} error - Short error identifier (e.g., 'Invalid JSON', 'Method not allowed')
 * @param {string} message - Detailed error message for the user
 * @param {number} [statusCode=400] - HTTP status code
 * @param {Object} [additionalData={}] - Additional error context data
 * @returns {Object} Netlify function response object
 *
 * @example
 * return errorResponse('Invalid JSON', 'Request body must be valid JSON', 400);
 *
 * @example
 * return errorResponse('Validation failed', 'Email is required', 400, { field: 'email' });
 */
export function errorResponse(error, message, statusCode = 400, additionalData = {}) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify({
      error,
      message,
      ...additionalData
    })
  };
}

/**
 * Creates a 400 Bad Request response
 *
 * @param {string} message - Error message
 * @param {Object} [additionalData={}] - Additional error context
 * @returns {Object} Netlify function response object
 *
 * @example
 * return badRequestResponse('Missing required field: email');
 */
export function badRequestResponse(message, additionalData = {}) {
  return errorResponse('Bad Request', message, 400, additionalData);
}

/**
 * Creates a 404 Not Found response
 *
 * @param {string} [message='Resource not found'] - Error message
 * @returns {Object} Netlify function response object
 *
 * @example
 * return notFoundResponse('Post not found');
 */
export function notFoundResponse(message = 'Resource not found') {
  return errorResponse('Not Found', message, 404);
}

/**
 * Creates a 405 Method Not Allowed response
 *
 * @returns {Object} Netlify function response object
 *
 * @example
 * return methodNotAllowedResponse();
 */
export function methodNotAllowedResponse() {
  return errorResponse('Method not allowed', 'The requested HTTP method is not supported for this endpoint', 405);
}

/**
 * Creates a 409 Conflict response
 *
 * @param {string} message - Error message
 * @returns {Object} Netlify function response object
 *
 * @example
 * return conflictResponse('File already exists');
 */
export function conflictResponse(message) {
  return errorResponse('Conflict', message, 409);
}

/**
 * Creates a 500 Internal Server Error response
 *
 * @param {Error|string} error - Error object or message
 * @param {Object} [options={}] - Additional options
 * @param {boolean} [options.includeStack=false] - Whether to include stack trace
 * @returns {Object} Netlify function response object
 *
 * @example
 * return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
 */
export function serverErrorResponse(error, options = {}) {
  const { includeStack = false } = options;
  const message = error instanceof Error ? error.message : error;
  const additionalData = {};

  if (includeStack && error instanceof Error) {
    additionalData.stack = error.stack;
    additionalData.details = error.toString();
  }

  return errorResponse('Internal server error', message, 500, additionalData);
}

/**
 * Creates a 503 Service Unavailable response
 *
 * @param {string} message - Error message
 * @returns {Object} Netlify function response object
 *
 * @example
 * return serviceUnavailableResponse('GitHub integration not configured');
 */
export function serviceUnavailableResponse(message) {
  return errorResponse('Service unavailable', message, 503);
}

/**
 * Creates a 200 OK CORS preflight response
 *
 * @returns {Object} Netlify function response object
 *
 * @example
 * if (event.httpMethod === 'OPTIONS') {
 *   return corsPreflightResponse();
 * }
 */
export function corsPreflightResponse() {
  return {
    statusCode: 200,
    headers: CORS_HEADERS,
    body: ''
  };
}
