/**
 * Menu Management Netlify Function
 *
 * Manages site-wide menu configurations stored in _data/menus.yml.
 * Provides read and update operations via GitHub API integration.
 *
 * The menus file uses YAML format with structured menu definitions:
 * header_menu:
 *   - id: menu-item-id
 *     type: category|page|custom|heading
 *     label: Display Text
 *     url: /path/to/page/
 *     children: []
 *
 * Supported operations:
 * - GET: Retrieve current menu configurations (use ?nocache=1 to bypass cache)
 * - PUT: Update menus with new structure
 * - DELETE: Clear the menu cache
 *
 * @module netlify/functions/menus
 */

import yaml from 'js-yaml';
import { getStore } from '@netlify/blobs';
import { menusSchemas, validate, formatValidationError } from '../utils/validation-schemas.mjs';
import { githubRequest, GITHUB_BRANCH } from '../utils/github-api.mjs';
import {
  successResponse,
  badRequestResponse,
  methodNotAllowedResponse,
  serviceUnavailableResponse,
  serverErrorResponse,
  corsPreflightResponse
} from '../utils/response-helpers.mjs';
import debug from '../utils/debug-logger.mjs';

const FILE_PATH = '_data/menus.yml';
const TAXONOMY_FILE_PATH = '_data/taxonomy.yml';
const BLOB_CACHE_KEY = 'menus.json';
const CACHE_TTL_HOURS = 24;

/**
 * Reads menus from Blob cache
 * @returns {Promise<Object|null>} Cached menu data or null if not available/expired
 */
async function readMenusFromBlob() {
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
      debug.log('[Menus] Blob cache expired');
      return null;
    }

    debug.log('[Menus] Serving from Blob cache');
    return cached.data;
  } catch (error) {
    console.error('[Menus] Error reading from Blob:', error);
    return null;
  }
}

/**
 * Writes menus to Blob cache
 * @param {Object} menusData - Processed menu data to cache
 */
async function writeMenusToBlob(menusData) {
  try {
    const store = getStore('cache');
    await store.setJSON(BLOB_CACHE_KEY, {
      timestamp: Date.now(),
      data: menusData
    });
    debug.log('[Menus] Written to Blob cache');
  } catch (error) {
    console.error('[Menus] Error writing to Blob:', error);
    // Don't throw - cache write failure shouldn't break the request
  }
}

/**
 * Recursively finds a category by slug in taxonomy tree
 * @param {Array} categories - Array of category objects from taxonomy
 * @param {string} slug - The slug to search for
 * @returns {Object|null} The category object or null if not found
 */
