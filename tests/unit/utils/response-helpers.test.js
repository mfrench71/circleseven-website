/**
 * Unit Tests for Response Helpers Utility
 *
 * Tests standardized response builders for Netlify functions.
 * Validates response format, headers, and status codes.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';

// Import the actual implementation
const {
  successResponse,
  errorResponse,
  badRequestResponse,
  notFoundResponse,
  methodNotAllowedResponse,
  conflictResponse,
  serverErrorResponse,
  serviceUnavailableResponse,
  corsPreflightResponse,
  CORS_HEADERS
} = await import('../../../netlify/utils/response-helpers.mjs');

/**
 * Helper to convert Web Response to test-friendly format
 */
async function toTestResponse(response) {
  const headers = {};
  response.headers.forEach((value, key) => {
    // Map lowercased headers to proper casing for test compatibility
    const originalKey = key === 'access-control-allow-origin' ? 'Access-Control-Allow-Origin' :
                       key === 'access-control-allow-headers' ? 'Access-Control-Allow-Headers' :
                       key === 'access-control-allow-methods' ? 'Access-Control-Allow-Methods' :
                       key === 'content-type' ? 'Content-Type' :
                       key === 'cache-control' ? 'Cache-Control' :
                       key;
    headers[originalKey] = value;
  });

  return {
    statusCode: response.status,
    headers,
    body: await response.text()
  };
}

