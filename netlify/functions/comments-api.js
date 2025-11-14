/**
 * Comments API - Serves comments from Netlify Blobs
 *
 * GET /comments?postSlug={slug} - Returns approved comments for a post
 */

const { getApprovedComments } = require('../utils/comments-blobs.cjs');
const {
  successResponse,
  methodNotAllowedResponse,
  serverErrorResponse,
  corsPreflightResponse
} = require('../utils/response-helpers.cjs');

exports.handler = async (event, context) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsPreflightResponse();
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return methodNotAllowedResponse();
  }

  try {
    const postSlug = event.queryStringParameters?.postSlug;

    if (!postSlug) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'postSlug query parameter is required'
        })
      };
    }

    // Fetch approved comments for this post
    const comments = await getApprovedComments(postSlug);

    return successResponse({
      postSlug,
      count: comments.length,
      comments
    }, 200, {
      'Cache-Control': 'public, max-age=60' // Cache for 1 minute
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return serverErrorResponse(error);
  }
};
