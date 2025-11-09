/**
 * Cloudinary Folders Netlify Function
 *
 * Provides read-only access to Cloudinary folder list.
 * Fetches folder structure from Cloudinary Admin API for use in settings dropdown.
 *
 * Security: Uses Basic Authentication with API Key and Secret.
 * Only GET requests are allowed.
 *
 * Supported operations:
 * - GET: Retrieve list of folders from Cloudinary
 *
 * @module netlify/functions/cloudinary-folders
 */

const https = require('https');
const {
  successResponse,
  methodNotAllowedResponse,
  serverErrorResponse,
  corsPreflightResponse
} = require('../utils/response-helpers.cjs');

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'circleseven';
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Check for required environment variables
if (!CLOUDINARY_API_KEY) {
  console.error('CLOUDINARY_API_KEY environment variable is not set');
}
if (!CLOUDINARY_API_SECRET) {
  console.error('CLOUDINARY_API_SECRET environment variable is not set');
}

/**
 * Netlify Function Handler - Cloudinary Folders
 *
 * Main entry point for fetching folder list from Cloudinary.
 * Returns a list of all folders in the Cloudinary account.
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP method (GET, OPTIONS)
 * @param {Object} context - Netlify function context
 * @returns {Promise<Object>} Response object with statusCode, headers, and body
 *
 * @example
 * // GET folders
 * // GET /.netlify/functions/cloudinary-folders
 * // Returns: {
 * //   folders: [
 * //     { name: "circle-seven", path: "circle-seven" },
 * //     { name: "blog", path: "blog" },
 * //     ...
 * //   ]
 * // }
 */
export const handler = async (event, context) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsPreflightResponse();
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return methodNotAllowedResponse();
  }

  try {
    // Check if API credentials are configured
    if (!CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return serverErrorResponse('CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET environment variables must be set. Please add them to Netlify environment variables.');
    }

    // Fetch folders from Cloudinary Admin API
    const folders = await fetchCloudinaryFolders();

    return successResponse({
      folders: folders
    });
  } catch (error) {
    console.error('Cloudinary folders error:', error);
    return serverErrorResponse(error, { includeStack: true });
  }
};

/**
 * Fetches folder list from Cloudinary Admin API
 *
 * Makes authenticated request to Cloudinary using Basic Auth.
 * Retrieves list of all folders in the Cloudinary account.
 *
 * @returns {Promise<Array>} Array of folder objects with name and path
 * @throws {Error} If Cloudinary API request fails or response cannot be parsed
 *
 * @example
 * const folders = await fetchCloudinaryFolders();
 * // Returns: [{
 * //   name: "circle-seven",
 * //   path: "circle-seven"
 * // }, ...]
 */
function fetchCloudinaryFolders() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');

    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUDINARY_CLOUD_NAME}/folders`,
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
            // Extract folder paths from the response
            // Cloudinary returns { folders: [ { name: "folder1", path: "folder1" }, ... ] }
            resolve(parsed.folders || []);
          } catch (error) {
            reject(new Error('Failed to parse Cloudinary response'));
          }
        } else {
          reject(new Error(`Cloudinary API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}
