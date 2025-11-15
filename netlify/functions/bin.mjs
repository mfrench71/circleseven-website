/**
 * Bin Management Netlify Function
 *
 * Manages soft-deletion and restoration of posts and pages via a _bin directory.
 * Implements a recycle bin pattern where deleted items can be restored or permanently deleted.
 *
 * Features:
 * - Moves posts/pages to _bin directory instead of immediate deletion
 * - Adds binned_at timestamp to frontmatter for tracking
 * - Handles filename conflicts with timestamp-based renaming
 * - Auto-detects item type (post vs page) based on filename pattern
 * - Supports restore with frontmatter cleanup (removes binned_at)
 *
 * Supported operations:
 * - GET: List all binned items with metadata
 * - POST: Move post or page to bin
 * - PUT: Restore item from bin to original location
 * - DELETE: Permanently delete item from bin
 *
 * @module netlify/functions/bin
 */

import { binSchemas, validate, formatValidationError } from '../utils/validation-schemas.mjs';
import { checkRateLimit } from '../utils/rate-limiter.mjs';
import { githubRequest, GITHUB_BRANCH } from '../utils/github-api.mjs';
import { parseFrontmatter, buildFrontmatter } from '../utils/frontmatter.mjs';
import {
  successResponse,
  badRequestResponse,
  conflictResponse,
  methodNotAllowedResponse,
  serviceUnavailableResponse,
  serverErrorResponse,
  corsPreflightResponse
} from '../utils/response-helpers.mjs';

const POSTS_DIR = '_posts';
const PAGES_DIR = '_pages';
const BIN_DIR = '_bin';

/**
 * Netlify Function Handler - Bin Management
 *
 * Main entry point for trash management. Handles all operations for the recycle bin
 * including listing, moving to bin, restoring, and permanent deletion.
 *
 * @param {Object} event - Netlify function event object
 * @param {string} request.method - HTTP method (GET, POST, PUT, DELETE, OPTIONS)
 * @param {string} event.body - Request body (JSON string)
 * @param {Object} context - Netlify function context
 * @returns {Promise<Object>} Response object with statusCode, headers, and body
 *
 * @example
 * // GET - List all binned items
 * // GET /.netlify/functions/bin
 * // Returns: {
 * //   items: [
 * //     {
 * //       name: "2025-10-21-my-post.md",
 * //       path: "_bin/2025-10-21-my-post.md",
 * //       sha: "abc123...",
 * //       type: "post",
 * //       binned_at: "2025-10-21T10:30:00Z"
 * //     }
 * //   ]
 * // }
 *
 * @example
 * // POST - Move item to bin
 * // POST /.netlify/functions/bin
 * // Body: { filename: "2025-10-21-my-post.md", sha: "abc123", type: "post" }
 * // Returns: { success: true, message: "Post moved to bin successfully" }
 *
 * @example
 * // PUT - Restore item from bin
 * // PUT /.netlify/functions/bin
 * // Body: { filename: "2025-10-21-my-post.md", sha: "abc123", type: "post" }
 * // Returns: { success: true, message: "Post restored successfully" }
 *
 * @example
 * // DELETE - Permanently delete item
 * // DELETE /.netlify/functions/bin
 * // Body: { filename: "2025-10-21-my-post.md", sha: "abc123", type: "post" }
 * // Returns: { success: true, message: "Post permanently deleted" }
 */
