/**
 * Site Settings Management Netlify Function
 *
 * Manages Jekyll site configuration stored in _config.yml.
 * Provides read and update operations for whitelisted configuration fields.
 *
 * Security: Only fields listed in EDITABLE_FIELDS can be modified.
 * This prevents malicious updates to sensitive configuration like build settings,
 * plugins, or deployment configurations.
 *
 * Supported operations:
 * - GET: Retrieve current editable settings
 * - PUT: Update editable settings
 *
 * @module netlify/functions/settings
 */

import yaml from 'js-yaml';
import { getStore } from '@netlify/blobs';
import { settingsSchemas, validate, formatValidationError } from '../utils/validation-schemas.mjs';
import { githubRequest, GITHUB_BRANCH } from '../utils/github-api.mjs';
import {
  successResponse,
  badRequestResponse,
  methodNotAllowedResponse,
  serviceUnavailableResponse,
  serverErrorResponse,
  corsPreflightResponse
} from '../utils/response-helpers.mjs';

const FILE_PATH = '_config.yml';
const BLOB_CACHE_KEY = 'settings.json';
const CACHE_TTL_HOURS = 24;

/**
 * Editable settings whitelist for security
 *
 * Only fields in this array can be read or modified through the API.
 * This prevents unauthorized changes to sensitive Jekyll configuration
 * like plugins, build settings, or deployment configurations.
 *
 * @constant {string[]}
 */
const EDITABLE_FIELDS = [
  'title',
  'description',
  'author',
  'email',
  'github_username',
  'paginate',
  'related_posts_count',
  'timezone',
  'lang',
  'google_fonts',
  'cloudinary_default_folder'
];

/**
 * Reads settings from Blob cache
 * @returns {Promise<Object|null>} Cached settings data or null if not available/expired
 */
async function readSettingsFromBlob() {
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
      console.log('[Settings] Blob cache expired');
      return null;
    }

    console.log('[Settings] Serving from Blob cache');
    return cached.data;
  } catch (error) {
    console.error('[Settings] Error reading from Blob:', error);
    return null;
  }
}

/**
 * Writes settings to Blob cache
 * @param {Object} settingsData - Settings data to cache
 */
async function writeSettingsToBlob(settingsData) {
  try {
    const store = getStore('cache');
    await store.setJSON(BLOB_CACHE_KEY, {
      timestamp: Date.now(),
      data: settingsData
    });
    console.log('[Settings] Written to Blob cache');
  } catch (error) {
    console.error('[Settings] Error writing to Blob:', error);
    // Don't throw - cache write failure shouldn't break the request
  }
}

/**
 * Netlify Function Handler - Settings Management
 *
 * Main entry point for site settings management. Handles reading and updating
 * Jekyll _config.yml with security controls to prevent unauthorized changes.
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
    // GET - Read settings from Blob cache or _config.yml
    if (method === 'GET') {
      // Try Blob cache first
      let cachedSettings = await readSettingsFromBlob();
      if (cachedSettings) {
        return successResponse(cachedSettings);
      }

      // Cache miss - read from GitHub
      console.log('[Settings] Cache miss, reading from GitHub');
      const fileData = await githubRequest(`/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`);
      const content = Buffer.from(fileData.content, 'base64').toString('utf8');

      let config;
      try {
        config = yaml.load(content);
      } catch (yamlError) {
        return badRequestResponse(`Failed to parse _config.yml: ${yamlError.message}`);
      }

      // Extract only editable fields
      const settings = {};
      EDITABLE_FIELDS.forEach(field => {
        if (config.hasOwnProperty(field)) {
          settings[field] = config[field];
        }
      });

      // Write to Blob cache
      await writeSettingsToBlob(settings);

      return successResponse(settings);
    }

    // PUT - Update settings in _config.yml
    if (method === 'PUT') {
      // Check for GitHub token
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

      const bodyValidation = validate(settingsSchemas.update, requestData);
      if (!bodyValidation.success) {
        const formatted = formatValidationError(bodyValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      const updates = bodyValidation.data;

      // Validate that only editable fields are being updated
      const invalidFields = Object.keys(updates).filter(
        field => !EDITABLE_FIELDS.includes(field)
      );
      if (invalidFields.length > 0) {
        return badRequestResponse(`Cannot update fields: ${invalidFields.join(', ')}`);
      }

      // Get current file
      const currentFile = await githubRequest(`/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`);
      const content = Buffer.from(currentFile.content, 'base64').toString('utf8');
      const config = yaml.load(content);

      // Update config with new values
      Object.keys(updates).forEach(field => {
        config[field] = updates[field];
      });

      // Convert back to YAML
      const yamlContent = yaml.dump(config, {
        lineWidth: -1,
        noRefs: true,
        sortKeys: false
      });

      // Update file via GitHub API
      const updateResponse = await githubRequest(`/contents/${FILE_PATH}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: 'Update site settings from custom admin',
          content: Buffer.from(yamlContent).toString('base64'),
          sha: currentFile.sha,
          branch: GITHUB_BRANCH
        }
      });

      // Update Blob cache with new settings
      const updatedSettings = {};
      EDITABLE_FIELDS.forEach(field => {
        if (config.hasOwnProperty(field)) {
          updatedSettings[field] = config[field];
        }
      });
      await writeSettingsToBlob(updatedSettings);

      return successResponse({
        success: true,
        message: 'Settings updated successfully. Netlify will rebuild the site automatically in 1-2 minutes.',
        commitSha: updateResponse.commit?.sha
      });
    }

    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Settings error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
};
