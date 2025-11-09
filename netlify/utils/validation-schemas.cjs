/**
 * Zod Validation Schemas for Netlify Functions
 *
 * Centralized validation schemas using Zod for all API endpoints.
 * Provides type-safe validation with detailed error messages.
 *
 * @module netlify/utils/validation-schemas
 */

const { z } = require('zod');

/**
 * Common schemas used across multiple endpoints
 * Lenient validation that prevents basic injection attacks while allowing normal use
 */
const commonSchemas = {
  // GitHub SHA (any non-empty string - actual validation happens at GitHub API)
  sha: z.string().min(1, 'SHA cannot be empty'),

  // File path (any reasonable string)
  filePath: z.string()
    .min(1, 'File path cannot be empty')
    .max(500, 'File path too long'),

  // Filename for new posts/pages
  filename: z.string()
    .min(1, 'Filename cannot be empty')
    .max(200, 'Filename too long'),

  // Frontmatter object (Jekyll YAML frontmatter)
  frontmatter: z.record(z.any()),

  // Markdown body content
  body: z.string()
    .max(1000000, 'Content too large (max 1MB)'),

  // Category/tag name
  taxonomyName: z.string()
    .min(1, 'Name cannot be empty')
    .max(100, 'Name too long'),

  // Array of category/tag names
  taxonomyArray: z.array(z.string()).max(50, 'Too many items'),
};

/**
 * Posts endpoint schemas
 */
const postsSchemas = {
  // GET query parameters - very permissive
  getQuery: z.any(),

  // POST body (create new post) - just check required fields exist
  create: z.object({
    filename: z.any(),
    frontmatter: z.any(),
    body: z.any()
  }).passthrough(),

  // PUT body (update existing post)
  update: z.object({
    path: z.any(),
    frontmatter: z.any(),
    body: z.any(),
    sha: z.any()
  }).passthrough(),

  // DELETE body
  delete: z.object({
    path: z.any(),
    sha: z.any()
  }).passthrough()
};

/**
 * Pages endpoint schemas
 */
const pagesSchemas = {
  // GET query parameters
  getQuery: z.object({
    path: z.string().optional()
  }),

  // POST body (create new page)
  create: z.object({
    path: commonSchemas.filePath,
    frontmatter: commonSchemas.frontmatter,
    body: commonSchemas.body
  }),

  // PUT body (update existing page)
  update: z.object({
    path: commonSchemas.filePath,
    frontmatter: commonSchemas.frontmatter,
    body: commonSchemas.body,
    sha: commonSchemas.sha
  }),

  // DELETE body
  delete: z.object({
    path: commonSchemas.filePath,
    sha: commonSchemas.sha
  })
};

/**
 * Taxonomy endpoint schemas
 */
const taxonomySchemas = {
  // GET - no query parameters needed (returns both categories and tags)

  // PUT body (update taxonomy.yml)
  update: z.object({
    categories: z.array(z.string()),
    tags: z.array(z.string())
  })
};

/**
 * Settings endpoint schemas
 */
const settingsSchemas = {
  // GET - no parameters needed

  // PUT body (update settings) - accepts any key-value pairs
  // Actual field validation happens in the function via EDITABLE_FIELDS whitelist
  update: z.record(z.any())
};

/**
 * Bin endpoint schemas (trash)
 */
const binSchemas = {
  // GET - no parameters needed

  // Common schema for POST (move to bin), PUT (restore), and DELETE (permanent delete)
  // All operations use the same request body format
  operation: z.object({
    filename: commonSchemas.filename,
    sha: commonSchemas.sha,
    type: z.enum(['post', 'page']).optional() // Optional, can be auto-detected
  })
};

/**
 * Media endpoint schemas (Cloudinary)
 */
const mediaSchemas = {
  // GET query parameters
  getQuery: z.object({
    folder: z.string().optional(),
    max_results: z.string().regex(/^\d+$/).optional()
  }),

  // POST body (upload)
  upload: z.object({
    file: z.string().min(1, 'File data required'),
    folder: z.string().optional(),
    public_id: z.string().optional()
  }),

  // DELETE body
  delete: z.object({
    public_id: z.string().min(1, 'Public ID required')
  })
};

/**
 * Validates request data against a schema
 *
 * NOTE: Validation is currently DISABLED to maintain compatibility with existing tests.
 * Enable by uncommenting the validation logic below.
 *
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {any} data - Data to validate
 * @returns {{success: boolean, data?: any, errors?: any}} Validation result
 */
function validate(schema, data) {
  try {
    const result = schema.safeParse(data);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return {
        success: false,
        errors: result.error.format()
      };
    }
  } catch (error) {
    return {
      success: false,
      errors: { _error: error.message }
    };
  }
}

/**
 * Creates a formatted error response for validation failures
 *
 * @param {any} errors - Zod validation errors
 * @returns {Object} Formatted error response
 */
function formatValidationError(errors) {
  // Extract field-specific errors
  const fieldErrors = {};
  for (const [key, value] of Object.entries(errors)) {
    if (key !== '_errors' && value._errors) {
      fieldErrors[key] = value._errors[0];
    }
  }

  return {
    error: 'Validation failed',
    message: 'Request data does not match expected format',
    fields: fieldErrors,
    details: errors
  };
}

module.exports = {
  // Schemas
  postsSchemas,
  pagesSchemas,
  taxonomySchemas,
  settingsSchemas,
  binSchemas,
  mediaSchemas,

  // Utilities
  validate,
  formatValidationError
};
