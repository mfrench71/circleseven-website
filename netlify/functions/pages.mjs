/**
 * Pages Management Netlify Function
 *
 * Provides CRUD operations for Jekyll page files stored in the _pages directory.
 * Integrates with GitHub API to manage page markdown files with frontmatter.
 *
 * Supported operations:
 * - GET: List all pages or retrieve a single page with frontmatter and body
 * - POST: Create a new page
 * - PUT: Update an existing page
 * - DELETE: Remove a page
 *
 * @module netlify/functions/pages
 */

import { getStore } from '@netlify/blobs';
import { pagesSchemas, validate, formatValidationError } from '../utils/validation-schemas.mjs';
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

const PAGES_DIR = '_pages';
const BLOB_CACHE_KEY = 'pages-list.json';
const CACHE_TTL_HOURS = 1; // Cache for 1 hour (pages change more frequently)

/**
 * Reads pages list from Blob cache
 */
async function readPagesFromBlob() {
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
      console.log('[Pages] Blob cache expired');
      return null;
    }

    console.log('[Pages] Serving from Blob cache');
    return cached.data;
  } catch (error) {
    console.error('[Pages] Error reading from Blob:', error);
    return null;
  }
}

/**
 * Writes pages list to Blob cache
 */
async function writePagesToBlob(pagesData) {
  try {
    console.log(`[Pages] Attempting to write ${pagesData.length} pages to Blob cache with key: ${BLOB_CACHE_KEY}`);
    const store = getStore('cache');
    const payload = {
      timestamp: Date.now(),
      data: pagesData
    };
    const payloadSize = JSON.stringify(payload).length;
    console.log(`[Pages] Payload size: ${payloadSize} bytes`);

    await store.setJSON(BLOB_CACHE_KEY, payload);
    console.log('[Pages] ✓ Successfully written to Blob cache');
  } catch (error) {
    console.error('[Pages] ✗ Error writing to Blob:', error);
    console.error('[Pages] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  }
}

/**
 * Netlify Function Handler - Pages Management
 *
 * Main entry point for the pages management function. Handles all CRUD operations
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
    // GET - List all pages or get single page
    if (method === 'GET') {
      const url = new URL(request.url);
      const pathParam = url.searchParams.get('path');
      const withMetadata = url.searchParams.get('metadata') === 'true';

      // Validate query parameters
      const queryValidation = validate(pagesSchemas.getQuery, Object.fromEntries(url.searchParams));
      if (!queryValidation.success) {
        const formatted = formatValidationError(queryValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      if (pathParam) {
        // Get single page with frontmatter and body
        const fileData = await githubRequest(`/contents/${PAGES_DIR}/${pathParam}?ref=${GITHUB_BRANCH}`);
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
          const cachedPages = await readPagesFromBlob();
          if (cachedPages) {
            return successResponse({ pages: cachedPages });
          }
        }

        // Cache miss or metadata requested - read from GitHub
        console.log('[Pages] Cache miss or metadata requested, reading from GitHub');
        const files = await githubRequest(`/contents/${PAGES_DIR}?ref=${GITHUB_BRANCH}`);

        // Filter to only .md files
        let pages = files
          .filter(file => file.name.endsWith('.md'))
          .map(file => ({
            name: file.name,
            path: file.path,
            sha: file.sha,
            size: file.size
          }));

        // If metadata requested, fetch frontmatter for each page (no body to save bandwidth)
        if (withMetadata) {
          const pagesWithMetadata = await Promise.all(
            pages.map(async (page) => {
              try {
                const fileData = await githubRequest(`/contents/${PAGES_DIR}/${page.name}?ref=${GITHUB_BRANCH}`);
                const content = Buffer.from(fileData.content, 'base64').toString('utf8');
                const { frontmatter } = parseFrontmatter(content);

                // Extract title and url for menu system
                const title = frontmatter.title || page.name.replace('.md', '');
                const url = frontmatter.permalink || `/${page.name.replace('.md', '')}/`;

                return {
                  ...page,
                  frontmatter,
                  title,  // Add title field for menu system
                  url     // Add url field for menu system
                };
              } catch (error) {
                console.error(`Failed to load metadata for ${page.name}:`, error);
                // Return page without metadata if it fails
                return page;
              }
            })
          );

          pages = pagesWithMetadata;
        }

        // Always write to Blob cache (with or without metadata)
        await writePagesToBlob(pages);

        return successResponse({ pages });
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

      const bodyValidation = validate(pagesSchemas.update, requestData);
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
      const updateResponse = await githubRequest(`/contents/${PAGES_DIR}/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Update page: ${path}`,
          content: Buffer.from(content).toString('base64'),
          sha: sha,
          branch: GITHUB_BRANCH
        }
      });

      // Invalidate cache by deleting the Blob
      try {
        const store = getStore('cache');
        await store.delete(BLOB_CACHE_KEY);
        console.log('[Pages] Cache invalidated after update');
      } catch (error) {
        console.error('[Pages] Error invalidating cache:', error);
      }

      return successResponse({
        success: true,
        message: 'Page updated successfully',
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

      const bodyValidation = validate(pagesSchemas.create, requestData);
      if (!bodyValidation.success) {
        const formatted = formatValidationError(bodyValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      const { path: filename, frontmatter, body } = bodyValidation.data;

      // Auto-set last_modified_at to match published date for new pages
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
      const createResponse = await githubRequest(`/contents/${PAGES_DIR}/${filename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Create page: ${filename}`,
          content: Buffer.from(content).toString('base64'),
          branch: GITHUB_BRANCH
        }
      });

      // Invalidate cache by deleting the Blob
      try {
        const store = getStore('cache');
        await store.delete(BLOB_CACHE_KEY);
        console.log('[Pages] Cache invalidated after create');
      } catch (error) {
        console.error('[Pages] Error invalidating cache:', error);
      }

      return successResponse({
        success: true,
        message: 'Page created successfully',
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

      const bodyValidation = validate(pagesSchemas.delete, requestData);
      if (!bodyValidation.success) {
        const formatted = formatValidationError(bodyValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      const { path, sha } = bodyValidation.data;

      // Delete file via GitHub API
      const deleteResponse = await githubRequest(`/contents/${PAGES_DIR}/${path}`, {
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
        console.log('[Pages] Cache invalidated after delete');
      } catch (error) {
        console.error('[Pages] Error invalidating cache:', error);
      }

      return successResponse({
        success: true,
        message: 'Page deleted successfully',
        commitSha: deleteResponse.commit?.sha
      });
    }

    // Method not allowed
    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Pages function error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
}
