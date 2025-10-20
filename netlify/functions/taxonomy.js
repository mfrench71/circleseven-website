const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { promisify } = require('util');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const TAXONOMY_FILE = path.join(process.cwd(), '_data', 'taxonomy.yml');

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
    // GET - Read taxonomy
    if (event.httpMethod === 'GET') {
      const content = await readFile(TAXONOMY_FILE, 'utf8');
      const taxonomy = yaml.load(content);

      // Extract strings from objects
      const extractStrings = (arr) => arr.map(item =>
        typeof item === 'string' ? item : (item.item || item)
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          categories: extractStrings(taxonomy.categories),
          tags: extractStrings(taxonomy.tags)
        })
      };
    }

    // PUT - Update taxonomy
    if (event.httpMethod === 'PUT') {
      const { categories, tags } = JSON.parse(event.body);

      // Validate input
      if (!Array.isArray(categories) || !Array.isArray(tags)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid input: categories and tags must be arrays' })
        };
      }

      // Convert to object format
      const taxonomy = {
        categories: categories.map(cat => ({ item: cat })),
        tags: tags.map(tag => ({ item: tag }))
      };

      // Create YAML with comments
      const yamlContent = `# Site Taxonomy - Manage categories and tags used across the site
# Edit these lists in CMS Settings > Taxonomy (Categories & Tags)

categories:
${taxonomy.categories.map(c => `  - item: ${c.item}`).join('\n')}

tags:
${taxonomy.tags.map(t => `  - item: ${t.item}`).join('\n')}
`;

      await writeFile(TAXONOMY_FILE, yamlContent, 'utf8');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Taxonomy updated successfully'
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Taxonomy function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};
