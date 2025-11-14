/**
 * Unit Tests for Validation Schemas Utility
 *
 * Tests Zod validation schemas for all API endpoints.
 * Validates schema definitions and error formatting.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';

// Import the actual implementation
const {
  postsSchemas,
  pagesSchemas,
  taxonomySchemas,
  settingsSchemas,
  binSchemas,
  mediaSchemas,
  validate,
  formatValidationError
} = await import('../../../netlify/utils/validation-schemas.cjs');

describe('Validation Schemas Utility', () => {
  describe('validate()', () => {
    it('returns success for valid data', () => {
      const schema = postsSchemas.create;
      const data = {
        filename: '2025-01-01-test.md',
        frontmatter: { title: 'Test' },
        body: 'Content'
      };

      const result = validate(schema, data);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.filename).toBe('2025-01-01-test.md');
    });

    it('returns errors for invalid data', () => {
      const schema = postsSchemas.create;
      const data = {
        // Missing required fields
      };

      const result = validate(schema, data);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });

    it('includes error details in response', () => {
      const schema = postsSchemas.update;
      const data = {
        path: '', // Invalid: empty string
        sha: 'abc123'
      };

      const result = validate(schema, data);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('formatValidationError()', () => {
    it('formats validation errors with field information', () => {
      const schema = postsSchemas.create;
      const data = {}; // Missing required fields

      const validation = validate(schema, data);
      const formatted = formatValidationError(validation.errors);

      expect(formatted.error).toBeDefined();
      expect(formatted.message).toBeDefined();
      expect(formatted.fields).toBeDefined();
      expect(typeof formatted.message).toBe('string');
    });

    it('includes field names in message', () => {
      const schema = postsSchemas.create;
      const data = {
        filename: '2025-01-01-test.md'
        // Missing frontmatter and body
      };

      const validation = validate(schema, data);
      const formatted = formatValidationError(validation.errors);

      expect(formatted.message).toContain('field');
    });

    it('provides backwards-compatible error format', () => {
      const schema = postsSchemas.create;
      const data = {};

      const validation = validate(schema, data);
      const formatted = formatValidationError(validation.errors);

      expect(formatted.error).toContain('Validation failed');
      expect(formatted.message).toBeDefined();
      expect(formatted.fields).toBeDefined();
      expect(formatted.details).toBeDefined();
    });
  });

  describe('postsSchemas', () => {
    describe('create schema', () => {
      it('validates required fields', () => {
        const validData = {
          filename: '2025-01-01-test.md',
          frontmatter: { title: 'Test' },
          body: 'Content'
        };

        const result = validate(postsSchemas.create, validData);

        expect(result.success).toBe(true);
      });

      it('rejects missing filename', () => {
        const invalidData = {
          frontmatter: { title: 'Test' },
          body: 'Content'
        };

        const result = validate(postsSchemas.create, invalidData);

        expect(result.success).toBe(false);
      });

      it('rejects empty filename', () => {
        const invalidData = {
          filename: '',
          frontmatter: { title: 'Test' },
          body: 'Content'
        };

        const result = validate(postsSchemas.create, invalidData);

        expect(result.success).toBe(false);
      });

      it('allows passthrough of additional fields', () => {
        const dataWithExtra = {
          filename: '2025-01-01-test.md',
          frontmatter: { title: 'Test' },
          body: 'Content',
          extraField: 'extra'
        };

        const result = validate(postsSchemas.create, dataWithExtra);

        expect(result.success).toBe(true);
        expect(result.data.extraField).toBe('extra');
      });
    });

    describe('update schema', () => {
      it('validates required fields', () => {
        const validData = {
          path: '_posts/2025-01-01-test.md',
          frontmatter: { title: 'Updated' },
          body: 'Updated content',
          sha: 'abc123'
        };

        const result = validate(postsSchemas.update, validData);

        expect(result.success).toBe(true);
      });

      it('rejects missing sha', () => {
        const invalidData = {
          path: '_posts/2025-01-01-test.md',
          frontmatter: { title: 'Test' },
          body: 'Content'
        };

        const result = validate(postsSchemas.update, invalidData);

        expect(result.success).toBe(false);
      });

      it('rejects empty path', () => {
        const invalidData = {
          path: '',
          sha: 'abc123'
        };

        const result = validate(postsSchemas.update, invalidData);

        expect(result.success).toBe(false);
      });
    });

    describe('delete schema', () => {
      it('validates required fields', () => {
        const validData = {
          path: '_posts/2025-01-01-test.md',
          sha: 'abc123'
        };

        const result = validate(postsSchemas.delete, validData);

        expect(result.success).toBe(true);
      });

      it('rejects missing path', () => {
        const invalidData = {
          sha: 'abc123'
        };

        const result = validate(postsSchemas.delete, invalidData);

        expect(result.success).toBe(false);
      });
    });
  });

  describe('pagesSchemas', () => {
    describe('create schema', () => {
      it('validates required fields', () => {
        const validData = {
          path: '_pages/about.md',
          frontmatter: { title: 'About' },
          body: 'About page'
        };

        const result = validate(pagesSchemas.create, validData);

        expect(result.success).toBe(true);
      });

      it('rejects undefined frontmatter', () => {
        const invalidData = {
          path: '_pages/about.md',
          body: 'Content'
        };

        const result = validate(pagesSchemas.create, invalidData);

        expect(result.success).toBe(false);
      });
    });

    describe('update schema', () => {
      it('validates required fields', () => {
        const validData = {
          path: '_pages/about.md',
          frontmatter: { title: 'About' },
          body: 'Updated',
          sha: 'abc123'
        };

        const result = validate(pagesSchemas.update, validData);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('taxonomySchemas', () => {
    describe('update schema', () => {
      it('validates arrays of categories and tags', () => {
        const validData = {
          categories: ['Tech', 'Life'],
          tags: ['featured', 'news']
        };

        const result = validate(taxonomySchemas.update, validData);

        expect(result.success).toBe(true);
      });

      it('rejects non-array categories', () => {
        const invalidData = {
          categories: 'Tech',
          tags: ['news']
        };

        const result = validate(taxonomySchemas.update, invalidData);

        expect(result.success).toBe(false);
      });

      it('allows empty arrays', () => {
        const validData = {
          categories: [],
          tags: []
        };

        const result = validate(taxonomySchemas.update, validData);

        expect(result.success).toBe(true);
      });
    });
  });

  describe('binSchemas', () => {
    describe('operation schema', () => {
      it('validates post operation', () => {
        const validData = {
          filename: '2025-01-01-test.md',
          sha: 'abc123',
          type: 'post'
        };

        const result = validate(binSchemas.operation, validData);

        expect(result.success).toBe(true);
      });

      it('validates page operation', () => {
        const validData = {
          filename: 'about.md',
          sha: 'abc123',
          type: 'page'
        };

        const result = validate(binSchemas.operation, validData);

        expect(result.success).toBe(true);
      });

      it('allows optional type field', () => {
        const validData = {
          filename: '2025-01-01-test.md',
          sha: 'abc123'
        };

        const result = validate(binSchemas.operation, validData);

        expect(result.success).toBe(true);
      });

      it('rejects invalid type', () => {
        const invalidData = {
          filename: 'test.md',
          sha: 'abc123',
          type: 'invalid'
        };

        const result = validate(binSchemas.operation, invalidData);

        expect(result.success).toBe(false);
      });

      it('rejects empty filename', () => {
        const invalidData = {
          filename: '',
          sha: 'abc123'
        };

        const result = validate(binSchemas.operation, invalidData);

        expect(result.success).toBe(false);
      });
    });
  });

  describe('mediaSchemas', () => {
    describe('upload schema', () => {
      it('validates required file data', () => {
        const validData = {
          file: 'base64encodeddata...'
        };

        const result = validate(mediaSchemas.upload, validData);

        expect(result.success).toBe(true);
      });

      it('allows optional folder and public_id', () => {
        const validData = {
          file: 'base64encodeddata...',
          folder: 'images',
          public_id: 'my-image'
        };

        const result = validate(mediaSchemas.upload, validData);

        expect(result.success).toBe(true);
      });

      it('rejects missing file', () => {
        const invalidData = {
          folder: 'images'
        };

        const result = validate(mediaSchemas.upload, invalidData);

        expect(result.success).toBe(false);
      });

      it('rejects empty file string', () => {
        const invalidData = {
          file: ''
        };

        const result = validate(mediaSchemas.upload, invalidData);

        expect(result.success).toBe(false);
      });
    });

    describe('delete schema', () => {
      it('validates required public_id', () => {
        const validData = {
          public_id: 'my-image'
        };

        const result = validate(mediaSchemas.delete, validData);

        expect(result.success).toBe(true);
      });

      it('rejects missing public_id', () => {
        const invalidData = {};

        const result = validate(mediaSchemas.delete, invalidData);

        expect(result.success).toBe(false);
      });
    });
  });

  describe('settingsSchemas', () => {
    describe('update schema', () => {
      it('allows any key-value pairs', () => {
        const validData = {
          title: 'My Site',
          description: 'A great site',
          customField: 'value'
        };

        const result = validate(settingsSchemas.update, validData);

        expect(result.success).toBe(true);
      });

      it('allows empty object', () => {
        const validData = {};

        const result = validate(settingsSchemas.update, validData);

        expect(result.success).toBe(true);
      });

      it('passes through all fields', () => {
        const data = {
          field1: 'value1',
          field2: 'value2',
          field3: 'value3'
        };

        const result = validate(settingsSchemas.update, data);

        expect(result.success).toBe(true);
        expect(result.data.field1).toBe('value1');
        expect(result.data.field2).toBe('value2');
        expect(result.data.field3).toBe('value3');
      });
    });
  });

  describe('Edge cases', () => {
    it('handles null values in data', () => {
      const schema = postsSchemas.create;
      const data = {
        filename: '2025-01-01-test.md',
        frontmatter: null,
        body: 'Content'
      };

      const result = validate(schema, data);

      // frontmatter can be any value including null
      expect(result.success).toBe(true);
    });

    it('handles very long strings within limits', () => {
      const schema = postsSchemas.create;
      const longBody = 'A'.repeat(1000);
      const data = {
        filename: '2025-01-01-test.md',
        frontmatter: { title: 'Test' },
        body: longBody
      };

      const result = validate(schema, data);

      expect(result.success).toBe(true);
    });

    it('rejects body exceeding size limit', () => {
      const schema = pagesSchemas.create;
      const tooLongBody = 'A'.repeat(1000001); // Over 1MB
      const data = {
        path: '_pages/test.md',
        frontmatter: { title: 'Test' },
        body: tooLongBody
      };

      const result = validate(schema, data);

      expect(result.success).toBe(false);
    });

    it('handles special characters in strings', () => {
      const schema = postsSchemas.create;
      const data = {
        filename: '2025-01-01-special-chars.md',
        frontmatter: { title: 'Special: "quotes" & \'apostrophes\'' },
        body: 'Content with émojis 🎉'
      };

      const result = validate(schema, data);

      expect(result.success).toBe(true);
    });
  });
});
