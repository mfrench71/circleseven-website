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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          deployments: deployments
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Deployment history function error:', error);
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
