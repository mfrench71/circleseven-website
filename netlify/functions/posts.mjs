/**
 * Posts Management Netlify Function
 *
 * Provides CRUD operations for Jekyll page files stored in the _posts directory.
 * Integrates with GitHub API to manage page markdown files with frontmatter.
 *
 * Supported operations:
 * - GET: List all posts or retrieve a single page with frontmatter and body
 * - POST: Create a new page
 * - PUT: Update an existing page
 * - DELETE: Remove a page
 *
 * @module netlify/functions/posts
 */

import { getStore } from '@netlify/blobs';
import { postsSchemas, validate, formatValidationError } from '../utils/validation-schemas.mjs';
import { githubRequest, GITHUB_BRANCH } from '../utils/github-api.mjs';
import { parseFrontmatter, buildFrontmatter } from '../utils/frontmatter.mjs';
import {
  successResponse,
  badRequestResponse,
  methodNotAllowedResponse,
  serviceUnavailableResponse,
  serverErrorResponse,
  corsPreflightResponse
} from '../utils/response-helpers.mjs';

const POSTS_DIR = '_posts';
const BLOB_CACHE_KEY = 'posts-list.json';
const CACHE_TTL_HOURS = 1; // Cache for 1 hour (posts change more frequently)

/**
 * Reads posts list from Blob cache
 */
async function readPostsFromBlob() {
  try {
    const store = getStore('cache');
    const cached = await store.get(BLOB_CACHE_KEY, { type: 'json' });

    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    const cacheAge = Date.now() - cached.timestamp;
    const maxAge = CACHE_TTL_HOURS * 60 * 60 * 1000;

    if (cacheAge > maxAge) {
      console.log('[Posts] Blob cache expired');
      return null;
    }

    console.log('[Posts] Serving from Blob cache');
    return cached.data;
  } catch (error) {
    console.error('[Posts] Error reading from Blob:', error);
    return null;
  }
}

/**
 * Writes posts list to Blob cache
 */
async function writePostsToBlob(postsData) {
  try {
    const store = getStore('cache');
    await store.setJSON(BLOB_CACHE_KEY, {
      timestamp: Date.now(),
      data: postsData
    });
    console.log('[Posts] Written to Blob cache');
  } catch (error) {
    console.error('[Posts] Error writing to Blob:', error);
  }
}

/**
 * Netlify Function Handler - Posts Management
 *
 * Main entry point for the posts management function. Handles all CRUD operations
 * for Jekyll page files via REST API.
 *
 * @param {Request} request - Netlify Functions v2 request object
 * @param {Object} context - Netlify function context
 * @returns {Promise<Response>} Web standard Response object
 */
