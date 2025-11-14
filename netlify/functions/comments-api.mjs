/**
 * Comments API - Serves comments from Netlify Blobs
 *
 * GET /comments?postSlug={slug} - Returns approved comments for a post
 * Uses Functions v2 format for Blobs support with Web Request/Response API.
 */

import { getStore } from '@netlify/blobs';

const STORE_NAME = 'comments';

function getCommentsStore() {
  return getStore(STORE_NAME);
}

// ===== Blobs Utilities (inlined) =====

async function getApprovedComments(postSlug) {
  const store = getCommentsStore();

  try {
    const approvedList = await store.get('approved-comments-' + postSlug, { type: 'json' }) || [];
    const comments = await Promise.all(
      approvedList.map(async (id) => {
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
    console.error('Error getting approved comments for ' + postSlug + ':', error);
    return [];
  }
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS'
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

  // Only allow GET requests
  if (method !== 'GET') {
    return methodNotAllowedResponse();
  }

  try {
    const url = new URL(request.url);
    const postSlug = url.searchParams.get('postSlug');

    if (!postSlug) {
      return badRequestResponse('postSlug query parameter is required');
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
}
