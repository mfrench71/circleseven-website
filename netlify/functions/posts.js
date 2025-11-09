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

const { postsSchemas, validate, formatValidationError } = require('../utils/validation-schemas.cjs');
const { checkRateLimit } = require('../utils/rate-limiter.cjs');
const { githubRequest, GITHUB_BRANCH } = require('../utils/github-api.cjs');
const { parseFrontmatter, buildFrontmatter } = require('../utils/frontmatter.cjs');
const {
  successResponse,
  badRequestResponse,
  methodNotAllowedResponse,
  serviceUnavailableResponse,
  serverErrorResponse,
  corsPreflightResponse
} = require('../utils/response-helpers.cjs');

const POSTS_DIR = '_posts';

/**
 * Netlify Function Handler - Posts Management
 *
 * Main entry point for the posts management function. Handles all CRUD operations
 * for Jekyll page files via REST API.
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP method (GET, POST, PUT, DELETE, OPTIONS)
 * @param {string} event.body - Request body (JSON string)
 * @param {Object} event.queryStringParameters - URL query parameters
 * @param {Object} context - Netlify function context
 * @returns {Promise<Object>} Response object with statusCode, headers, and body
 *
 * @example
 * // GET all posts
 * // GET /.netlify/functions/posts
 *
 * // GET single page
 * // GET /.netlify/functions/posts?path=about.md
 *
 * // CREATE page
 * // POST /.netlify/functions/posts
 * // Body: { filename: 'contact.md', frontmatter: {...}, body: '...' }
 *
 * // UPDATE page
 * // PUT /.netlify/functions/posts
 * // Body: { path: 'about.md', frontmatter: {...}, body: '...', sha: '...' }
 *
 * // DELETE page
 * // DELETE /.netlify/functions/posts
 * // Body: { path: 'about.md', sha: '...' }
 */
export const handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return corsPreflightResponse();
  }

  // Check rate limit
  const rateLimitResponse = checkRateLimit(event);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // GET - List all posts or get single page
    if (event.httpMethod === 'GET') {
      // Validate query parameters
      const queryValidation = validate(postsSchemas.getQuery, event.queryStringParameters || {});
      if (!queryValidation.success) {
        const formatted = formatValidationError(queryValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      const pathParam = event.queryStringParameters?.path;
      const withMetadata = event.queryStringParameters?.metadata === 'true';

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
        // List all posts
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
        }

        return successResponse({ posts });
      }
    }

    // PUT - Update existing page
    if (event.httpMethod === 'PUT') {
      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse('GITHUB_TOKEN environment variable is missing');
      }

      // Parse and validate request body
      let requestData;
      try {
        requestData = JSON.parse(event.body);
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

      return successResponse({
        success: true,
        message: 'Post updated successfully',
        commitSha: updateResponse.commit?.sha
      });
    }

    // POST - Create new page
    if (event.httpMethod === 'POST') {
      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse('GITHUB_TOKEN environment variable is missing');
      }

      // Parse and validate request body
      let requestData;
      try {
        requestData = JSON.parse(event.body);
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

      return successResponse({
        success: true,
        message: 'Post created successfully',
        commitSha: createResponse.commit?.sha
      }, 201);
    }

    // DELETE - Delete page
    if (event.httpMethod === 'DELETE') {
      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse('GITHUB_TOKEN environment variable is missing');
      }

      // Parse and validate request body
      let requestData;
      try {
        requestData = JSON.parse(event.body);
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
};
