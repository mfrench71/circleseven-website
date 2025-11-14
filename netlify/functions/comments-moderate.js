/**
 * Comments Moderation Netlify Function
 *
 * Handles approval and rejection of comments stored in Netlify Blobs.
 *
 * @module netlify/functions/comments-moderate
 */

const { checkRateLimit } = require('../utils/rate-limiter.cjs');
const {
  getPendingComments,
  approveComment,
  deleteComment
} = require('../utils/comments-blobs.cjs');
const {
  successResponse,
  methodNotAllowedResponse,
  serverErrorResponse,
  corsPreflightResponse,
  badRequestResponse
} = require('../utils/response-helpers.cjs');

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
    // GET - List pending comments
    if (event.httpMethod === 'GET') {
      const pendingComments = await getPendingComments();

      return successResponse({
        comments: pendingComments,
        count: pendingComments.length
      }, 200, {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
    }

    // POST - Approve or reject comment
    if (event.httpMethod === 'POST') {
      let data;
      try {
        data = JSON.parse(event.body);
      } catch (error) {
        return badRequestResponse('Invalid JSON');
      }

      const { action, commentId, postSlug } = data;

      if (!action || !commentId || !postSlug) {
        return badRequestResponse('Missing required fields: action, commentId, postSlug');
      }

      if (!['approve', 'reject'].includes(action)) {
        return badRequestResponse('Invalid action. Must be "approve" or "reject"');
      }

      let result;
      if (action === 'approve') {
        console.log(`[Comments] Approving comment ${commentId} on ${postSlug}`);
        const comment = await approveComment(commentId, postSlug);
        result = { comment };
      } else {
        console.log(`[Comments] Rejecting comment ${commentId} on ${postSlug}`);
        await deleteComment(commentId, postSlug);
        result = { commentId };
      }

      return successResponse({
        success: true,
        action,
        ...result
      });
    }

    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Comment moderation error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
};
