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

const yaml = require('js-yaml');
const { settingsSchemas, validate, formatValidationError } = require('../utils/validation-schemas.cjs');
const { checkRateLimit } = require('../utils/rate-limiter.cjs');
const { githubRequest, GITHUB_BRANCH } = require('../utils/github-api.cjs');
const {
  successResponse,
  badRequestResponse,
  methodNotAllowedResponse,
  serviceUnavailableResponse,
  serverErrorResponse,
  corsPreflightResponse
} = require('../utils/response-helpers.cjs');

const FILE_PATH = '_config.yml';

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
  'cloudinary_default_folder',
  'cloudflare_analytics_token'
];

/**
 * Netlify Function Handler - Settings Management
 *
 * Main entry point for site settings management. Handles reading and updating
 * Jekyll _config.yml with security controls to prevent unauthorized changes.
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP method (GET, PUT, OPTIONS)
 * @param {string} event.body - Request body (JSON string for PUT)
 * @param {Object} context - Netlify function context
 * @returns {Promise<Object>} Response object with statusCode, headers, and body
 *
 * @example
 * // GET settings
 * // GET /.netlify/functions/settings
 * // Returns: {
 * //   title: "Circle Seven",
 * //   description: "Tech blog...",
 * //   author: "Matthew French",
 * //   email: "...",
 * //   paginate: 12,
 * //   ...
 * // }
 *
 * @example
 * // UPDATE settings
 * // PUT /.netlify/functions/settings
 * // Body: {
 * //   title: "Circle Seven Blog",
 * //   description: "Updated description",
 * //   paginate: 15
 * // }
 * // Returns: { success: true, message: "...", commitSha: "..." }
 *
 * @example
 * // INVALID UPDATE (non-whitelisted field)
 * // PUT /.netlify/functions/settings
 * // Body: { plugins: ["evil-plugin"] }
 * // Returns: { error: "Invalid fields", message: "Cannot update fields: plugins" }
 */
exports.handler = async (event, context) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsPreflightResponse();
  }

  // Check rate limit
  const rateLimitResponse = checkRateLimit(event);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // GET - Read settings from _config.yml
    if (event.httpMethod === 'GET') {
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

      return successResponse(settings);
    }

    // PUT - Update settings in _config.yml
    if (event.httpMethod === 'PUT') {
      // Check for GitHub token
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

      // Convert back to YAML, preserving structure
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

      return successResponse({
        success: true,
        message: 'Settings updated successfully. Netlify will rebuild the site automatically in 1-2 minutes.',
        commitSha: updateResponse.commit?.sha
      });
    }

    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Settings function error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
};
