/**
 * Deployment Status Netlify Function
 *
 * Monitors GitHub Actions workflow status for specific commits.
 * Used to track deployment progress after content changes.
 *
 * Queries GitHub Actions API to find workflow runs matching a commit SHA
 * and returns simplified status information for UI display.
 *
 * Supported operations:
 * - GET: Check deployment status for a specific commit
 *
 * @module netlify/functions/deployment-status
 */

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

const WORKFLOW_NAME = 'Deploy Jekyll site to GitHub Pages';


/**
 * Netlify Function Handler - Deployment Status
 *
 * Checks the deployment status for a specific commit by querying
 * GitHub Actions workflow runs.
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP method (GET, OPTIONS)
 * @param {Object} event.queryStringParameters - URL query parameters
 * @param {string} event.queryStringParameters.sha - Commit SHA to check
 * @param {Object} context - Netlify function context
 * @returns {Promise<Object>} Response object with statusCode, headers, and body
 *
 * @example
 * // Check deployment status
 * // GET /.netlify/functions/deployment-status?sha=abc123def456
 * // Returns: {
 * //   status: "in_progress",
 * //   message: "Deploying to GitHub Pages...",
 * //   commitSha: "abc123def456",
 * //   workflowUrl: "https://github.com/.../actions/runs/123",
 * //   startedAt: "2025-10-21T10:00:00Z",
 * //   updatedAt: "2025-10-21T10:02:30Z",
 * //   conclusion: null
 * // }
 *
 * @example
 * // Deployment completed successfully
 * // Returns: {
 * //   status: "completed",
 * //   message: "Deployment completed successfully",
 * //   commitSha: "abc123def456",
 * //   workflowUrl: "https://github.com/.../actions/runs/123",
 * //   startedAt: "2025-10-21T10:00:00Z",
 * //   updatedAt: "2025-10-21T10:05:00Z",
 * //   conclusion: "success"
 * // }
 */
export const handler = async (event, context) => {
  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return corsPreflightResponse();
  }

  // Check rate limit
  const rateLimitResponse = checkRateLimit(event);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    if (event.httpMethod === 'GET') {
      const commitSha = event.queryStringParameters?.sha;

      if (!commitSha) {
        return badRequestResponse('sha query parameter is required', { error: 'Missing required parameter' });
      }

      if (!process.env.GITHUB_TOKEN) {
        return serviceUnavailableResponse('GITHUB_TOKEN environment variable is missing');
      }

      // Get workflow runs for this commit SHA
      // We'll look at the most recent runs and find ones matching our commit
      const runsResponse = await githubRequest(
        `/actions/runs?per_page=20&branch=main`
      );

      // Find workflow runs for this specific commit
      const matchingRuns = runsResponse.workflow_runs.filter(run =>
        run.head_sha === commitSha && run.name === WORKFLOW_NAME
      );

      if (matchingRuns.length === 0) {
        // No workflow run found yet - it may not have started
        return successResponse({
          status: 'pending',
          message: 'Waiting for deployment to start...',
          commitSha: commitSha
        });
      }

      // Get the most recent run for this commit
      const workflowRun = matchingRuns[0];

      // Map GitHub Actions status to our simplified status
      let deploymentStatus;
      let message;

      switch (workflowRun.status) {
        case 'pending':
          deploymentStatus = 'pending';
          message = 'Deployment pending...';
          break;
        case 'queued':
          deploymentStatus = 'queued';
          message = 'Deployment queued...';
          break;
        case 'in_progress':
          deploymentStatus = 'in_progress';
          message = 'Deploying to GitHub Pages...';
          break;
        case 'completed':
          // Check conclusion to see if it succeeded or failed
          if (workflowRun.conclusion === 'success') {
            deploymentStatus = 'completed';
            message = 'Deployment completed successfully';
          } else if (workflowRun.conclusion === 'failure') {
            deploymentStatus = 'failed';
            message = 'Deployment failed';
          } else if (workflowRun.conclusion === 'cancelled') {
            deploymentStatus = 'cancelled';
            message = 'Deployment cancelled';
          } else if (workflowRun.conclusion === 'skipped') {
            deploymentStatus = 'skipped';
            message = 'Deployment skipped (superseded by newer commit)';
          } else {
            deploymentStatus = 'completed';
            message = `Deployment completed with status: ${workflowRun.conclusion}`;
          }
          break;
        default:
          deploymentStatus = 'unknown';
          message = `Unknown deployment status: ${workflowRun.status}`;
      }

      return successResponse({
        status: deploymentStatus,
        message: message,
        commitSha: commitSha,
        workflowUrl: workflowRun.html_url,
        startedAt: workflowRun.created_at,
        updatedAt: workflowRun.updated_at,
        conclusion: workflowRun.conclusion
      });
    }

    return methodNotAllowedResponse();

  } catch (error) {
    console.error('Deployment status function error:', error);
    return serverErrorResponse(error, { includeStack: process.env.NODE_ENV === 'development' });
  }
};
