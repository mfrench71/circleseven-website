/**
 * Comments Moderation Netlify Function
 *
 * Handles approval and rejection of comments stored in Netlify Blobs.
 * Uses Functions v2 format for Blobs support with Web Request/Response API.
 *
 * @module netlify/functions/comments-moderate
 */

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'comments';

function getCommentsStore() {
  return getStore(STORE_NAME);
}

// ===== Blobs Utilities (inlined) =====

async function getPendingComments() {
  const store = getCommentsStore();

  try {
    const pendingList = await store.get('pending-comments', { type: 'json' }) || [];
    const comments = await Promise.all(
      pendingList.map(async ({ id, postSlug }) => {
        try {
          const comment = await store.get(postSlug + '/' + id, { type: 'json' });
          return comment;
        } catch (error) {
          console.warn('Failed to load comment ' + id + ':', error.message);
          return null;
        }
      })
    );
    return comments.filter(c => c !== null);
  } catch (error) {
    console.error('Error getting pending comments:', error);
    return [];
  }
}

async function approveComment(commentId, postSlug) {
  const store = getCommentsStore();
  const key = postSlug + '/' + commentId;

  const comment = await store.get(key, { type: 'json' });
  if (!comment) {
    throw new Error('Comment not found');
  }

  comment.approved = true;
  comment.approvedAt = new Date().toISOString();

  await store.setJSON(key, comment);
  await removeFromPendingList(commentId, postSlug);
  await addToApprovedList(commentId, postSlug);

  return comment;
}

async function deleteComment(commentId, postSlug) {
  const store = getCommentsStore();
  const key = postSlug + '/' + commentId;

  await store.delete(key);
  await removeFromPendingList(commentId, postSlug);
  await removeFromApprovedList(commentId, postSlug);
}

async function removeFromPendingList(commentId, postSlug) {
  const store = getCommentsStore();
  const pendingList = await store.get('pending-comments', { type: 'json' }) || [];
  const updated = pendingList.filter(item => item.id !== commentId);
  await store.setJSON('pending-comments', updated);
}

async function addToApprovedList(commentId, postSlug) {
  const store = getCommentsStore();
  const key = 'approved-comments-' + postSlug;
  const approvedList = await store.get(key, { type: 'json' }) || [];
  if (!approvedList.includes(commentId)) {
    approvedList.push(commentId);
    await store.setJSON(key, approvedList);
  }
}

async function removeFromApprovedList(commentId, postSlug) {
  const store = getCommentsStore();
  const key = 'approved-comments-' + postSlug;
  const approvedList = await store.get(key, { type: 'json' }) || [];
  const updated = approvedList.filter(id => id !== commentId);
  await store.setJSON(key, updated);
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
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

// ===== Rate Limiting (inlined) =====

const requestCounts = new Map();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60000; // 1 minute

function checkRateLimit(request) {
  const clientIP = request.headers.get('x-nf-client-connection-ip') ||
                   request.headers.get('client-ip') ||
                   'unknown';
  const now = Date.now();

  if (!requestCounts.has(clientIP)) {
    requestCounts.set(clientIP, []);
  }

  const requests = requestCounts.get(clientIP).filter(time => now - time < RATE_WINDOW);
  requests.push(now);
  requestCounts.set(clientIP, requests);

  if (requests.length > RATE_LIMIT) {
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

  // Check rate limit
  const rateLimitResponse = checkRateLimit(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // GET - List pending comments
    if (method === 'GET') {
      const pendingComments = await getPendingComments();

      return successResponse({
        comments: pendingComments,
        count: pendingComments.length
      }, 200, {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
    }

    // POST - Approve or reject comment
    if (method === 'POST') {
      let data;
      try {
        const body = await request.text();
        data = JSON.parse(body);
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
}