function findCategoryBySlug(categories, slug) {
  if (!Array.isArray(categories)) return null;

  for (const category of categories) {
    if (category.slug === slug) {
      return category;
    }

    // Search in children
    if (Array.isArray(category.children)) {
      const found = findCategoryBySlug(category.children, slug);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Validates that all category_ref references exist in taxonomy
 * @param {Array} menuItems - Menu items to validate
 * @param {Object} taxonomy - Taxonomy data
 * @param {Array} path - Current path for error reporting
 * @returns {Array} Array of broken references with paths
 */
function validateCategoryRefs(menuItems, taxonomy, path = []) {
  if (!Array.isArray(menuItems)) return [];

  const brokenRefs = [];
  const categories = taxonomy.categories || [];

  menuItems.forEach((item, index) => {
    const itemPath = [...path, `[${index}]`];

    if (item.type === 'category_ref' && item.category_ref) {
      const category = findCategoryBySlug(categories, item.category_ref);
      if (!category) {
        brokenRefs.push({
          path: itemPath.join(''),
          ref: item.category_ref,
          itemId: item.id
        });
      }
    }

    // Recursively validate children
    if (Array.isArray(item.children) && item.children.length > 0) {
      const childBroken = validateCategoryRefs(item.children, taxonomy, [...itemPath, '.children']);
      brokenRefs.push(...childBroken);
    }
  });

  return brokenRefs;
}

/**
 * Cleans a menu item before saving - removes undefined/null/"undefined" values
 * For category_ref items, label and url should NOT be saved (resolved from taxonomy)
 * @param {Object} item - Menu item to clean
 * @returns {Object} Cleaned menu item
 */
function cleanMenuItem(item) {
  if (!item) return item;

  const cleaned = { ...item };

  // For category_ref items, strip label and url if they're undefined or "undefined" string
  if (cleaned.type === 'category_ref') {
    if (cleaned.label === undefined || cleaned.label === 'undefined' || cleaned.label === null || cleaned.label === '') {
      delete cleaned.label;
    }
    if (cleaned.url === undefined || cleaned.url === 'undefined' || cleaned.url === null || cleaned.url === '') {
      delete cleaned.url;
    }
    // Ensure category_ref field exists
    if (!cleaned.category_ref) {
      console.warn(`[Menus] category_ref item ${cleaned.id} missing category_ref field`);
    }
  }

  // Clean children recursively
  if (cleaned.children && Array.isArray(cleaned.children)) {
    cleaned.children = cleaned.children.map(cleanMenuItem);
  }

  return cleaned;
}

/**
 * Generates YAML content for menu items with proper indentation
 * Cleans items before generating to prevent corruption
 * @param {Array} items - Menu items array
 * @param {number} indent - Current indentation level
 * @returns {string} YAML-formatted menu items
 */
function generateMenuItemsYAML(items, indent = 2) {
  if (!items || items.length === 0) return '';

  const spaces = ' '.repeat(indent);
  let yaml = '';

  items.forEach(item => {
    // Clean the item before generating YAML
    const cleanedItem = cleanMenuItem(item);

    yaml += `${spaces}- id: "${cleanedItem.id}"\n`;
    yaml += `${spaces}  type: "${cleanedItem.type}"\n`;

    // For category_ref items, add category_ref field
    if (cleanedItem.type === 'category_ref' && cleanedItem.category_ref) {
      yaml += `${spaces}  category_ref: "${cleanedItem.category_ref}"\n`;
    }

    // Only add label if it exists and is not for category_ref (unless explicitly set)
    if (cleanedItem.label && cleanedItem.label !== 'undefined') {
      yaml += `${spaces}  label: "${cleanedItem.label}"\n`;
    }

    // Only add url if it exists and is not undefined
    if (cleanedItem.url && cleanedItem.url !== 'undefined') {
      yaml += `${spaces}  url: "${cleanedItem.url}"\n`;
    }

    if (cleanedItem.icon) {
      yaml += `${spaces}  icon: "${cleanedItem.icon}"\n`;
    }
    if (cleanedItem.mega_menu) {
      yaml += `${spaces}  mega_menu: ${cleanedItem.mega_menu}\n`;
    }
    if (cleanedItem.accordion) {
      yaml += `${spaces}  accordion: ${cleanedItem.accordion}\n`;
    }

    if (cleanedItem.children && cleanedItem.children.length > 0) {
      yaml += `${spaces}  children:\n`;
      yaml += generateMenuItemsYAML(cleanedItem.children, indent + 4);
    }
  });

  return yaml;
}

/**
 * Netlify Function Handler - Menu Management
 *
 * Main entry point for menu management. Handles reading and updating
 * the site's menu configurations via REST API.
 *
 * @param {Object} request - Netlify Functions v2 request object
 * @param {Object} context - Netlify function context
 * @returns {Promise<Response>} Web standard Response object
 */
export default async function handler(request, context) {
  const method = request.method;

  // Handle preflight
  if (method === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    // GET - Read menus from Blob cache or GitHub
    if (method === 'GET') {
      // Check for nocache parameter
      const url = new URL(request.url);
      const noCache = url.searchParams.get('nocache') === '1';

      // Try Blob cache first (unless nocache is set)
      if (!noCache) {
        let cachedData = await readMenusFromBlob();
        if (cachedData) {
          return successResponse(cachedData);
        }
      } else {
        debug.log('[Menus] nocache=1 parameter detected, bypassing cache');
      }

      // Cache miss or nocache - read from GitHub
      debug.log('[Menus] Reading from GitHub');
      const fileData = await githubRequest(`/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`);
      const content = Buffer.from(fileData.content, 'base64').toString('utf8');

      let menus;
      try {
        menus = yaml.load(content);
      } catch (yamlError) {
        return badRequestResponse(`Failed to parse menus.yml: ${yamlError.message}`);
      }

      const responseData = {
        header_menu: menus.header_menu || [],
        mobile_menu: menus.mobile_menu || [],
        footer_menu: menus.footer_menu || []
      };

      // Write to Blob cache
      await writeMenusToBlob(responseData);

      return successResponse(responseData);
    }

    // PUT - Update menus
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

      const bodyValidation = validate(menusSchemas.update, requestData);
      if (!bodyValidation.success) {
        const formatted = formatValidationError(bodyValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      const requestBody = bodyValidation.data;

      // Fetch current taxonomy to validate category references
      const taxonomyFile = await githubRequest(`/contents/${TAXONOMY_FILE_PATH}?ref=${GITHUB_BRANCH}`);
      const taxonomyContent = Buffer.from(taxonomyFile.content, 'base64').toString('utf8');
      let taxonomy;
      try {
        taxonomy = yaml.load(taxonomyContent);
      } catch (yamlError) {
        return badRequestResponse(`Failed to parse taxonomy.yml: ${yamlError.message}`);
      }

      // Validate all category_ref references
      let allBrokenRefs = [];
      if (requestBody.header_menu) {
        allBrokenRefs.push(...validateCategoryRefs(requestBody.header_menu, taxonomy, ['header_menu']));
      }
      if (requestBody.mobile_menu) {
        allBrokenRefs.push(...validateCategoryRefs(requestBody.mobile_menu, taxonomy, ['mobile_menu']));
      }
      if (requestBody.footer_menu) {
        allBrokenRefs.push(...validateCategoryRefs(requestBody.footer_menu, taxonomy, ['footer_menu']));
      }

      if (allBrokenRefs.length > 0) {
        const refList = allBrokenRefs.map(r => `${r.path} (id: ${r.itemId}) -> "${r.ref}"`).join(', ');
        return badRequestResponse(
          `Invalid category references found: ${refList}. These categories do not exist in taxonomy.yml.`,
          { brokenReferences: allBrokenRefs }
        );
      }

      // Get current file SHA
      const currentFile = await githubRequest(`/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`);

      // Generate YAML content
      const yamlHeader = `# Menu Configuration
# WordPress-style menu management for Jekyll site
#
# Structure:
# - id: Unique identifier for the menu item
# - type: Type of menu item (category_ref|category|page|custom|heading)
# - label: Display text for the menu item (optional for category_ref - will use taxonomy name)
# - url: Target URL (optional for headings and category_ref)
# - category_ref: Slug of category in taxonomy.yml (for category_ref type)
# - icon: Font Awesome icon class (optional)
# - mega_menu: Boolean to enable mega-menu styling (default: false)
# - children: Array of nested menu items (optional)
#
# Note: category_ref items automatically resolve label and URL from taxonomy.yml
# Note: The menu renderer will automatically add post counts to category links

`;

      let yamlContent = yamlHeader;

      if (requestBody.header_menu) {
        yamlContent += 'header_menu:\n';
        yamlContent += generateMenuItemsYAML(requestBody.header_menu, 2);
        yamlContent += '\n';
      }

      if (requestBody.mobile_menu) {
        yamlContent += '# Mobile menu (can mirror header or have different structure)\n';
        yamlContent += 'mobile_menu:\n';
        yamlContent += generateMenuItemsYAML(requestBody.mobile_menu, 2);
        yamlContent += '\n';
      }

      if (requestBody.footer_menu) {
        yamlContent += '# Footer menu\n';
        yamlContent += 'footer_menu:\n';
        yamlContent += generateMenuItemsYAML(requestBody.footer_menu, 2);
        yamlContent += '\n';
      }

      // Update file via GitHub API
      const updateResponse = await githubRequest(`/contents/${FILE_PATH}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: 'Update menus from admin interface',
          content: Buffer.from(yamlContent).toString('base64'),
          sha: currentFile.sha,
          branch: GITHUB_BRANCH
        }
      });

      // Update Blob cache
      const updatedData = {
        header_menu: requestBody.header_menu || [],
        mobile_menu: requestBody.mobile_menu || [],
        footer_menu: requestBody.footer_menu || []
      };
      await writeMenusToBlob(updatedData);

      return successResponse({
        success: true,
        message: 'Menus updated successfully. Netlify will rebuild the site automatically.',
        commitSha: updateResponse.commit?.sha
      });
    }

    // DELETE - Clear cache
    if (method === 'DELETE') {
      try {
        const store = getStore('cache');
        await store.delete(BLOB_CACHE_KEY);
        debug.log('[Menus] Cache cleared');

        return successResponse({
          success: true,
          message: 'Menu cache cleared successfully'
        });
      } catch (error) {
        console.error('[Menus] Error clearing cache:', error);
        return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
      }
    }

    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Menus error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
}