export default async function handler(request, context) {
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return corsPreflightResponse();
  }


  try {
    // GET - List all binned items (posts and pages)
    if (request.method === 'GET') {
      try {
        const files = await githubRequest(`/contents/${BIN_DIR}?ref=${GITHUB_BRANCH}`);

        // Filter to only .md files and categorize by type
        // Fetch content for each file to get binned_at timestamp
        const trashedItemsPromises = files
          .filter(file => file.name.endsWith('.md'))
          .map(async file => {
            // Determine type: posts start with date pattern (YYYY-MM-DD), pages don't
            const isPost = /^\d{4}-\d{2}-\d{2}-/.test(file.name);

            // Fetch file content to extract binned_at timestamp
            let trashedAt = null;
            try {
              const fileData = await githubRequest(`/contents/${BIN_DIR}/${file.name}?ref=${GITHUB_BRANCH}`);
              const content = Buffer.from(fileData.content, 'base64').toString('utf8');
              const { frontmatter } = parseFrontmatter(content);
              trashedAt = frontmatter.binned_at || null;
            } catch (error) {
              console.error(`Failed to extract binned_at for ${file.name}:`, error);
            }

            return {
              name: file.name,
              path: file.path,
              sha: file.sha,
              size: file.size,
              type: isPost ? 'post' : 'page',
              binned_at: trashedAt
            };
          });

        const trashedItems = await Promise.all(trashedItemsPromises);

        return successResponse({ items: trashedItems });
      } catch (error) {
        // If _bin folder doesn't exist, return empty array
        if (error.message.includes('404')) {
          return successResponse({ items: [] });
        }
        throw error;
      }
    }

    // POST - Move post or page to bin
    if (request.method === 'POST') {
      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse(
          'GitHub integration not configured',
          'GITHUB_TOKEN environment variable is missing'
        );
      }

      // Parse and validate request body
      let requestData;
      try {
        requestData = JSON.parse(await request.text());
      } catch (error) {
        return badRequestResponse('Invalid JSON', 'Request body must be valid JSON');
      }

      const bodyValidation = validate(binSchemas.operation, requestData);
      if (!bodyValidation.success) {
        const formatted = formatValidationError(bodyValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      const { filename, sha, type } = bodyValidation.data;

      // Determine source directory based on type (default to posts for backwards compatibility)
      const sourceDir = type === 'page' ? PAGES_DIR : POSTS_DIR;
      const itemType = type === 'page' ? 'page' : 'post';

      // Get current item content
      const itemData = await githubRequest(`/contents/${sourceDir}/${filename}?ref=${GITHUB_BRANCH}`);
      const contentBase64 = itemData.content;
      const currentSha = itemData.sha; // Use the current SHA from GitHub, not the one passed in

      // Decode content to add binned_at timestamp to frontmatter
      const content = Buffer.from(contentBase64, 'base64').toString('utf8');
      const { frontmatter, body } = parseFrontmatter(content);

      // Add binned_at to frontmatter
      const trashedAt = new Date().toISOString();
      const modifiedFrontmatter = {
        ...frontmatter,
        binned_at: trashedAt
      };

      const modifiedContent = buildFrontmatter(modifiedFrontmatter) + body;

      // Re-encode modified content
      const modifiedContentBase64 = Buffer.from(modifiedContent).toString('base64');

      // Check if file already exists in trash
      let existingTrashFile = null;
      let finalFilename = filename;

      try {
        existingTrashFile = await githubRequest(`/contents/${BIN_DIR}/${filename}?ref=${GITHUB_BRANCH}`);
      } catch (error) {
        // File doesn't exist in trash, which is fine
      }

      // If file exists in trash, rename with timestamp to avoid overwriting
      if (existingTrashFile) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5); // Format: 2025-01-21T14-30-52
        const nameParts = filename.match(/^(.+)(\.[^.]+)$/); // Split name and extension

        if (nameParts) {
          // Has extension: file.md -> file-2025-01-21T14-30-52.md
          finalFilename = `${nameParts[1]}-${timestamp}${nameParts[2]}`;
        } else {
          // No extension: file -> file-2025-01-21T14-30-52
          finalFilename = `${filename}-${timestamp}`;
        }
      }

      // Create the item in _bin folder (with original or renamed filename)
      const trashBody = {
        message: `Move ${itemType} to bin: ${finalFilename}`,
        content: modifiedContentBase64,
        branch: GITHUB_BRANCH
      };

      const trashResponse = await githubRequest(`/contents/${BIN_DIR}/${finalFilename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: trashBody
      });

      // Delete from source folder using the current SHA from GitHub
      await githubRequest(`/contents/${sourceDir}/${filename}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Remove from ${sourceDir} (moved to bin): ${filename}`,
          sha: currentSha, // Use the SHA we just fetched, not the stale one from the client
          branch: GITHUB_BRANCH
        }
      });

      return successResponse({
        success: true,
        message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} moved to bin successfully`,
        commitSha: trashResponse.commit?.sha
      });
    }

    // PUT - Restore post or page from bin
    if (request.method === 'PUT') {
      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse(
          'GitHub integration not configured',
          'GITHUB_TOKEN environment variable is missing'
        );
      }

      // Parse and validate request body
      let requestData;
      try {
        requestData = JSON.parse(await request.text());
      } catch (error) {
        return badRequestResponse('Invalid JSON', 'Request body must be valid JSON');
      }

      const bodyValidation = validate(binSchemas.operation, requestData);
      if (!bodyValidation.success) {
        const formatted = formatValidationError(bodyValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      const { filename, sha, type } = bodyValidation.data;

      // Determine destination directory based on type
      // If type not provided, auto-detect: posts start with date pattern (YYYY-MM-DD)
      let destDir, itemType;
      if (type) {
        destDir = type === 'page' ? PAGES_DIR : POSTS_DIR;
        itemType = type === 'page' ? 'page' : 'post';
      } else {
        const isPost = /^\d{4}-\d{2}-\d{2}-/.test(filename);
        destDir = isPost ? POSTS_DIR : PAGES_DIR;
        itemType = isPost ? 'post' : 'page';
      }

      // Check if file already exists in destination
      let existingFile = null;
      try {
        existingFile = await githubRequest(`/contents/${destDir}/${filename}?ref=${GITHUB_BRANCH}`);
      } catch (error) {
        // File doesn't exist, which is what we want
        if (!error.message.includes('404')) {
          throw error; // Re-throw if it's not a 404
        }
      }

      if (existingFile) {
        return conflictResponse(
          `Cannot restore "${filename}" because a file with that name already exists in ${destDir}. Please delete or rename the existing file first.`
        );
      }

      // Get trashed item content
      const trashedData = await githubRequest(`/contents/${BIN_DIR}/${filename}?ref=${GITHUB_BRANCH}`);
      const contentBase64 = trashedData.content;

      // Decode content to remove binned_at timestamp from frontmatter
      const content = Buffer.from(contentBase64, 'base64').toString('utf8');
      const { frontmatter, body } = parseFrontmatter(content);

      // Remove binned_at from frontmatter
      const { binned_at, ...cleanedFrontmatter } = frontmatter;

      const restoredContent = buildFrontmatter(cleanedFrontmatter) + body;

      // Re-encode cleaned content
      const restoredContentBase64 = Buffer.from(restoredContent).toString('base64');

      // Restore to appropriate folder
      const restoreResponse = await githubRequest(`/contents/${destDir}/${filename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Restore ${itemType} from bin: ${filename}`,
          content: restoredContentBase64,
          branch: GITHUB_BRANCH
        }
      });

      // Delete from _bin folder
      await githubRequest(`/contents/${BIN_DIR}/${filename}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Remove from bin (restored): ${filename}`,
          sha: sha,
          branch: GITHUB_BRANCH
        }
      });

      return successResponse({
        success: true,
        message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} restored successfully`,
        commitSha: restoreResponse.commit?.sha
      });
    }

    // DELETE - Permanently delete item from bin
    if (request.method === 'DELETE') {
      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse(
          'GitHub integration not configured',
          'GITHUB_TOKEN environment variable is missing'
        );
      }

      // Parse and validate request body
      let requestData;
      try {
        requestData = JSON.parse(await request.text());
      } catch (error) {
        return badRequestResponse('Invalid JSON', 'Request body must be valid JSON');
      }

      const bodyValidation = validate(binSchemas.operation, requestData);
      if (!bodyValidation.success) {
        const formatted = formatValidationError(bodyValidation.errors);
        return badRequestResponse(formatted.message, formatted);
      }

      const { filename, sha, type } = bodyValidation.data;

      const itemType = type === 'page' ? 'page' : 'post';

      // Permanently delete from _bin folder
      const deleteResponse = await githubRequest(`/contents/${BIN_DIR}/${filename}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Permanently delete ${itemType}: ${filename}`,
          sha: sha,
          branch: GITHUB_BRANCH
        }
      });

      return successResponse({
        success: true,
        message: `${itemType.charAt(0).toUpperCase() + itemType.slice(1)} permanently deleted`,
        commitSha: deleteResponse.commit?.sha
      });
    }

    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Trash function error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
}
