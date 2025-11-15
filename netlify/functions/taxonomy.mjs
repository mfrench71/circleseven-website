/**
 * Taxonomy Management Netlify Function
 *
 * Manages site-wide taxonomy (categories and tags) stored in _data/taxonomy.yml.
 * Provides read and update operations via GitHub API integration.
 *
 * The taxonomy file uses YAML format with structured lists:
 * categories:
 *   - item: Category Name
 * tags:
 *   - item: Tag Name
 *
 * Supported operations:
 * - GET: Retrieve current categories and tags
 * - PUT: Update taxonomy with new categories and tags lists
 *
 * @module netlify/functions/taxonomy
 */

import yaml from 'js-yaml';
import { getStore } from '@netlify/blobs';
import { createRequire } from 'module';

// Import CommonJS modules using createRequire
const require = createRequire(import.meta.url);
const { taxonomySchemas, validate, formatValidationError } = require('../utils/validation-schemas.cjs');
const { githubRequest, GITHUB_BRANCH } = require('../utils/github-api.cjs');
const {
  successResponse,
  badRequestResponse,
  methodNotAllowedResponse,
  serviceUnavailableResponse,
  serverErrorResponse,
  corsPreflightResponse
} = require('../utils/response-helpers.cjs');

const FILE_PATH = '_data/taxonomy.yml';
const BLOB_CACHE_KEY = 'taxonomy.json';
const CACHE_TTL_HOURS = 24;

/**
 * Reads taxonomy from Blob cache
 * @returns {Promise<Object|null>} Cached taxonomy data or null if not available/expired
 */
async function readTaxonomyFromBlob() {
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
      console.log('[Taxonomy] Blob cache expired');
      return null;
    }

    console.log('[Taxonomy] Serving from Blob cache');
    return cached.data;
  } catch (error) {
    console.error('[Taxonomy] Error reading from Blob:', error);
    return null;
  }
}

/**
 * Writes taxonomy to Blob cache
 * @param {Object} taxonomyData - Processed taxonomy data to cache
 */
async function writeTaxonomyToBlob(taxonomyData) {
  try {
    const store = getStore('cache');
    await store.setJSON(BLOB_CACHE_KEY, {
      timestamp: Date.now(),
      data: taxonomyData
    });
    console.log('[Taxonomy] Written to Blob cache');
  } catch (error) {
    console.error('[Taxonomy] Error writing to Blob:', error);
    // Don't throw - cache write failure shouldn't break the request
  }
}

/**
 * Flattens hierarchical categories to simple string array
 */
function flattenCategories(categories) {
  const flat = [];
  categories.forEach(cat => {
    const name = typeof cat === 'string' ? cat : cat.item;
    flat.push(name);
    if (cat.children && Array.isArray(cat.children)) {
      cat.children.forEach(child => {
        flat.push(typeof child === 'string' ? child : child.item);
      });
    }
  });
  return flat;
}

/**
 * Extracts strings from flat tag array
 */
function extractStrings(arr) {
  return arr.map(item =>
    typeof item === 'string' ? item : (item.item || item)
  );
}

/**
 * Netlify Function Handler - Taxonomy Management
 *
 * Main entry point for taxonomy management. Handles reading and updating
 * the site's categories and tags taxonomy via REST API.
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP method (GET, PUT, OPTIONS)
 * @param {string} event.body - Request body (JSON string for PUT)
 * @param {Object} context - Netlify function context
 * @returns {Promise<Object>} Response object with statusCode, headers, and body
 *
 * @example
 * // GET taxonomy
 * // GET /.netlify/functions/taxonomy
 * // Returns: { categories: ["Tech", "Life"], tags: ["JavaScript", "Travel"] }
 *
 * @example
 * // UPDATE taxonomy
 * // PUT /.netlify/functions/taxonomy
 * // Body: {
 * //   categories: ["Tech", "Life", "Photography"],
 * //   tags: ["JavaScript", "Travel", "Coding"]
 * // }
 * // Returns: { success: true, message: "...", commitSha: "..." }
 */
/**
 * Main handler using Functions v2 format for Blobs support
 */
