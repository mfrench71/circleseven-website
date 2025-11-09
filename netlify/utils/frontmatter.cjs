/**
 * Frontmatter Utility
 *
 * Centralized frontmatter parsing and building for Jekyll/markdown files.
 * Provides functions to extract YAML frontmatter from markdown content and
 * convert JavaScript objects back to properly formatted YAML frontmatter.
 *
 * This utility eliminates code duplication across multiple Netlify functions
 * by providing a single, well-tested implementation.
 *
 * @module netlify/utils/frontmatter
 */

/**
 * Parses YAML frontmatter from markdown content
 *
 * Extracts frontmatter (YAML metadata) from Jekyll/markdown files and parses
 * common field types including strings, booleans, arrays, and nested values.
 *
 * Handles both inline array syntax `[item1, item2]` and YAML list syntax:
 * ```yaml
 * tags:
 *   - item1
 *   - item2
 * ```
 *
 * Special handling:
 * - String values "true"/"false" are converted to booleans
 * - Single-item arrays from non-list syntax are converted to strings
 * - Arrays from YAML list syntax (- items) remain as arrays even if single item
 *
 * @param {string} content - Raw markdown content with frontmatter
 * @returns {Object} Parsed result
 * @returns {Object} .frontmatter - Parsed frontmatter object
 * @returns {string} .body - Markdown body content (without frontmatter)
 *
 * @example
 * const { frontmatter, body } = parseFrontmatter(`---
 * title: About Us
 * layout: page
 * protected: true
 * tags:
 *   - news
 *   - featured
 * ---
 * Page content here`);
 * // frontmatter = { title: 'About Us', layout: 'page', protected: true, tags: ['news', 'featured'] }
 * // body = 'Page content here'
 *
 * @example
 * // Handles inline array syntax
 * const { frontmatter } = parseFrontmatter(`---
 * categories: [Tech, Life]
 * ---`);
 * // frontmatter = { categories: ['Tech', 'Life'] }
 */
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterText = match[1];
  const body = match[2];

  // Simple YAML parsing for common fields
  const frontmatter = {};
  const lines = frontmatterText.split('\n');
  let currentKey = null;
  let currentValue = [];
  let isArrayValue = false; // Track if value came from YAML list syntax (- items)

  for (const line of lines) {
    if (line.match(/^[a-zA-Z_]+:/)) {
      // Save previous key if exists
      if (currentKey) {
        // If items came from YAML list syntax (- items), keep as array even if single item
        // Otherwise, convert single-item array to string
        frontmatter[currentKey] = (isArrayValue || currentValue.length > 1)
          ? currentValue
          : (currentValue.length === 1 ? currentValue[0] : '');
        currentValue = [];
        isArrayValue = false;
      }

      const [key, ...valueParts] = line.split(':');
      currentKey = key.trim();
      const value = valueParts.join(':').trim();

      if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array value [item1, item2]
        frontmatter[currentKey] = value
          .slice(1, -1)
          .split(',')
          .map(v => v.trim().replace(/^["']|["']$/g, ''));
        currentKey = null;
      } else if (value) {
        // Single line value - handle booleans
        let parsedValue = value.replace(/^["']|["']$/g, '');
        if (parsedValue === 'true') parsedValue = true;
        else if (parsedValue === 'false') parsedValue = false;
        currentValue.push(parsedValue);
      }
    } else if (currentKey && line.trim().startsWith('-')) {
      // Array item from YAML list syntax
      isArrayValue = true;
      currentValue.push(line.trim().substring(1).trim().replace(/^["']|["']$/g, ''));
    }
  }

  // Save last key
  if (currentKey) {
    frontmatter[currentKey] = (isArrayValue || currentValue.length > 1)
      ? currentValue
      : (currentValue.length === 1 ? currentValue[0] : '');
  }

  return { frontmatter, body: body.trim() };
}

/**
 * Builds YAML frontmatter string from object
 *
 * Converts a JavaScript object into properly formatted YAML frontmatter
 * suitable for Jekyll markdown files. Handles strings, numbers, booleans,
 * and arrays with proper formatting.
 *
 * Formatting rules:
 * - Booleans are output without quotes (true/false)
 * - Empty arrays use inline syntax: `key: []`
 * - Non-empty arrays use YAML list syntax with proper indentation
 * - null and undefined values are skipped
 *
 * @param {Object} frontmatter - Frontmatter object to convert
 * @returns {string} YAML frontmatter string with delimiters (---\n...\n---\n)
 *
 * @example
 * const yaml = buildFrontmatter({
 *   title: 'About',
 *   layout: 'page',
 *   protected: true,
 *   tags: ['news', 'featured']
 * });
 * // Returns:
 * // ---
 * // title: About
 * // layout: page
 * // protected: true
 * // tags:
 * //   - news
 * //   - featured
 * // ---
 *
 * @example
 * // Handles empty arrays
 * const yaml = buildFrontmatter({ tags: [] });
 * // Returns:
 * // ---
 * // tags: []
 * // ---
 */
function buildFrontmatter(frontmatter) {
  let yaml = '---\n';

  for (const [key, value] of Object.entries(frontmatter)) {
    // Skip null and undefined values
    if (value === null || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        yaml += `${key}: []\n`;
      } else {
        yaml += `${key}:\n`;
        value.forEach(item => {
          yaml += `  - ${item}\n`;
        });
      }
    } else if (typeof value === 'boolean') {
      // Output booleans without quotes
      yaml += `${key}: ${value}\n`;
    } else {
      yaml += `${key}: ${value}\n`;
    }
  }

  yaml += '---\n';
  return yaml;
}

module.exports = {
  parseFrontmatter,
  buildFrontmatter
};
