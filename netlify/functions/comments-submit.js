/**
 * Comments Submission Netlify Function
 *
 * Accepts comment submissions and stores them in Netlify Blobs for moderation.
 *
 * @module netlify/functions/comments-submit
 */

const { checkRateLimit } = require('../utils/rate-limiter.cjs');
const { createComment } = require('../utils/comments-blobs.cjs');
const {
  successResponse,
  methodNotAllowedResponse,
  serverErrorResponse,
  corsPreflightResponse,
  badRequestResponse
} = require('../utils/response-helpers.cjs');

/**
 * Sanitize comment text to prevent XSS
 */
function sanitizeComment(text) {
  if (!text) return '';

  // Remove script tags and event handlers
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .trim();
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Hash email for Gravatar (MD5)
 */
function hashEmail(email) {
  return require('crypto')
    .createHash('md5')
    .update(email.toLowerCase().trim())
    .digest('hex');
}

/**
 * Main handler function
 */
exports.handler = async (event, context) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsPreflightResponse();
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return methodNotAllowedResponse();
  }

  // Check rate limit (stricter for comment submissions)
  const rateLimitResponse = checkRateLimit(event, { limit: 5, window: 300 }); // 5 per 5 minutes
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Parse request body
    let data;
    try {
      data = JSON.parse(event.body);
    } catch (error) {
      return badRequestResponse('Invalid JSON');
    }

    // Validate required fields
    const { postSlug, name, email, message, replyTo } = data;

    if (!postSlug || !name || !email || !message) {
      return badRequestResponse('Missing required fields: postSlug, name, email, message');
    }

    // Validate post slug format
    if (!/^[a-z0-9-]+$/.test(postSlug)) {
      return badRequestResponse('Invalid post slug format');
    }

    // Validate name length
    if (name.length < 2 || name.length > 100) {
      return badRequestResponse('Name must be between 2 and 100 characters');
    }

    // Validate email
    if (!isValidEmail(email)) {
      return badRequestResponse('Invalid email address');
    }

    // Validate message length
    if (message.length < 10 || message.length > 5000) {
      return badRequestResponse('Comment must be between 10 and 5000 characters');
    }

    // Prepare comment data
    const commentData = {
      postSlug: postSlug.toLowerCase().trim(),
      name: sanitizeComment(name),
      email: email.toLowerCase().trim(),
      emailHash: hashEmail(email),
      message: sanitizeComment(message),
      replyTo: replyTo ? sanitizeComment(replyTo) : null
    };

    // Store comment in Netlify Blobs
    console.log(`[Comments] Storing comment by ${commentData.name} on ${commentData.postSlug}`);
    const comment = await createComment(commentData);

    console.log(`[Comments] Comment stored with ID: ${comment.id}`);

    return successResponse({
      success: true,
      message: 'Comment submitted successfully and is awaiting moderation',
      commentId: comment.id
    }, 201);

  } catch (error) {
    console.error('Comment submission error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
};
