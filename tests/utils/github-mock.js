/**
 * HTTP API Mocking Utility for Backend Tests
 *
 * Provides a reliable way to mock GitHub and Cloudinary API responses for Netlify function tests.
 * Uses nock for intercepting HTTPS requests.
 */

import nock from 'nock';

const GITHUB_API = 'https://api.github.com';
const CLOUDINARY_API = 'https://api.cloudinary.com';

/**
 * Setup nock interceptor for GitHub API
 * @param {Object} options - Mock configuration
 * @param {string} options.method - HTTP method (GET, POST, PUT, DELETE)
 * @param {string} options.path - GitHub API path (e.g., '/repos/user/repo/contents/_posts')
 * @param {number} options.statusCode - Response status code (default: 200)
 * @param {*} options.responseBody - Response body (will be JSON stringified)
 * @param {Object} options.headers - Additional response headers
 * @returns {nock.Scope} The nock scope for chaining
 */
export function mockGitHubAPI({ method = 'GET', path, statusCode = 200, responseBody, headers = {} }) {
  const defaultHeaders = {
    'content-type': 'application/json',
    'x-ratelimit-remaining': '5000',
    'x-ratelimit-limit': '5000',
    ...headers
  };

  return nock(GITHUB_API)
    [method.toLowerCase()](path)
    .reply(statusCode, responseBody, defaultHeaders);
}

/**
 * Mock GET request to list repository contents
 * @param {string} path - Repository path (e.g., '_posts')
 * @param {Array} files - Array of file objects
 * @returns {nock.Scope}
 */
export function mockListContents(path, files) {
  return mockGitHubAPI({
    method: 'GET',
    path: `/repos/mfrench71/circleseven-website/contents/${path}?ref=main`,
    responseBody: files
  });
}

/**
 * Mock GET request to retrieve file content
 * @param {string} path - File path
 * @param {Object} file - File object with content, sha, etc.
 * @returns {nock.Scope}
 */
export function mockGetFile(path, file) {
  return mockGitHubAPI({
    method: 'GET',
    path: `/repos/mfrench71/circleseven-website/contents/${path}?ref=main`,
    responseBody: file
  });
}

/**
 * Mock PUT request to create/update file
 * @param {string} path - File path
 * @param {Object} response - Response object
 * @returns {nock.Scope}
 */
export function mockPutFile(path, response) {
  return mockGitHubAPI({
    method: 'PUT',
    path: `/repos/mfrench71/circleseven-website/contents/${path}`,
    responseBody: response
  });
}

/**
 * Mock DELETE request to remove file
 * @param {string} path - File path
 * @param {Object} response - Response object
 * @returns {nock.Scope}
 */
export function mockDeleteFile(path, response = { message: 'deleted' }) {
  return mockGitHubAPI({
    method: 'DELETE',
    path: `/repos/mfrench71/circleseven-website/contents/${path}`,
    responseBody: response
  });
}

/**
 * Mock GitHub Actions workflow runs
 * @param {Array} runs - Array of workflow run objects
 * @returns {nock.Scope}
 */
export function mockWorkflowRuns(runs) {
  return mockGitHubAPI({
    method: 'GET',
    path: '/repos/mfrench71/circleseven-website/actions/runs?per_page=20&branch=main',
    responseBody: { workflow_runs: runs }
  });
}

/**
 * Mock a single workflow run
 * @param {number} runId - Workflow run ID
 * @param {Object} run - Workflow run object
 * @returns {nock.Scope}
 */
export function mockWorkflowRun(runId, run) {
  return mockGitHubAPI({
    method: 'GET',
    path: `/repos/mfrench71/circleseven-website/actions/runs/${runId}`,
    responseBody: run
  });
}

/**
 * Mock GitHub API error response
 * @param {string} method - HTTP method
 * @param {string} path - API path
 * @param {number} statusCode - Error status code (e.g., 401, 404, 500)
 * @param {string} message - Error message
 * @returns {nock.Scope}
 */
export function mockGitHubError(method, path, statusCode, message) {
  return mockGitHubAPI({
    method,
    path,
    statusCode,
    responseBody: {
      message,
      documentation_url: 'https://docs.github.com/rest'
    }
  });
}

/**
 * Clean all nock interceptors
 */
export function cleanMocks() {
  nock.cleanAll();
}

/**
 * Restore nock to normal behavior
 */
export function restoreMocks() {
  nock.restore();
}

/**
 * Enable nock recording (for debugging)
 */
export function enableRecording() {
  nock.recorder.rec();
}

/**
 * Get recorded nock fixtures (for debugging)
 */
export function getRecordings() {
  return nock.recorder.play();
}

/**
 * Mock GitHub rate limit response
 * @param {Object} rateLimitData - Rate limit data object
 * @returns {nock.Scope}
 */
export function mockRateLimit(rateLimitData) {
  return mockGitHubAPI({
    method: 'GET',
    path: '/rate_limit',
    responseBody: rateLimitData
  });
}

/**
 * Mock Cloudinary API resources response
 * @param {Array} resources - Array of Cloudinary resource objects
 * @param {Object} options - Additional options (next_cursor, etc.)
 * @returns {nock.Scope}
 */
export function mockCloudinaryResources(resources, options = {}) {
  return nock(CLOUDINARY_API)
    .get(/\/v1_1\/[^\/]+\/resources\/image/)
    .reply(200, {
      resources,
      ...options
    });
}

/**
 * Mock Cloudinary API error response
 * @param {number} statusCode - Error status code
 * @param {string} message - Error message
 * @returns {nock.Scope}
 */
export function mockCloudinaryError(statusCode, message) {
  return nock(CLOUDINARY_API)
    .get(/\/v1_1\/[^\/]+\/resources\/image/)
    .reply(statusCode, {
      error: { message }
    });
}

/**
 * Mock Cloudinary API folders response
 * @param {Array} folders - Array of folder objects
 * @returns {nock.Scope}
 */
export function mockCloudinaryFolders(folders) {
  return nock(CLOUDINARY_API)
    .get(/\/v1_1\/[^\/]+\/folders/)
    .reply(200, {
      folders
    });
}

/**
 * Mock Cloudinary API folders error response
 * @param {number} statusCode - Error status code
 * @param {string} message - Error message
 * @returns {nock.Scope}
 */
export function mockCloudinaryFoldersError(statusCode, message) {
  return nock(CLOUDINARY_API)
    .get(/\/v1_1\/[^\/]+\/folders/)
    .reply(statusCode, {
      error: { message }
    });
}
