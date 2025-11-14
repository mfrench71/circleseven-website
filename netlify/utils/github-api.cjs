/**
 * GitHub API Utility
 *
 * Centralized GitHub API client for Netlify functions.
 * Provides authenticated requests to the GitHub REST API.
 *
 * This utility eliminates code duplication across multiple Netlify functions
 * by providing a single, well-tested implementation of GitHub API requests.
 *
 * @module netlify/utils/github-api
 */

const https = require('https');

// GitHub repository configuration
const GITHUB_OWNER = 'mfrench71';
const GITHUB_REPO = 'circleseven-website';
const GITHUB_BRANCH = 'main';

/**
 * Makes authenticated requests to the GitHub API
 *
 * Handles the low-level details of making HTTPS requests to GitHub's REST API,
 * including authentication, error handling, and JSON parsing.
 *
 * @param {string} path - GitHub API endpoint path (relative to /repos/{owner}/{repo})
 * @param {Object} [options={}] - Request options
 * @param {string} [options.method='GET'] - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {Object} [options.headers] - Additional headers to include in the request
 * @param {Object} [options.body] - Request body (will be JSON stringified)
 * @returns {Promise<Object>} Parsed JSON response from GitHub API
 * @throws {Error} If the GitHub API returns a non-2xx status code
 *
 * @example
 * // Get file contents
 * const fileData = await githubRequest('/contents/_config.yml?ref=main');
 *
 * @example
 * // Create or update a file
 * const response = await githubRequest('/contents/_posts/new-post.md', {
 *   method: 'PUT',
 *   body: {
 *     message: 'Create new post',
 *     content: Buffer.from('# Hello World').toString('base64'),
 *     sha: 'abc123', // Required for updates, omit for new files
 *     branch: 'main'
 *   }
 * });
 *
 * @example
 * // Delete a file
 * await githubRequest('/contents/_posts/old-post.md', {
 *   method: 'DELETE',
 *   body: {
 *     message: 'Delete old post',
 *     sha: 'abc123',
 *     branch: 'main'
 *   }
 * });
 */
function githubRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const bodyString = options.body ? JSON.stringify(options.body) : null;
    const headers = {
      'User-Agent': 'Netlify-Function',
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      ...options.headers
    };

    // Add Content-Length header if there's a body
    if (bodyString) {
      headers['Content-Length'] = Buffer.byteLength(bodyString);
    }

    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`,
      method: options.method || 'GET',
      headers: headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(new Error(`Failed to parse GitHub API response: ${error.message}`));
          }
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    if (bodyString) {
      req.write(bodyString);
    }
    req.end();
  });
}

module.exports = {
  githubRequest,
  GITHUB_OWNER,
  GITHUB_REPO,
  GITHUB_BRANCH
};
