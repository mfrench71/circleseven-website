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
 * - GET: Retrieve current menu configurations
 * - PUT: Update menus with new structure
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

const FILE_PATH = '_data/menus.yml';
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
      console.log('[Menus] Blob cache expired');
      return null;
    }

    console.log('[Menus] Serving from Blob cache');
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
    console.log('[Menus] Written to Blob cache');
  } catch (error) {
    console.error('[Menus] Error writing to Blob:', error);
    // Don't throw - cache write failure shouldn't break the request
  }
}

/**
 * Generates YAML content for menu items with proper indentation
 * @param {Array} items - Menu items array
 * @param {number} indent - Current indentation level
 * @returns {string} YAML-formatted menu items
 */
function generateMenuItemsYAML(items, indent = 2) {
  if (!items || items.length === 0) return '';

  const spaces = ' '.repeat(indent);
  let yaml = '';

  items.forEach(item => {
    yaml += `${spaces}- id: "${item.id}"\n`;
    yaml += `${spaces}  type: "${item.type}"\n`;
    yaml += `${spaces}  label: "${item.label}"\n`;

    if (item.url) {
      yaml += `${spaces}  url: "${item.url}"\n`;
    }
    if (item.icon) {
      yaml += `${spaces}  icon: "${item.icon}"\n`;
    }
    if (item.mega_menu) {
      yaml += `${spaces}  mega_menu: ${item.mega_menu}\n`;
    }
    if (item.accordion) {
      yaml += `${spaces}  accordion: ${item.accordion}\n`;
    }

    if (item.children && item.children.length > 0) {
      yaml += `${spaces}  children:\n`;
      yaml += generateMenuItemsYAML(item.children, indent + 4);
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
      // Try Blob cache first
      let cachedData = await readMenusFromBlob();
      if (cachedData) {
        return successResponse(cachedData);
      }

      // Cache miss - read from GitHub
      console.log('[Menus] Cache miss, reading from GitHub');
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

      // Get current file SHA
      const currentFile = await githubRequest(`/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`);

      // Generate YAML content
      const yamlHeader = `# Menu Configuration
# WordPress-style menu management for Jekyll site
#
# Structure:
# - id: Unique identifier for the menu item
# - type: Type of menu item (category|page|custom|heading)
# - label: Display text for the menu item
# - url: Target URL (optional for headings)
# - icon: Font Awesome icon class (optional)
# - mega_menu: Boolean to enable mega-menu styling (default: false)
# - children: Array of nested menu items (optional)
#
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

    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Menus error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
}
