/**
 * Content Health Netlify Function
 *
 * Analyzes published posts for quality issues like missing featured images,
 * missing categories/tags, missing excerpts, and content that's too short.
 *
 * @module netlify/functions/content-health
 */

const { checkRateLimit } = require('../utils/rate-limiter.cjs');
const { githubRequest } = require('../utils/github-api.cjs');
const {
  successResponse,
  methodNotAllowedResponse,
  serverErrorResponse,
  corsPreflightResponse
} = require('../utils/response-helpers.cjs');

/**
 * Minimum word count for content quality (approx 300 words = 1500 chars)
 */
const MIN_WORD_COUNT = 300;
const AVG_CHARS_PER_WORD = 5;
const MIN_CONTENT_LENGTH = MIN_WORD_COUNT * AVG_CHARS_PER_WORD;

/**
 * Parses front matter from markdown content
 */
function parseFrontMatter(content) {
  const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontMatterMatch) {
    return { frontMatter: {}, body: content };
  }

  const frontMatterText = frontMatterMatch[1];
  const body = content.substring(frontMatterMatch[0].length).trim();

  // Simple YAML parser for our needs
  const frontMatter = {};
  const lines = frontMatterText.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) continue;

    const key = trimmedLine.substring(0, colonIndex).trim();
    let value = trimmedLine.substring(colonIndex + 1).trim();

    // Handle multi-line arrays (Jekyll-style with dashes)
    if (value === '' || value === '[]') {
      // Look ahead for array items starting with dash
      const arrayItems = [];
      let j = i + 1;

      while (j < lines.length) {
        const nextLine = lines[j];
        const nextTrimmed = nextLine.trim();

        // Check if this line is an array item (starts with dash)
        if (nextTrimmed.startsWith('- ')) {
          arrayItems.push(nextTrimmed.substring(2).trim().replace(/['"]/g, ''));
          j++;
        } else if (nextTrimmed === '' || nextTrimmed.startsWith('#')) {
          // Skip empty lines and comments within the array
          j++;
        } else {
          // Hit a non-array line, stop collecting
          break;
        }
      }

      if (arrayItems.length > 0) {
        value = arrayItems;
        i = j - 1; // Skip the lines we've already processed
      }
    }
    // Handle inline arrays [item1, item2]
    else if (value.startsWith('[') && value.endsWith(']')) {
      value = value.substring(1, value.length - 1)
        .split(',')
        .map(v => v.trim().replace(/['"]/g, ''))
        .filter(v => v);
    }
    // Remove quotes from string values
    else if ((value.startsWith('"') && value.endsWith('"')) ||
             (value.startsWith("'") && value.endsWith("'"))) {
      value = value.substring(1, value.length - 1);
    }

    frontMatter[key] = value;
  }

  return { frontMatter, body };
}

/**
 * Analyzes a single post for health issues
 */
function analyzePost(file, content) {
  const { frontMatter, body } = parseFrontMatter(content);
  const issues = [];

  // Extract title from filename
  let title = file.name.replace(/\.md$/, '');
  title = title.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  title = title.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  // Use front matter title if available
  if (frontMatter.title) {
    title = frontMatter.title;
  }

  // Check for featured image
  if (!frontMatter.featured_image && !frontMatter.image && !frontMatter.header_image) {
    issues.push({
      type: 'no_featured_image',
      severity: 'warning',
      message: 'No featured image'
    });
  }

  // Check for categories
  const categories = frontMatter.categories;
  if (!categories || (Array.isArray(categories) && categories.length === 0)) {
    issues.push({
      type: 'no_categories',
      severity: 'warning',
      message: 'No categories assigned'
    });
  }

  // Check for tags
  const tags = frontMatter.tags;
  if (!tags || (Array.isArray(tags) && tags.length === 0)) {
    issues.push({
      type: 'no_tags',
      severity: 'info',
      message: 'No tags assigned'
    });
  }

  // Check for excerpt
  if (!frontMatter.excerpt && !frontMatter.description) {
    issues.push({
      type: 'no_excerpt',
      severity: 'info',
      message: 'No excerpt or description'
    });
  }

  // Check content length (excluding front matter and code blocks)
  const bodyWithoutCode = body.replace(/```[\s\S]*?```/g, '');
  const contentLength = bodyWithoutCode.length;

  if (contentLength < MIN_CONTENT_LENGTH) {
    const estimatedWords = Math.floor(contentLength / AVG_CHARS_PER_WORD);
    issues.push({
      type: 'short_content',
      severity: 'warning',
      message: `Content is short (approx ${estimatedWords} words, recommended min ${MIN_WORD_COUNT})`
    });
  }

  return {
    filename: file.name,
    title,
    slug: file.name.replace(/\.md$/, ''),
    issueCount: issues.length,
    issues,
    wordCount: Math.floor(contentLength / AVG_CHARS_PER_WORD)
  };
}

/**
 * Fetches and analyzes all posts
 */
async function analyzeAllPosts() {
  try {
    // Fetch all posts from _posts directory
    const files = await githubRequest('/contents/_posts');

    if (!Array.isArray(files)) {
      return {
        total: 0,
        withIssues: 0,
        posts: []
      };
    }

    // Filter markdown files
    const mdFiles = files.filter(f => f.name.endsWith('.md'));

    // Fetch and analyze each file
    const analyses = await Promise.all(
      mdFiles.map(async (file) => {
        try {
          // Fetch file content
          const fileData = await githubRequest(`/contents/_posts/${file.name}`);
          const content = Buffer.from(fileData.content, 'base64').toString('utf-8');

          return analyzePost(file, content);
        } catch (error) {
          console.error(`Failed to analyze ${file.name}:`, error);
          return {
            filename: file.name,
            title: file.name,
            slug: file.name.replace(/\.md$/, ''),
            issueCount: 0,
            issues: [],
            error: 'Failed to analyze file'
          };
        }
      })
    );

    // Sort by issue count (most issues first)
    const sortedAnalyses = analyses.sort((a, b) => b.issueCount - a.issueCount);

    // Calculate statistics
    const withIssues = sortedAnalyses.filter(a => a.issueCount > 0).length;

    // Group by issue type
    const issuesByType = {
      no_featured_image: 0,
      no_categories: 0,
      no_tags: 0,
      no_excerpt: 0,
      short_content: 0
    };

    sortedAnalyses.forEach(analysis => {
      analysis.issues.forEach(issue => {
        if (issuesByType.hasOwnProperty(issue.type)) {
          issuesByType[issue.type]++;
        }
      });
    });

    return {
      total: mdFiles.length,
      withIssues,
      healthy: mdFiles.length - withIssues,
      issuesByType,
      posts: sortedAnalyses
    };
  } catch (error) {
    console.error('Failed to analyze posts:', error);
    throw error;
  }
}

/**
 * Main handler function
 */
exports.handler = async (event, context) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return corsPreflightResponse();
  }

  // Check rate limit
  const rateLimitResponse = checkRateLimit(event);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return methodNotAllowedResponse();
  }

  try {
    const healthData = await analyzeAllPosts();

    return successResponse(healthData, 200, {
      'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
    });
  } catch (error) {
    console.error('Error analyzing content health:', error);
    return serverErrorResponse(error);
  }
};
