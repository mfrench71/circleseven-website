/**
 * Deployment History Netlify Function
 *
 * Retrieves recent deployment history from GitHub Actions.
 * Fetches the last 20 workflow runs and formats them for display in the admin dashboard.
 *
 * Maps GitHub Actions workflow runs to a simplified deployment history format
 * including status, duration, and commit information.
 *
 * Supported operations:
 * - GET: Retrieve recent deployment history
 *
 * @module netlify/functions/deployment-history
 */

const { githubRequest, GITHUB_BRANCH } = require('../utils/github-api.cjs');
const {
  successResponse,
  methodNotAllowedResponse,
  serviceUnavailableResponse,
  serverErrorResponse,
  corsPreflightResponse
} = require('../utils/response-helpers.cjs');

const WORKFLOW_NAME = 'Deploy Jekyll site to GitHub Pages';


/**
 * Netlify Function Handler - Deployment History
 *
 * Retrieves recent GitHub Actions workflow runs and formats them as
 * deployment history for dashboard display.
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP method (GET, OPTIONS)
 * @param {Object} context - Netlify function context
 * @returns {Promise<Object>} Response object with statusCode, headers, and body
 *
 * @example
 * // GET deployment history
 * // GET /.netlify/functions/deployment-history
 * // Returns: {
 * //   deployments: [
 * //     {
 * //       commitSha: "abc123def456",
 * //       action: "Update taxonomy from custom admin",
 * //       itemId: null,
 * //       status: "completed",
 * //       startedAt: "2025-10-21T10:00:00Z",
 * //       completedAt: "2025-10-21T10:05:00Z",
 * //       duration: 300,
 * //       workflowUrl: "https://github.com/.../actions/runs/123"
 * //     },
 * //     {
 * //       commitSha: "def456ghi789",
 * //       action: "Create post: 2025-10-20-new-post.md",
 * //       itemId: null,
 * //       status: "in_progress",
 * //       startedAt: "2025-10-21T10:10:00Z",
 * //       completedAt: "2025-10-21T10:10:00Z",
 * //       duration: null,
 * //       workflowUrl: "https://github.com/.../actions/runs/124"
 * //     }
 * //   ]
 * // }
 */
export const handler = async (event, context) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsPreflightResponse();
  }

  try {
    if (event.httpMethod === 'GET') {
      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse('GITHUB_TOKEN environment variable is missing');
      }

      // Get recent workflow runs (last 20)
      const runsResponse = await githubRequest(
        `/actions/runs?per_page=20&branch=main`
      );

      // Filter to only our Jekyll deployment workflow and map to simplified format
      const deployments = runsResponse.workflow_runs
        .filter(run => run.name === WORKFLOW_NAME)
        .map(run => {
          // Map GitHub Actions status to our simplified status
          let status;
          if (run.status === 'completed') {
            if (run.conclusion === 'success') {
              status = 'completed';
            } else if (run.conclusion === 'failure') {
              status = 'failed';
            } else if (run.conclusion === 'cancelled') {
              status = 'cancelled';
            } else if (run.conclusion === 'skipped') {
              status = 'skipped';
            } else {
              status = run.conclusion;
            }
          } else {
            status = run.status; // pending, queued, in_progress
          }

          // Extract commit message for action description
          const action = run.display_title || 'Deploy site';

          // Calculate duration
          const startedAt = new Date(run.created_at);
          const completedAt = run.updated_at ? new Date(run.updated_at) : null;
          const duration = completedAt
            ? Math.floor((completedAt - startedAt) / 1000)
            : null;

          return {
            commitSha: run.head_sha,
            action: action,
            itemId: null, // GitHub doesn't track this, only admin does
            status: status,
            startedAt: run.created_at,
            completedAt: run.updated_at || run.created_at,
            duration: duration,
            workflowUrl: run.html_url
          };
        });

      return successResponse({
        deployments: deployments
      });
    }

    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Deployment history function error:', error);
    return serverErrorResponse(error, {
      includeStack: process.env.NODE_ENV === 'development'
    });
  }
};
