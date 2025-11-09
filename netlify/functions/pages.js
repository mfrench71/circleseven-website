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

const { pagesSchemas, validate, formatValidationError } = require('../utils/validation-schemas.cjs');
const { checkRateLimit } = require('../utils/rate-limiter.cjs');
const { githubRequest, GITHUB_BRANCH } = require('../utils/github-api.cjs');

const PAGES_DIR = '_pages';

/**
 * Parses YAML frontmatter from markdown content
 *
 * Extracts frontmatter (YAML metadata) from Jekyll/markdown files and parses
 * common field types including strings, booleans, arrays, and nested values.
 *
 * @param {string} content - Raw markdown content with frontmatter
 * @returns {Object} Parsed result
 * @returns {Object} .frontmatter - Parsed frontmatter object
 * @returns {string} .body - Markdown body content (without frontmatter)
 *
 * @example
 * const { frontmatter, body } = parseFrontmatter(`---
 * title: About Us
 * layout: page
 * protected: true
 * ---
 * Page content here`);
 * // frontmatter = { title: 'About Us', layout: 'page', protected: true }
 * // body = 'Page content here'
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  const body = match[2];

  // Simple YAML parsing for common fields
  const frontmatter = {};
  const lines = frontmatterText.split('\n');
  let currentKey = null;
  let currentValue = [];
  let isArrayValue = false; // Track if value came from YAML list syntax (- items)

  for (const line of lines) {
    if (line.match(/^[a-zA-Z_]+:/)) {
      // Save previous key if exists
      if (currentKey) {
        // If items came from YAML list syntax (- items), keep as array even if single item
        // Otherwise, convert single-item array to string
        frontmatter[currentKey] = (isArrayValue || currentValue.length > 1)
          ? currentValue
          : (currentValue.length === 1 ? currentValue[0] : '');
        currentValue = [];
        isArrayValue = false;
      }

      const [key, ...valueParts] = line.split(':');
      currentKey = key.trim();
      const value = valueParts.join(':').trim();

      if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array value [item1, item2]
        frontmatter[currentKey] = value
          .slice(1, -1)
          .split(',')
          .map(v => v.trim().replace(/^["']|["']$/g, ''));
        currentKey = null;
      } else if (value) {
        // Single line value - handle booleans
        let parsedValue = value.replace(/^["']|["']$/g, '');
        if (parsedValue === 'true') parsedValue = true;
        else if (parsedValue === 'false') parsedValue = false;
        currentValue.push(parsedValue);
      }
    } else if (currentKey && line.trim().startsWith('-')) {
      // Array item from YAML list syntax
      isArrayValue = true;
      currentValue.push(line.trim().substring(1).trim().replace(/^["']|["']$/g, ''));
    }
  }

  // Save last key
  if (currentKey) {
    frontmatter[currentKey] = (isArrayValue || currentValue.length > 1)
      ? currentValue
      : (currentValue.length === 1 ? currentValue[0] : '');
  }

  return { frontmatter, body: body.trim() };
}

/**
 * Builds YAML frontmatter string from object
 *
 * Converts a JavaScript object into properly formatted YAML frontmatter
 * suitable for Jekyll markdown files. Handles strings, booleans, and arrays.
 *
 * @param {Object} frontmatter - Frontmatter object to convert
 * @returns {string} YAML frontmatter string with delimiters (---\n...\n---\n)
 *
 * @example
 * const yaml = buildFrontmatter({
 *   title: 'About',
 *   layout: 'page',
 *   protected: true,
 *   tags: ['news', 'featured']
 * });
 * // Returns:
 * // ---
 * // title: About
 * // layout: page
 * // protected: true
 * // tags:
 * //   - news
 * //   - featured
 * // ---
 */
function buildFrontmatter(frontmatter) {
  let yaml = '---\n';

  for (const [key, value] of Object.entries(frontmatter)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        yaml += `${key}: []\n`;
      } else {
        yaml += `${key}:\n`;
        value.forEach(item => {
          yaml += `  - ${item}\n`;
        });
      }
    } else if (typeof value === 'boolean') {
      // Output booleans without quotes
      yaml += `${key}: ${value}\n`;
    } else {
      yaml += `${key}: ${value}\n`;
    }
  }

  yaml += '---\n';
  return yaml;
}

