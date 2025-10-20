const https = require('https');

// GitHub API configuration
const GITHUB_OWNER = 'mfrench71';
const GITHUB_REPO = 'circleseven-website';
const GITHUB_BRANCH = 'main';
const POSTS_DIR = '_posts';
const TRASH_DIR = '_trash';

// Helper to make GitHub API requests
function githubRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: `/repos/${GITHUB_OWNER}/${GITHUB_REPO}${path}`,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Netlify-Function',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        ...options.headers
      }
    }, (res) => {
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
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // GET - List all trashed posts
    if (event.httpMethod === 'GET') {
      try {
        const files = await githubRequest(`/contents/${TRASH_DIR}?ref=${GITHUB_BRANCH}`);

        // Filter to only .md files
        const trashedPosts = files
          .filter(file => file.name.endsWith('.md'))
          .map(file => ({
            name: file.name,
            path: file.path,
            sha: file.sha,
            size: file.size
          }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ posts: trashedPosts })
        };
      } catch (error) {
        // If _trash folder doesn't exist, return empty array
        if (error.message.includes('404')) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ posts: [] })
          };
        }
        throw error;
      }
    }

    // POST - Move post to trash
    if (event.httpMethod === 'POST') {
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

      const { filename, sha } = JSON.parse(event.body);

      if (!filename || !sha) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Missing required fields',
            message: 'filename and sha are required'
          })
        };
      }

      // Get current post content
      const postData = await githubRequest(`/contents/${POSTS_DIR}/${filename}?ref=${GITHUB_BRANCH}`);
      const content = postData.content;

      // Create the post in _trash folder
      await githubRequest(`/contents/${TRASH_DIR}/${filename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Move post to trash: ${filename}`,
          content: content,
          branch: GITHUB_BRANCH
        }
      });

      // Delete from _posts folder
      await githubRequest(`/contents/${POSTS_DIR}/${filename}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Remove from posts (moved to trash): ${filename}`,
          sha: sha,
          branch: GITHUB_BRANCH
        }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Post moved to trash successfully'
        })
      };
    }

    // PUT - Restore post from trash
    if (event.httpMethod === 'PUT') {
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

      const { filename, sha } = JSON.parse(event.body);

      if (!filename || !sha) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Missing required fields',
            message: 'filename and sha are required'
          })
        };
      }

      // Get trashed post content
      const trashedData = await githubRequest(`/contents/${TRASH_DIR}/${filename}?ref=${GITHUB_BRANCH}`);
      const content = trashedData.content;

      // Restore to _posts folder
      await githubRequest(`/contents/${POSTS_DIR}/${filename}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Restore post from trash: ${filename}`,
          content: content,
          branch: GITHUB_BRANCH
        }
      });

      // Delete from _trash folder
      await githubRequest(`/contents/${TRASH_DIR}/${filename}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Remove from trash (restored): ${filename}`,
          sha: sha,
          branch: GITHUB_BRANCH
        }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Post restored successfully'
        })
      };
    }

    // DELETE - Permanently delete post from trash
    if (event.httpMethod === 'DELETE') {
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

      const { filename, sha } = JSON.parse(event.body);

      if (!filename || !sha) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Missing required fields',
            message: 'filename and sha are required'
          })
        };
      }

      // Permanently delete from _trash folder
      await githubRequest(`/contents/${TRASH_DIR}/${filename}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: {
          message: `Permanently delete post: ${filename}`,
          sha: sha,
          branch: GITHUB_BRANCH
        }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Post permanently deleted'
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Trash function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    };
  }
};
