/**
 * Comments Submission Netlify Function
 *
 * Accepts comment submissions and stores them in Netlify Blobs for moderation.
 * Uses Functions v2 format for Blobs support with Web Request/Response API.
 *
 * @module netlify/functions/comments-submit
 */

import { getStore } from '@netlify/blobs';
import { createHash } from 'crypto';

const STORE_NAME = 'comments';

// Email configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@circleseven.co.uk';
const FROM_EMAIL = process.env.FROM_EMAIL || 'onboarding@resend.dev';

function getCommentsStore() {
  return getStore(STORE_NAME);
}

// ===== Blobs Utilities (inlined) =====

function generateCommentId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6);
  return 'comment-' + timestamp + '-' + random;
}

async function createComment(commentData) {
  const store = getCommentsStore();
  const id = generateCommentId();

  const comment = {
    id,
    postSlug: commentData.postSlug,
    name: commentData.name,
    email: commentData.email,
    emailHash: commentData.emailHash,
    message: commentData.message,
    date: new Date().toISOString(),
    approved: false,
    createdAt: new Date().toISOString()
  };

  const key = commentData.postSlug + '/' + id;
  await store.setJSON(key, comment);
  await addToPendingList(id, commentData.postSlug);

  return comment;
}

async function addToPendingList(commentId, postSlug) {
  const store = getCommentsStore();
  const pendingList = await store.get('pending-comments', { type: 'json' }) || [];
  pendingList.push({ id: commentId, postSlug });
  await store.setJSON('pending-comments', pendingList);
}

// ===== Email Notification =====

/**
 * Send email notification to admin about new comment
 */
async function sendEmailNotification(comment) {
  // Skip if no API key configured
  if (!RESEND_API_KEY) {
    console.log('[Comments] Email notifications disabled - no RESEND_API_KEY configured');
    return;
  }

  try {
    const emailData = {
      from: `CircleSeven Comments <${FROM_EMAIL}>`,
      to: [ADMIN_EMAIL],
      subject: `New Comment on "${comment.postSlug}"`,
      html: `
        <h2>New Comment Awaiting Moderation</h2>
        <p><strong>Post:</strong> ${comment.postSlug}</p>
        <p><strong>Author:</strong> ${comment.name}</p>
        <p><strong>Email:</strong> ${comment.email}</p>
        <p><strong>Date:</strong> ${new Date(comment.date).toLocaleString()}</p>
        <hr>
        <p><strong>Message:</strong></p>
        <p>${comment.message.replace(/\n/g, '<br>')}</p>
        <hr>
        <p><a href="https://circleseven.co.uk/admin/comments/">Moderate Comments</a></p>
      `
    };

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailData)
    });

    if (response.ok) {
      console.log(`[Comments] Email notification sent for comment ${comment.id}`);
    } else {
      const error = await response.text();
      console.error('[Comments] Failed to send email:', response.status, error);
    }
  } catch (error) {
    // Don't fail the request if email fails - just log it
    console.error('[Comments] Email notification error:', error.message);
  }
}

// ===== Validation & Sanitization =====

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
  return createHash('md5')
    .update(email.toLowerCase().trim())
    .digest('hex');
}

// ===== Response Helpers (Functions v2 format) =====

function successResponse(data, statusCode = 200, additionalHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...additionalHeaders
    }
  });
}

function methodNotAllowedResponse() {
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function serverErrorResponse(error, options = {}) {
  return new Response(JSON.stringify({
    error: 'Internal server error',
    message: error.message,
    ...(options.includeStack && { stack: error.stack })
  }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

function corsPreflightResponse() {
  return new Response('', {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
  });
}

function badRequestResponse(message) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

// ===== Rate Limiting (inlined, stricter for submissions) =====

const requestCounts = new Map();

function checkRateLimit(request, options = {}) {
  const limit = options.limit || 5; // Default: 5 per 5 minutes
  const window = (options.window || 300) * 1000; // Default: 300 seconds = 5 minutes

  const clientIP = request.headers.get('x-nf-client-connection-ip') ||
                   request.headers.get('client-ip') ||
                   'unknown';
  const now = Date.now();

  if (!requestCounts.has(clientIP)) {
    requestCounts.set(clientIP, []);
  }

  const requests = requestCounts.get(clientIP).filter(time => now - time < window);
  requests.push(now);
  requestCounts.set(clientIP, requests);

  if (requests.length > limit) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  return null;
}

// ===== Main Handler (Functions v2) =====

/**
 * Main handler function
 * Using Functions v2 format for Blobs support with Web Request API
 */
export default async function handler(request, context) {
  const method = request.method;

  // Handle preflight
  if (method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  // Only allow POST
  if (method !== 'POST') {
    return methodNotAllowedResponse();
  }

  // Check rate limit (stricter for comment submissions)
  const rateLimitResponse = checkRateLimit(request, { limit: 5, window: 300 }); // 5 per 5 minutes
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Parse request body
    let data;
    try {
      const body = await request.text();
      data = JSON.parse(body);
    } catch (error) {
      return badRequestResponse('Invalid JSON');
    }

    // Validate required fields
    const { postSlug, name, email, message, replyTo, website } = data;

    // Honeypot check - 'website' field should be empty (bots fill it, humans don't see it)
    if (website) {
      console.log('[Comments] Honeypot triggered - spam detected');
      // Return success to fool bots, but don't actually store the comment
      return successResponse({
        success: true,
        message: 'Comment submitted successfully and is awaiting moderation',
        commentId: 'spam-' + Date.now()
      }, 201);
    }

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

    // Send email notification (must await to ensure it completes before function terminates)
    await sendEmailNotification(comment);

    return successResponse({
      success: true,
      message: 'Comment submitted successfully and is awaiting moderation',
      commentId: comment.id
    }, 201);

  } catch (error) {
    console.error('Comment submission error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
}
