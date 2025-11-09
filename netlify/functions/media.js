/**
 * Media Library Netlify Function
 *
 * Provides read-only access to Cloudinary media library resources.
 * Fetches image metadata from Cloudinary Admin API for use in the media browser.
 *
 * Security: Uses Basic Authentication with API Key and Secret.
 * Only GET requests are allowed - no upload or delete operations.
 *
 * Supported operations:
 * - GET: Retrieve list of media resources from Cloudinary
 *
 * @module netlify/functions/media
 */

const https = require('https');
const { checkRateLimit } = require('../utils/rate-limiter.cjs');
const {
  successResponse,
  badRequestResponse,
  methodNotAllowedResponse,
  serviceUnavailableResponse,
  serverErrorResponse,
  corsPreflightResponse
} = require('../utils/response-helpers.cjs');

/**
 * Netlify Function Handler - Media Library
 *
 * Main entry point for media library access. Fetches media resources from
 * Cloudinary Admin API with pagination support (max 500 results).
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP method (GET, OPTIONS)
 * @param {Object} context - Netlify function context
 * @returns {Promise<Object>} Response object with statusCode, headers, and body
 *
 * @example
 * // GET media resources
 * // GET /.netlify/functions/media
 * // Returns: {
 * //   resources: [
 * //     {
 * //       public_id: "image1",
 * //       format: "jpg",
 * //       width: 1920,
 * //       height: 1080,
 * //       secure_url: "https://res.cloudinary.com/..."
 * //     },
 * //     ...
 * //   ],
 * //   total: 25
 * // }
 */
export const handler = async (event, context) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsPreflightResponse();
  }

  // Check rate limit
  const rateLimitResponse = checkRateLimit(event);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return methodNotAllowedResponse();
  }

  try {
    // Get env vars at runtime
    const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
    const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
    const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'circleseven';

    // Check if API credentials are configured
    if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return serverErrorResponse(new Error('Cloudinary API credentials are not configured. Please add them to Netlify environment variables.'));
    }

    // Fetch resources from Cloudinary Admin API
    const resources = await fetchCloudinaryResources(CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET);

    return successResponse({
      resources: resources,
      total: resources.length
    });
  } catch (error) {
    console.error('Media fetch error:', error);
    return serverErrorResponse(error, { includeStack: true });
  }
};

/**
 * Fetches media resources from Cloudinary Admin API
 *
 * Makes authenticated request to Cloudinary using Basic Auth.
 * Retrieves up to 500 image resources with metadata including URLs,
 * dimensions, format, and public IDs.
 *
 * @param {string} cloudName - Cloudinary cloud name
 * @param {string} apiKey - Cloudinary API key
 * @param {string} apiSecret - Cloudinary API secret
 * @returns {Promise<Array>} Array of Cloudinary resource objects
 * @throws {Error} If Cloudinary API request fails or response cannot be parsed
 *
 * @example
 * const resources = await fetchCloudinaryResources('mycloud', 'key', 'secret');
 * // Returns: [{
 * //   public_id: "sample",
 * //   format: "jpg",
 * //   version: 1234567890,
 * //   resource_type: "image",
 * //   type: "upload",
 * //   created_at: "2025-10-21T10:00:00Z",
 * //   bytes: 125000,
 * //   width: 1920,
 * //   height: 1080,
 * //   url: "http://...",
 * //   secure_url: "https://..."
 * // }, ...]
 */
function fetchCloudinaryResources(cloudName, apiKey, apiSecret) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');

    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${cloudName}/resources/image?max_results=500&type=upload`,
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed.resources || []);
          } catch (error) {
            reject(new Error('Failed to parse Cloudinary response'));
          }
        } else {
          reject(new Error(`Cloudinary API error: ${res.statusCode}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}
