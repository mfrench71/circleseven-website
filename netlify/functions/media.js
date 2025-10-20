const https = require('https');

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'circleseven';
const CLOUDINARY_API_KEY = '732138267195618';
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Check for required environment variables
if (!CLOUDINARY_API_SECRET) {
  console.error('CLOUDINARY_API_SECRET environment variable is not set');
}

/**
 * Netlify Function: Media Library
 * Fetches media resources from Cloudinary
 */
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Check if API secret is configured
    if (!CLOUDINARY_API_SECRET) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Configuration error',
          message: 'CLOUDINARY_API_SECRET environment variable is not set. Please add it to Netlify environment variables.'
        })
      };
    }

    // Fetch resources from Cloudinary Admin API
    const resources = await fetchCloudinaryResources();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        resources: resources,
        total: resources.length
      })
    };
  } catch (error) {
    console.error('Media fetch error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch media',
        message: error.message,
        details: error.stack
      })
    };
  }
};

/**
 * Fetch resources from Cloudinary Admin API
 */
function fetchCloudinaryResources() {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${CLOUDINARY_API_KEY}:${CLOUDINARY_API_SECRET}`).toString('base64');

    const options = {
      hostname: 'api.cloudinary.com',
      path: `/v1_1/${CLOUDINARY_CLOUD_NAME}/resources/image?max_results=500`,
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