describe('Response Helpers Utility', () => {
  describe('CORS_HEADERS', () => {
    it('exports standard CORS headers', async () => {
      expect(CORS_HEADERS).toBeDefined();
      expect(CORS_HEADERS['Access-Control-Allow-Origin']).toBe('*');
      expect(CORS_HEADERS['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization');
      expect(CORS_HEADERS['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(CORS_HEADERS['Content-Type']).toBe('application/json');
    });
  });

  describe('successResponse()', () => {
    it('creates basic success response with 200 status', async () => {
      const data = { message: 'Success' };
      const response = await toTestResponse(successResponse(data));

      expect(response.statusCode).toBe(200);
      expect(response.headers).toMatchObject(CORS_HEADERS);
      expect(JSON.parse(response.body)).toEqual(data);
    });

    it('creates success response with custom status code', async () => {
      const data = { id: 123 };
      const response = await toTestResponse(successResponse(data, 201));

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.body)).toEqual(data);
    });

    it('includes additional headers when provided', async () => {
      const data = { message: 'Cached' };
      const additionalHeaders = {
        'Cache-Control': 'public, max-age=300'
      };
      const response = await toTestResponse(successResponse(data, 200, additionalHeaders));

      expect(response.headers['Cache-Control']).toBe('public, max-age=300');
      expect(response.headers['Content-Type']).toBe('application/json'); // CORS headers still present
    });

    it('serializes complex data structures', async () => {
      const data = {
        posts: [
          { id: 1, title: 'Post 1' },
          { id: 2, title: 'Post 2' }
        ],
        meta: { total: 2 }
      };
      const response = await toTestResponse(successResponse(data));

      expect(JSON.parse(response.body)).toEqual(data);
    });

    it('handles empty object', async () => {
      const response = await toTestResponse(successResponse({}));

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({});
    });
  });

  describe('errorResponse()', () => {
    it('creates error response with default 400 status', async () => {
      const response = await toTestResponse(errorResponse('Test error', 'Error message'));

      expect(response.statusCode).toBe(400);
      expect(response.headers).toMatchObject(CORS_HEADERS);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Test error');
      expect(body.message).toBe('Error message');
    });

    it('creates error response with custom status code', async () => {
      const response = await toTestResponse(errorResponse('Server error', 'Something went wrong', 500));

      expect(response.statusCode).toBe(500);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Server error');
      expect(body.message).toBe('Something went wrong');
    });

    it('includes additional data when provided', async () => {
      const additionalData = {
        field: 'email',
        code: 'INVALID_EMAIL'
      };
      const response = await toTestResponse(errorResponse('Validation error', 'Invalid email', 400, additionalData));

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation error');
      expect(body.message).toBe('Invalid email');
      expect(body.field).toBe('email');
      expect(body.code).toBe('INVALID_EMAIL');
    });
  });

  describe('badRequestResponse()', () => {
    it('creates 400 Bad Request response', async () => {
      const response = await toTestResponse(badRequestResponse('Missing required field'));

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toBe('Missing required field');
    });

    it('includes additional data', async () => {
      const response = await toTestResponse(badRequestResponse('Invalid input', { field: 'username' }));

      const body = JSON.parse(response.body);
      expect(body.field).toBe('username');
    });
  });

  describe('notFoundResponse()', () => {
    it('creates 404 Not Found response with default message', async () => {
      const response = notFoundResponse();

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Not Found');
      expect(body.message).toBe('Resource not found');
    });

    it('creates 404 response with custom message', async () => {
      const response = await toTestResponse(notFoundResponse('Post not found'));

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.body);
      expect(body.message).toBe('Post not found');
    });
  });

  describe('methodNotAllowedResponse()', () => {
    it('creates 405 Method Not Allowed response', async () => {
      const response = methodNotAllowedResponse();

      expect(response.statusCode).toBe(405);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Method not allowed');
      expect(body.message).toBe('The requested HTTP method is not supported for this endpoint');
    });
  });

  describe('conflictResponse()', () => {
    it('creates 409 Conflict response', async () => {
      const response = await toTestResponse(conflictResponse('File already exists'));

      expect(response.statusCode).toBe(409);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Conflict');
      expect(body.message).toBe('File already exists');
    });
  });

  describe('serverErrorResponse()', () => {
    it('creates 500 response from Error object', async () => {
      const error = new Error('Database connection failed');
      const response = await toTestResponse(serverErrorResponse(error));

      expect(response.statusCode).toBe(500);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
      expect(body.message).toBe('Database connection failed');
    });

    it('creates 500 response from string', async () => {
      const response = await toTestResponse(serverErrorResponse('Something went wrong'));

      expect(response.statusCode).toBe(500);

      const body = JSON.parse(response.body);
      expect(body.message).toBe('Something went wrong');
    });

    it('includes stack trace when includeStack is true', async () => {
      const error = new Error('Test error');
      const response = await toTestResponse(serverErrorResponse(error, { includeStack: true }));

      const body = JSON.parse(response.body);
      expect(body.stack).toBeDefined();
      expect(body.stack).toContain('Error: Test error');
      expect(body.details).toBeDefined();
    });

    it('excludes stack trace when includeStack is false', async () => {
      const error = new Error('Test error');
      const response = await toTestResponse(serverErrorResponse(error, { includeStack: false }));

      const body = JSON.parse(response.body);
      expect(body.stack).toBeUndefined();
      expect(body.details).toBeUndefined();
    });

    it('excludes stack trace by default', async () => {
      const error = new Error('Test error');
      const response = await toTestResponse(serverErrorResponse(error));

      const body = JSON.parse(response.body);
      expect(body.stack).toBeUndefined();
    });
  });

  describe('serviceUnavailableResponse()', () => {
    it('creates 503 Service Unavailable response', async () => {
      const response = await toTestResponse(serviceUnavailableResponse('Database is down'));

      expect(response.statusCode).toBe(503);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Service unavailable');
      expect(body.message).toBe('Database is down');
    });
  });

  describe('corsPreflightResponse()', () => {
    it('creates 200 response for OPTIONS requests', async () => {
      const response = corsPreflightResponse();

      expect(response.statusCode).toBe(200);
      expect(response.headers).toMatchObject(CORS_HEADERS);
      expect(response.body).toBe('');
    });
  });

  describe('Response consistency', () => {
    it('all responses include CORS headers', async () => {
      const responses = await Promise.all([
        toTestResponse(successResponse({ data: 'test' })),
        toTestResponse(errorResponse('Error', 'Message')),
        toTestResponse(badRequestResponse('Bad')),
        toTestResponse(notFoundResponse()),
        toTestResponse(methodNotAllowedResponse()),
        toTestResponse(conflictResponse('Conflict')),
        toTestResponse(serverErrorResponse('Error')),
        toTestResponse(serviceUnavailableResponse('Unavailable')),
        toTestResponse(corsPreflightResponse())
      ]);

      responses.forEach(response => {
        expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
        expect(response.headers['Content-Type']).toBe('application/json');
      });
    });

    it('all error responses have consistent structure', async () => {
      const errorResponses = await Promise.all([
        toTestResponse(badRequestResponse('Bad')),
        toTestResponse(notFoundResponse('Not found')),
        toTestResponse(methodNotAllowedResponse()),
        toTestResponse(conflictResponse('Conflict')),
        toTestResponse(serverErrorResponse('Error')),
        toTestResponse(serviceUnavailableResponse('Unavailable'))
      ]);

      errorResponses.forEach(response => {
        const body = JSON.parse(response.body);
        expect(body.error).toBeDefined();
        expect(body.message).toBeDefined();
        expect(typeof body.error).toBe('string');
        expect(typeof body.message).toBe('string');
      });
    });

    it('all responses have valid JSON bodies', async () => {
      const allResponses = await Promise.all([
        toTestResponse(successResponse({ data: 'test' })),
        toTestResponse(badRequestResponse('Bad')),
        toTestResponse(notFoundResponse()),
        toTestResponse(methodNotAllowedResponse()),
        toTestResponse(conflictResponse('Conflict')),
        toTestResponse(serverErrorResponse('Error')),
        toTestResponse(serviceUnavailableResponse('Unavailable'))
      ]);

      allResponses.forEach(response => {
        if (response.body !== '') {
          expect(() => JSON.parse(response.body)).not.toThrow();
        }
      });
    });
  });

  describe('Special characters and edge cases', () => {
    it('handles special characters in messages', async () => {
      const message = 'Error: "quotes" and \'apostrophes\' and \n newlines';
      const response = await toTestResponse(errorResponse('Error', message));

      const body = JSON.parse(response.body);
      expect(body.message).toBe(message);
    });

    it('handles Unicode characters', async () => {
      const data = { message: '日本語 émojis 🎉' };
      const response = await toTestResponse(successResponse(data));

      const body = JSON.parse(response.body);
      expect(body.message).toBe('日本語 émojis 🎉');
    });

    it('handles null in additional data', async () => {
      const response = await toTestResponse(errorResponse('Error', 'Message', 400, { value: null }));

      const body = JSON.parse(response.body);
      expect(body.value).toBeNull();
    });

    it('handles undefined in additional data', async () => {
      const response = await toTestResponse(errorResponse('Error', 'Message', 400, { value: undefined }));

      const body = JSON.parse(response.body);
      expect(body.value).toBeUndefined();
    });

    it('handles empty string message', async () => {
      const response = await toTestResponse(errorResponse('Error', ''));

      const body = JSON.parse(response.body);
      expect(body.message).toBe('');
    });

    it('handles very long messages', async () => {
      const longMessage = 'A'.repeat(10000);
      const response = await toTestResponse(errorResponse('Error', longMessage));

      const body = JSON.parse(response.body);
      expect(body.message).toBe(longMessage);
    });
  });
});