export default async function handler(request, context) {
  const method = request.method;

  // Handle preflight requests
  if (method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // GET - List all posts or get single page
    if (method === 'GET') {
      const url = new URL(request.url);
      const pathParam = url.searchParams.get('path');
      const withMetadata = url.searchParams.get('metadata') === 'true';

      // Validate query parameters
      const queryValidation = validate(postsSchemas.getQuery, Object.fromEntries(url.searchParams));
      if (!queryValidation.success) {
        const formatted = formatValidationError(queryValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      if (pathParam) {
        // Get single page with frontmatter and body
        const fileData = await githubRequest(`/contents/${POSTS_DIR}/${pathParam}?ref=${GITHUB_BRANCH}`);
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        const { frontmatter, body } = parseFrontmatter(content);

        return successResponse({
          path: pathParam,
          frontmatter,
          body,
          sha: fileData.sha
        });
      } else {
        // Try Blob cache first for list requests without metadata
        if (!withMetadata) {
          const cachedPosts = await readPostsFromBlob();
          if (cachedPosts) {
            return successResponse({ posts: cachedPosts });
          }
        }

        // Cache miss or metadata requested - read from GitHub
        console.log('[Posts] Cache miss or metadata requested, reading from GitHub');
        const files = await githubRequest(`/contents/${POSTS_DIR}?ref=${GITHUB_BRANCH}`);

        // Filter to only .md files
        let posts = files
          .filter(file => file.name.endsWith('.md'))
          .map(file => ({
            name: file.name,
            path: file.path,
            sha: file.sha,
            size: file.size
          }));

        // If metadata requested, fetch frontmatter for each page (no body to save bandwidth)
        if (withMetadata) {
          const postsWithMetadata = await Promise.all(
            posts.map(async (page) => {
              try {
                const fileData = await githubRequest(`/contents/${POSTS_DIR}/${page.name}?ref=${GITHUB_BRANCH}`);
                const content = Buffer.from(fileData.content, 'base64').toString('utf8');
                const { frontmatter } = parseFrontmatter(content);

                return {
                  ...page,
                  frontmatter
                };
              } catch (error) {
                console.error(`Failed to load metadata for ${page.name}:`, error);
                // Return page without metadata if it fails
                return page;
              }
            })
          );

          posts = postsWithMetadata;
        } else {
          // Write to Blob cache only for list without metadata
          await writePostsToBlob(posts);
        }

        return successResponse({ posts });
      }
    }

    // PUT - Update existing page
    if (method === 'PUT') {
      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse('GITHUB_TOKEN environment variable is missing');
      }

      // Parse and validate request body
      let requestData;
      try {
        const body = await request.text();
        requestData = JSON.parse(body);
      } catch (error) {
        return badRequestResponse('Request body must be valid JSON');
      }

      const bodyValidation = validate(postsSchemas.update, requestData);
      if (!bodyValidation.success) {
        const formatted = formatValidationError(bodyValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      const { path, frontmatter, body, sha } = bodyValidation.data;

      // Auto-update last_modified_at with current timestamp
      const now = new Date();
      const timezoneOffset = now.getTimezoneOffset();
      const localDate = new Date(now.getTime() - (timezoneOffset * 60 * 1000));
      frontmatter.last_modified_at = localDate.toISOString().slice(0, 19).replace('T', ' ');

      // Build complete markdown content
      const content = buildFrontmatter(frontmatter) + '\n' + body;

      // Update file via GitHub API
      const updateResponse = await githubRequest(`/contents/${POSTS_DIR}/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Update post: ${path}`,
          content: Buffer.from(content).toString('base64'),
          sha: sha,
          branch: GITHUB_BRANCH
        }
      });

      // Invalidate cache by deleting the Blob
      try {
        const store = getStore('cache');
        await store.delete(BLOB_CACHE_KEY);
        console.log('[Posts] Cache invalidated after update');
      } catch (error) {
        console.error('[Posts] Error invalidating cache:', error);
      }

      return successResponse({
        success: true,
        message: 'Post updated successfully',
        commitSha: updateResponse.commit?.sha
      });
    }

    // POST - Create new page
    if (method === 'POST') {
      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse('GITHUB_TOKEN environment variable is missing');
      }

      // Parse and validate request body
      let requestData;
      try {
        const body = await request.text();
        requestData = JSON.parse(body);
      } catch (error) {
        return badRequestResponse('Request body must be valid JSON');
      }

      const bodyValidation = validate(postsSchemas.create, requestData);
      if (!bodyValidation.success) {
        const formatted = formatValidationError(bodyValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      const { filename, frontmatter, body } = bodyValidation.data;

      // Auto-set last_modified_at to match published date for new posts
      // Parse the date field and use it as the initial last_modified_at
      if (frontmatter.date) {
        const publishedDate = new Date(frontmatter.date);
        frontmatter.last_modified_at = publishedDate.toISOString().slice(0, 19).replace('T', ' ');
      } else {
        // Fallback to current time if no date field exists
        const now = new Date();
        const timezoneOffset = now.getTimezoneOffset();
        const localDate = new Date(now.getTime() - (timezoneOffset * 60 * 1000));
        frontmatter.last_modified_at = localDate.toISOString().slice(0, 19).replace('T', ' ');
      }

      // Build complete markdown content
      const content = buildFrontmatter(frontmatter) + '\n' + body;

      // Create file via GitHub API
      const createResponse = await githubRequest(`/contents/${POSTS_DIR}/${filename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Create post: ${filename}`,
          content: Buffer.from(content).toString('base64'),
          branch: GITHUB_BRANCH
        }
      });

      // Invalidate cache by deleting the Blob
      try {
        const store = getStore('cache');
        await store.delete(BLOB_CACHE_KEY);
        console.log('[Posts] Cache invalidated after create');
      } catch (error) {
        console.error('[Posts] Error invalidating cache:', error);
      }

      return successResponse({
        success: true,
        message: 'Post created successfully',
        commitSha: createResponse.commit?.sha
      }, 201);
    }

    // DELETE - Delete page
    if (method === 'DELETE') {
      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse('GITHUB_TOKEN environment variable is missing');
      }

      // Parse and validate request body
      let requestData;
      try {
        const body = await request.text();
        requestData = JSON.parse(body);
      } catch (error) {
        return badRequestResponse('Request body must be valid JSON');
      }

      const bodyValidation = validate(postsSchemas.delete, requestData);
      if (!bodyValidation.success) {
        const formatted = formatValidationError(bodyValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      const { path, sha } = bodyValidation.data;

      // Delete file via GitHub API
      const deleteResponse = await githubRequest(`/contents/${POSTS_DIR}/${path}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Delete page: ${path}`,
          sha: sha,
          branch: GITHUB_BRANCH
        }
      });

      // Invalidate cache by deleting the Blob
      try {
        const store = getStore('cache');
        await store.delete(BLOB_CACHE_KEY);
        console.log('[Posts] Cache invalidated after delete');
      } catch (error) {
        console.error('[Posts] Error invalidating cache:', error);
      }

      return successResponse({
        success: true,
        message: 'Post deleted successfully',
        commitSha: deleteResponse.commit?.sha
      });
    }

    // Method not allowed
    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Posts function error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
}