/**
 * Netlify Function Handler - Pages Management
 *
 * Main entry point for the pages management function. Handles all CRUD operations
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
 * // GET all pages
 * // GET /.netlify/functions/pages
 *
 * // GET single page
 * // GET /.netlify/functions/pages?path=about.md
 *
 * // CREATE page
 * // POST /.netlify/functions/pages
 * // Body: { filename: 'contact.md', frontmatter: {...}, body: '...' }
 *
 * // UPDATE page
 * // PUT /.netlify/functions/pages
 * // Body: { path: 'about.md', frontmatter: {...}, body: '...', sha: '...' }
 *
 * // DELETE page
 * // DELETE /.netlify/functions/pages
 * // Body: { path: 'about.md', sha: '...' }
 */
export const handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Check rate limit
  const rateLimitResponse = checkRateLimit(event);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // GET - List all pages or get single page
    if (event.httpMethod === 'GET') {
      // Validate query parameters
      const queryValidation = validate(pagesSchemas.getQuery, event.queryStringParameters || {});
      if (!queryValidation.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify(formatValidationError(queryValidation.errors))
        };
      }

      const pathParam = event.queryStringParameters?.path;
      const withMetadata = event.queryStringParameters?.metadata === 'true';

      if (pathParam) {
        // Get single page with frontmatter and body
        const fileData = await githubRequest(`/contents/${PAGES_DIR}/${pathParam}?ref=${GITHUB_BRANCH}`);
        const content = Buffer.from(fileData.content, 'base64').toString('utf8');
        const { frontmatter, body } = parseFrontmatter(content);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            path: pathParam,
            frontmatter,
            body,
            sha: fileData.sha
          })
        };
      } else {
        // List all pages
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

          pages = pagesWithMetadata;
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ pages })
        };
      }
    }

    // PUT - Update existing page
    if (event.httpMethod === 'PUT') {
      if (!process.env.GITHUB_TOKEN) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            error: 'GitHub integration not configured',
            message: 'GITHUB_TOKEN environment variable is missing'
          })
        };
      }

      // Parse and validate request body
      let requestData;
      try {
        requestData = JSON.parse(event.body);
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid JSON',
            message: 'Request body must be valid JSON'
          })
        };
      }

      const bodyValidation = validate(pagesSchemas.update, requestData);
      if (!bodyValidation.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify(formatValidationError(bodyValidation.errors))
        };
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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Page updated successfully',
          commitSha: updateResponse.commit?.sha
        })
      };
    }

    // POST - Create new page
    if (event.httpMethod === 'POST') {
      if (!process.env.GITHUB_TOKEN) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            error: 'GitHub integration not configured',
            message: 'GITHUB_TOKEN environment variable is missing'
          })
        };
      }

      // Parse and validate request body
      let requestData;
      try {
        requestData = JSON.parse(event.body);
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid JSON',
            message: 'Request body must be valid JSON'
          })
        };
      }

      const bodyValidation = validate(pagesSchemas.create, requestData);
      if (!bodyValidation.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify(formatValidationError(bodyValidation.errors))
        };
      }

      const { path, frontmatter, body } = bodyValidation.data;

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
      const createResponse = await githubRequest(`/contents/${PAGES_DIR}/${path}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Create page: ${path}`,
          content: Buffer.from(content).toString('base64'),
          branch: GITHUB_BRANCH
        }
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Page created successfully',
          commitSha: createResponse.commit?.sha
        })
      };
    }

    // DELETE - Delete page
    if (event.httpMethod === 'DELETE') {
      if (!process.env.GITHUB_TOKEN) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            error: 'GitHub integration not configured',
            message: 'GITHUB_TOKEN environment variable is missing'
          })
        };
      }

      // Parse and validate request body
      let requestData;
      try {
        requestData = JSON.parse(event.body);
      } catch (error) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid JSON',
            message: 'Request body must be valid JSON'
          })
        };
      }

      const bodyValidation = validate(pagesSchemas.delete, requestData);
      if (!bodyValidation.success) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify(formatValidationError(bodyValidation.errors))
        };
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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Page deleted successfully',
          commitSha: deleteResponse.commit?.sha
        })
      };
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Pages function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
