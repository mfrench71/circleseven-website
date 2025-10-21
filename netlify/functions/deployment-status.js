const https = require('https');

// GitHub API configuration
const GITHUB_OWNER = 'mfrench71';
const GITHUB_REPO = 'circleseven-website';
const WORKFLOW_NAME = 'Deploy Jekyll site to GitHub Pages';

// Helper to make GitHub API requests
function githubRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Netlify-Function',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        ...options.headers
      }
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GitHub API error: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    if (event.httpMethod === 'GET') {
      const commitSha = event.queryStringParameters?.sha;

      if (!commitSha) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Missing required parameter',
            message: 'sha query parameter is required'
          })
        };
      }

      if (!process.env.GITHUB_TOKEN) {
        return {
          statusCode: 503,
          headers,
          body: JSON.stringify({
            error: 'GitHub integration not configured',
            message: 'GITHUB_TOKEN environment variable is missing'
          })
        };
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
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'pending',
            message: 'Waiting for deployment to start...',
            commitSha: commitSha
          })
        };
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
          } else {
            deploymentStatus = 'completed';
            message = `Deployment completed with status: ${workflowRun.conclusion}`;
          }
          break;
        default:
          deploymentStatus = 'unknown';
          message = `Unknown deployment status: ${workflowRun.status}`;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: deploymentStatus,
          message: message,
          commitSha: commitSha,
          workflowUrl: workflowRun.html_url,
          startedAt: workflowRun.created_at,
          updatedAt: workflowRun.updated_at,
          conclusion: workflowRun.conclusion
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Deployment status function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        details: error.toString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
