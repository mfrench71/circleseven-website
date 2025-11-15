/**
 * @vitest-environment node
 *
 * Unit Tests for Media Netlify Function
 *
 * Tests Cloudinary media library integration.
 * Covers GET operation for retrieving image resources.
 */

// Set env vars BEFORE importing handler
process.env.CLOUDINARY_API_KEY = 'test-cloudinary-key-732138267195618';
process.env.CLOUDINARY_API_SECRET = 'test-cloudinary-secret-12345';
process.env.CLOUDINARY_CLOUD_NAME = 'circleseven';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { mockCloudinaryResources, mockCloudinaryError, cleanMocks } from '../../utils/github-mock.js';
import { callV2Handler } from '../../utils/request-mock.js';
import handlerFn from '../../../netlify/functions/media.mjs';

const handler = (event, context) => callV2Handler(handlerFn, event, context);

describe('Media Function', () => {
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

      mockCloudinaryResources([]);

      const response = await handler(event, {});

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('GET - Retrieve media resources', () => {
    it('fetches media resources from Cloudinary', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const cloudinaryResources = [
        {
          public_id: 'sample-image-1',
          format: 'jpg',
          version: 1234567890,
          resource_type: 'image',
          type: 'upload',
          created_at: '2025-10-21T10:00:00Z',
          bytes: 125000,
          width: 1920,
          height: 1080,
          url: 'http://res.cloudinary.com/circleseven/image/upload/v1234567890/sample-image-1.jpg',
          secure_url: 'https://res.cloudinary.com/circleseven/image/upload/v1234567890/sample-image-1.jpg'
        },
        {
          public_id: 'sample-image-2',
          format: 'png',
          version: 9876543210,
          resource_type: 'image',
          type: 'upload',
          created_at: '2025-10-20T15:30:00Z',
          bytes: 250000,
          width: 1024,
          height: 768,
          url: 'http://res.cloudinary.com/circleseven/image/upload/v9876543210/sample-image-2.png',
          secure_url: 'https://res.cloudinary.com/circleseven/image/upload/v9876543210/sample-image-2.png'
        }
      ];

      mockCloudinaryResources(cloudinaryResources);

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.resources).toHaveLength(2);
      expect(body.total).toBe(2);
      expect(body.resources[0].public_id).toBe('sample-image-1');
      expect(body.resources[1].format).toBe('png');
    });

    it('returns resources array and total count', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const cloudinaryResources = [
        { public_id: 'img1', format: 'jpg' },
        { public_id: 'img2', format: 'png' },
        { public_id: 'img3', format: 'gif' }
      ];

      mockCloudinaryResources(cloudinaryResources);

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body).toHaveProperty('resources');
      expect(body).toHaveProperty('total');
      expect(Array.isArray(body.resources)).toBe(true);
      expect(body.total).toBe(3);
    });

    it('returns empty array when no resources exist', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockCloudinaryResources([]);

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.resources).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('handles missing resources field in response', async () => {
      const event = {
        httpMethod: 'GET'
      };

      nock('https://api.cloudinary.com')
        .get(/\/v1_1\/[^\/]+\/resources\/image/)
        .reply(200, {}); // No resources field

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.resources).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('makes request to Cloudinary with correct authentication', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const scope = mockCloudinaryResources([]);

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
        .get(/\/v1_1\/[^\/]+\/resources\/image/)
        .reply(200, { resources: [] });

      await handler(event, {});

      // Verify nock intercepted with correct auth
      expect(scope.isDone()).toBe(true);
    });

    it('returns 500 when CLOUDINARY_API_SECRET is missing', async () => {
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
      expect(body.message).toContain('credentials');

      // Restore env vars
      process.env.CLOUDINARY_API_KEY = savedKey;
      process.env.CLOUDINARY_API_SECRET = savedSecret;
    });

    it('handles Cloudinary API errors', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockCloudinaryError(401, 'Invalid credentials');

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
        .get(/\/v1_1\/[^\/]+\/resources\/image/)
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
        .get(/\/v1_1\/[^\/]+\/resources\/image/)
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

      mockCloudinaryError(500, 'Internal error');

      const response = await handler(event, {});

      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('stack');
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

      const scope = mockCloudinaryResources([]);

      await handler(event, {});

      // Verify nock intercepted HTTPS request
      expect(scope.isDone()).toBe(true);
    });

    it('does not expose API secret in responses', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockCloudinaryResources([]);

      const response = await handler(event, {});
      const responseBody = JSON.stringify(response);

      expect(responseBody).not.toContain('test-cloudinary-secret-12345');
      expect(responseBody).not.toContain('CLOUDINARY_API_SECRET');
    });

    it('does not expose API secret in error responses', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockCloudinaryError(401, 'Unauthorized');

      const response = await handler(event, {});
      const responseBody = JSON.stringify(response);

      expect(responseBody).not.toContain('test-cloudinary-secret-12345');
    });
  });
});
