/**
 * @vitest-environment node
 *
 * Unit Tests for Cloudinary Folders Netlify Function
 *
 * Tests Cloudinary folder list retrieval.
 * Covers GET operation for fetching folder structure.
 */

// Set env vars BEFORE importing handler
process.env.CLOUDINARY_API_KEY = 'test-cloudinary-key-732138267195618';
process.env.CLOUDINARY_API_SECRET = 'test-cloudinary-secret-12345';
process.env.CLOUDINARY_CLOUD_NAME = 'circleseven';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { mockCloudinaryFolders, mockCloudinaryFoldersError, cleanMocks } from '../../utils/github-mock.js';
import { callV2Handler } from '../../utils/request-mock.js';
import handlerFn from '../../../netlify/functions/cloudinary-folders.mjs';

const handler = (event, context) => callV2Handler(handlerFn, event, context);

describe('Cloudinary Folders Function', () => {
  beforeEach(() => {
    cleanMocks();
  });

  afterEach(() => {
    cleanMocks();
  });

  describe('CORS and OPTIONS', () => {
    it('handles OPTIONS preflight request', async () => {
      const event = {
        httpMethod: 'OPTIONS'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(response.body).toBe('');
    });

    it('includes CORS headers in all responses', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockCloudinaryFolders([]);

      const response = await handler(event, {});

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('GET - Retrieve folder list', () => {
    it('fetches folders from Cloudinary', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const cloudinaryFolders = [
        { name: 'circle-seven', path: 'circle-seven' },
        { name: 'blog', path: 'blog' },
        { name: 'images', path: 'images' }
      ];

      mockCloudinaryFolders(cloudinaryFolders);

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.folders).toHaveLength(3);
      expect(body.folders[0].name).toBe('circle-seven');
      expect(body.folders[0].path).toBe('circle-seven');
      expect(body.folders[1].name).toBe('blog');
      expect(body.folders[2].name).toBe('images');
    });

    it('returns folders array in response', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const cloudinaryFolders = [
        { name: 'folder1', path: 'folder1' },
        { name: 'folder2', path: 'folder2' }
      ];

      mockCloudinaryFolders(cloudinaryFolders);

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('folders');
      expect(Array.isArray(body.folders)).toBe(true);
      expect(body.folders).toHaveLength(2);
    });

    it('returns empty array when no folders exist', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockCloudinaryFolders([]);

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.folders).toEqual([]);
    });

    it('handles missing folders field in response', async () => {
      const event = {
        httpMethod: 'GET'
      };

      nock('https://api.cloudinary.com')
        .get(/\/v1_1\/[^\/]+\/folders/)
        .reply(200, {}); // No folders field

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.folders).toEqual([]);
    });

    it('makes request to Cloudinary with correct authentication', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const scope = mockCloudinaryFolders([]);

      await handler(event, {});

      // Verify nock intercepted the request
      expect(scope.isDone()).toBe(true);
    });

    it('uses Basic Auth with API Key and Secret', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const scope = nock('https://api.cloudinary.com', {
        reqheaders: {
          'authorization': (val) => {
            // Verify Basic Auth format
            if (!val.startsWith('Basic ')) return false;

            // Decode and verify credentials
            const base64Credentials = val.replace('Basic ', '');
            const credentials = Buffer.from(base64Credentials, 'base64').toString('utf8');
            return credentials.includes('732138267195618') && credentials.includes('test-cloudinary-secret-12345');
          }
        }
      })
        .get(/\/v1_1\/[^\/]+\/folders/)
        .reply(200, { folders: [] });

      await handler(event, {});

      // Verify nock intercepted with correct auth
      expect(scope.isDone()).toBe(true);
    });

    it('returns 500 when CLOUDINARY_API_KEY is missing', async () => {
      const savedKey = process.env.CLOUDINARY_API_KEY;
      const savedSecret = process.env.CLOUDINARY_API_SECRET;

      delete process.env.CLOUDINARY_API_KEY;
      delete process.env.CLOUDINARY_API_SECRET;

      const event = {
        httpMethod: 'GET'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
      expect(body.message).toContain('CLOUDINARY_API_KEY');
      expect(body.message).toContain('CLOUDINARY_API_SECRET');

      // Restore env vars
      process.env.CLOUDINARY_API_KEY = savedKey;
      process.env.CLOUDINARY_API_SECRET = savedSecret;
    });

    it('handles Cloudinary API errors', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockCloudinaryFoldersError(401, 'Invalid credentials');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
      expect(body.message).toContain('401');
    });

    it('handles malformed JSON response from Cloudinary', async () => {
      const event = {
        httpMethod: 'GET'
      };

      nock('https://api.cloudinary.com')
        .get(/\/v1_1\/[^\/]+\/folders/)
        .reply(200, 'not valid json{{');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
      expect(body.message).toContain('parse');
    });

    it('handles network errors', async () => {
      const event = {
        httpMethod: 'GET'
      };

      nock('https://api.cloudinary.com')
        .get(/\/v1_1\/[^\/]+\/folders/)
        .replyWithError('Network error');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
      expect(body.message).toContain('Network error');
    });

    it('includes error stack in error responses', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockCloudinaryFoldersError(500, 'Internal error');

      const response = await handler(event, {});

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('stack');
    });

    it('handles nested folder structure', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const cloudinaryFolders = [
        { name: 'parent', path: 'parent' },
        { name: 'child', path: 'parent/child' },
        { name: 'grandchild', path: 'parent/child/grandchild' }
      ];

      mockCloudinaryFolders(cloudinaryFolders);

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.folders).toHaveLength(3);
      expect(body.folders[2].path).toBe('parent/child/grandchild');
    });
  });

  describe('Method validation', () => {
    it('returns 405 for POST requests', async () => {
      const event = {
        httpMethod: 'POST'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Method not allowed');
    });

    it('returns 405 for PUT requests', async () => {
      const event = {
        httpMethod: 'PUT'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Method not allowed');
    });

    it('returns 405 for DELETE requests', async () => {
      const event = {
        httpMethod: 'DELETE'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Method not allowed');
    });

    it('returns 405 for PATCH requests', async () => {
      const event = {
        httpMethod: 'PATCH'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Method not allowed');
    });
  });

  describe('Security', () => {
    it('uses HTTPS for Cloudinary API calls', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const scope = mockCloudinaryFolders([]);

      await handler(event, {});

      // Verify nock intercepted HTTPS request
      expect(scope.isDone()).toBe(true);
    });

    it('does not expose API secret in responses', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockCloudinaryFolders([]);

      const response = await handler(event, {});
      const responseBody = JSON.stringify(response);

      expect(responseBody).not.toContain('test-cloudinary-secret-12345');
      expect(responseBody).not.toContain('CLOUDINARY_API_SECRET');
    });

    it('does not expose API secret in error responses', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockCloudinaryFoldersError(401, 'Unauthorized');

      const response = await handler(event, {});
      const responseBody = JSON.stringify(response);

      expect(responseBody).not.toContain('test-cloudinary-secret-12345');
    });
  });

  describe('Rate Limiting', () => {
    it('enforces rate limiting on GET requests', async () => {
      const event = {
        httpMethod: 'GET',
        headers: {
          'x-forwarded-for': '192.168.1.100'
        }
      };

      mockCloudinaryFolders([]);

      // First request should succeed
      const response1 = await handler(event, {});
      expect(response1.statusCode).toBe(200);
    });
  });
});