export default async (request, context) => {
  const method = request.method;

  // Handle preflight
  if (method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // GET - Read taxonomy from Blob cache or GitHub
    if (method === 'GET') {
      // Try Blob cache first
      let cachedData = await readTaxonomyFromBlob();
      if (cachedData) {
        return successResponse(cachedData);
      }

      // Cache miss - read from GitHub
      console.log('[Taxonomy] Cache miss, reading from GitHub');
      const fileData = await githubRequest(`/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`);
      const content = Buffer.from(fileData.content, 'base64').toString('utf8');

      let taxonomy;
      try {
        taxonomy = yaml.load(content);
      } catch (yamlError) {
        return badRequestResponse(`Failed to parse taxonomy.yml: ${yamlError.message}`);
      }

      const responseData = {
        categories: flattenCategories(taxonomy.categories || []),
        tags: extractStrings(taxonomy.tags || []),
        categoriesTree: taxonomy.categories || [],
        tagsTree: taxonomy.tags || []
      };

      // Write to Blob cache
      await writeTaxonomyToBlob(responseData);

      return successResponse(responseData);
    }

    // PUT - Update taxonomy
    if (method === 'PUT') {
      // Check for GitHub token
      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse('GITHUB_TOKEN environment variable is missing');
      }

      let requestData;
      try {
        const body = await request.text();
        requestData = JSON.parse(body);
      } catch (error) {
        return badRequestResponse('Invalid JSON');
      }

      const bodyValidation = validate(taxonomySchemas.update, requestData);
      if (!bodyValidation.success) {
        const formatted = formatValidationError(bodyValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      const requestBody = bodyValidation.data;

      if (!Array.isArray(requestBody.categories) || !Array.isArray(requestBody.tags)) {
        return badRequestResponse('Both categories and tags must be arrays');
      }

      const categoriesTree = requestBody.categoriesTree ||
        (requestBody.categories || []).map(c => ({ item: c, slug: '', children: [] }));
      const tagsTree = requestBody.tagsTree ||
        (requestBody.tags || []).map(t => ({ item: t, slug: '' }));

      // Get current file SHA
      const currentFile = await githubRequest(`/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`);

      const generateCategoryYAML = (cat, indent = 2) => {
        const spaces = ' '.repeat(indent);
        let yaml = `${spaces}- item: ${cat.item}\n`;
        yaml += `${spaces}  slug: ${cat.slug || ''}\n`;

        if (cat.children && cat.children.length > 0) {
          yaml += `${spaces}  children:\n`;
          cat.children.forEach(child => {
            yaml += `${spaces}    - item: ${child.item}\n`;
            yaml += `${spaces}      slug: ${child.slug || ''}\n`;
          });
        } else {
          yaml += `${spaces}  children: []\n`;
        }

        return yaml;
      };

      const generateTagYAML = (tag) => {
        return `  - item: ${tag.item}\n    slug: ${tag.slug || ''}\n`;
      };

      const yamlContent = `# Site Taxonomy - Manage categories and tags used across the site
# Edit these lists in CMS Settings > Taxonomy (Categories & Tags)
#
# Categories now support hierarchy with parent-child relationships.
# Each category can have optional 'slug' and 'children' fields.
# Children inherit from their parent for organizational purposes.

categories:
${categoriesTree.map(c => generateCategoryYAML(c, 2)).join('')}
tags:
${tagsTree.map(t => generateTagYAML(t)).join('')}
`;

      // Update file via GitHub API
      const updateResponse = await githubRequest(`/contents/${FILE_PATH}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: 'Update taxonomy from custom admin',
          content: Buffer.from(yamlContent).toString('base64'),
          sha: currentFile.sha,
          branch: GITHUB_BRANCH
        }
      });

      // Update Blob cache
      const updatedData = {
        categories: flattenCategories(categoriesTree),
        tags: extractStrings(tagsTree),
        categoriesTree: categoriesTree,
        tagsTree: tagsTree
      };
      await writeTaxonomyToBlob(updatedData);

      return successResponse({
        success: true,
        message: 'Taxonomy updated successfully. Netlify will rebuild the site automatically.',
        commitSha: updateResponse.commit?.sha
      });
    }

    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Taxonomy error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
};
