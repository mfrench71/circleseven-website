const https = require('https');
const yaml = require('js-yaml');

// GitHub API configuration
const GITHUB_OWNER = 'mfrench71';
const GITHUB_REPO = 'circleseven-website';
const GITHUB_BRANCH = 'main';
const FILE_PATH = '_config.yml';

// Editable settings (whitelist for security)
const EDITABLE_FIELDS = [
  'title',
  'description',
  'author',
  'email',
  'github_username',
  'paginate',
  'related_posts_count',
  'timezone',
  'lang'
];

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
    // GET - Read settings from _config.yml
    if (event.httpMethod === 'GET') {
      const fileData = await githubRequest(`/contents/${FILE_PATH}?ref=${GITHUB_BRANCH}`);
      const content = Buffer.from(fileData.content, 'base64').toString('utf8');
      const config = yaml.load(content);

      // Extract only editable fields
      const settings = {};
      EDITABLE_FIELDS.forEach(field => {
        if (config.hasOwnProperty(field)) {
          settings[field] = config[field];
        }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(settings)
      };
    }

    // PUT - Update settings in _config.yml
    if (event.httpMethod === 'PUT') {
      // Check for GitHub token
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

      const updates = JSON.parse(event.body);

      // Validate that only editable fields are being updated
      const invalidFields = Object.keys(updates).filter(
        field => !EDITABLE_FIELDS.includes(field)
      );
      if (invalidFields.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid fields',
            message: `Cannot update fields: ${invalidFields.join(', ')}`
          })
        };
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

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Settings updated successfully. Netlify will rebuild the site automatically in 1-2 minutes.',
          commitSha: updateResponse.commit?.sha
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Settings function error:', error);
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
