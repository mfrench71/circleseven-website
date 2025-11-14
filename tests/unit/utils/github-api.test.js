/**
 * Unit Tests for GitHub API Utility
 *
 * Tests the low-level HTTP request formatting and GitHub API integration.
 * Validates that requests are properly formatted with correct headers and body.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';

// Import the actual implementation
const { githubRequest } = await import('../../../netlify/utils/github-api.cjs');

describe('GitHub API Utility', () => {
  beforeEach(() => {
    // Set environment variables
    process.env.GITHUB_TOKEN = 'test-token-12345';

    // Clean any existing mocks
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
    delete process.env.GITHUB_TOKEN;
  });

  describe('HTTP Request Formatting', () => {
    it('includes Content-Length header for DELETE with body', async () => {
      let capturedHeaders = {};

      nock('https://api.github.com')
        .delete('/repos/mfrench71/circleseven-website/contents/test.md')
        .reply(function(uri, requestBody) {
          capturedHeaders = this.req.headers;
          return [200, { message: 'deleted' }];
        });

      await githubRequest('/contents/test.md', {
        method: 'DELETE',
        body: { message: 'Delete test', sha: 'abc123', branch: 'main' }
      });

      expect(capturedHeaders['content-length']).toBeDefined();
      expect(parseInt(capturedHeaders['content-length'])).toBeGreaterThan(0);
    });

    it('includes Content-Length header for PUT with body', async () => {
      let capturedHeaders = {};

      nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/test.md')
        .reply(function(uri, requestBody) {
          capturedHeaders = this.req.headers;
          return [200, { content: { sha: 'new-sha' } }];
        });

      await githubRequest('/contents/test.md', {
        method: 'PUT',
        body: {
          message: 'Create file',
          content: Buffer.from('test content').toString('base64'),
          branch: 'main'
        }
      });

      expect(capturedHeaders['content-length']).toBeDefined();
      expect(parseInt(capturedHeaders['content-length'])).toBeGreaterThan(0);
    });

    it('includes Content-Length header for POST with body', async () => {
      let capturedHeaders = {};

      nock('https://api.github.com')
        .post('/repos/mfrench71/circleseven-website/issues')
        .reply(function(uri, requestBody) {
          capturedHeaders = this.req.headers;
          return [201, { id: 123 }];
        });

      await githubRequest('/issues', {
        method: 'POST',
        body: { title: 'Test issue', body: 'Description' }
      });

      expect(capturedHeaders['content-length']).toBeDefined();
      expect(parseInt(capturedHeaders['content-length'])).toBeGreaterThan(0);
    });

    it('does not include Content-Length for GET requests without body', async () => {
      let capturedHeaders = {};

      nock('https://api.github.com')
        .get('/repos/mfrench71/circleseven-website/contents/test.md?ref=main')
        .reply(function(uri) {
          capturedHeaders = this.req.headers;
          return [200, { content: 'dGVzdA==', sha: 'abc' }];
        });

      await githubRequest('/contents/test.md?ref=main');

      // GET requests without body should not have Content-Length
      expect(capturedHeaders['content-length']).toBeUndefined();
    });

    it('includes Content-Type: application/json for requests with body', async () => {
      let capturedHeaders = {};

      nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/test.md')
        .reply(function(uri, requestBody) {
          capturedHeaders = this.req.headers;
          return [200, {}];
        });

      await githubRequest('/contents/test.md', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: { message: 'test', content: 'dGVzdA==', branch: 'main' }
      });

      expect(capturedHeaders['content-type']).toBe('application/json');
    });

    it('calculates correct Content-Length for different body sizes', async () => {
      const testCases = [
        { message: 'Small body', sha: '123', branch: 'main' },
        { message: 'A'.repeat(1000), sha: '456', branch: 'main' },
        { message: 'Special chars: 日本語 émojis 🎉', sha: '789', branch: 'main' }
      ];

      for (const body of testCases) {
        let capturedHeaders = {};
        const expectedLength = Buffer.byteLength(JSON.stringify(body));

        nock('https://api.github.com')
          .delete('/repos/mfrench71/circleseven-website/contents/test.md')
          .reply(function(uri, requestBody) {
            capturedHeaders = this.req.headers;
            return [200, {}];
          });

        await githubRequest('/contents/test.md', {
          method: 'DELETE',
          body
        });

        expect(parseInt(capturedHeaders['content-length'])).toBe(expectedLength);
      }
    });
  });

  describe('Required Headers', () => {
    it('includes User-Agent header', async () => {
      let capturedHeaders = {};

      nock('https://api.github.com')
        .get('/repos/mfrench71/circleseven-website/contents/test.md?ref=main')
        .reply(function(uri) {
          capturedHeaders = this.req.headers;
          return [200, {}];
        });

      await githubRequest('/contents/test.md?ref=main');

      expect(capturedHeaders['user-agent']).toBe('Netlify-Function');
    });

    it('includes Accept header for GitHub API v3', async () => {
      let capturedHeaders = {};

      nock('https://api.github.com')
        .get('/repos/mfrench71/circleseven-website/contents/test.md?ref=main')
        .reply(function(uri) {
          capturedHeaders = this.req.headers;
          return [200, {}];
        });

      await githubRequest('/contents/test.md?ref=main');

      expect(capturedHeaders['accept']).toBe('application/vnd.github.v3+json');
    });

    it('includes Authorization header with token', async () => {
      let capturedHeaders = {};

      nock('https://api.github.com')
        .get('/repos/mfrench71/circleseven-website/contents/test.md?ref=main')
        .reply(function(uri) {
          capturedHeaders = this.req.headers;
          return [200, {}];
        });

      await githubRequest('/contents/test.md?ref=main');

      expect(capturedHeaders['authorization']).toBe('token test-token-12345');
    });

    it('allows custom headers to override defaults', async () => {
      let capturedHeaders = {};

      nock('https://api.github.com')
        .get('/repos/mfrench71/circleseven-website/contents/test.md?ref=main')
        .reply(function(uri) {
          capturedHeaders = this.req.headers;
          return [200, {}];
        });

      await githubRequest('/contents/test.md?ref=main', {
        headers: {
          'User-Agent': 'Custom-Agent'
        }
      });

      expect(capturedHeaders['user-agent']).toBe('Custom-Agent');
    });
  });

  describe('Request Body Serialization', () => {
    it('serializes body as JSON', async () => {
      let capturedBody = '';

      nock('https://api.github.com')
        .delete('/repos/mfrench71/circleseven-website/contents/test.md')
        .reply(function(uri, requestBody) {
          capturedBody = requestBody;
          return [200, {}];
        });

      const body = { message: 'Delete file', sha: 'abc123', branch: 'main' };
      await githubRequest('/contents/test.md', {
        method: 'DELETE',
        body
      });

      expect(capturedBody).toBe(JSON.stringify(body));
    });

    it('handles nested objects in body', async () => {
      let capturedBody = '';

      nock('https://api.github.com')
        .post('/repos/mfrench71/circleseven-website/issues')
        .reply(function(uri, requestBody) {
          capturedBody = requestBody;
          return [201, {}];
        });

      const body = {
        title: 'Test',
        labels: ['bug', 'priority'],
        metadata: { priority: 'high', assignee: 'user' }
      };

      await githubRequest('/issues', {
        method: 'POST',
        body
      });

      const parsed = JSON.parse(capturedBody);
      expect(parsed).toEqual(body);
    });
  });

  describe('Response Handling', () => {
    it('parses JSON response successfully', async () => {
      const responseData = { content: 'dGVzdA==', sha: 'abc123' };

      nock('https://api.github.com')
        .get('/repos/mfrench71/circleseven-website/contents/test.md?ref=main')
        .reply(200, responseData);

      const result = await githubRequest('/contents/test.md?ref=main');

      expect(result).toEqual(responseData);
    });

    it('throws error for non-2xx status codes', async () => {
      nock('https://api.github.com')
        .delete('/repos/mfrench71/circleseven-website/contents/test.md')
        .reply(422, {
          message: 'Invalid request',
          documentation_url: 'https://docs.github.com/rest'
        });

      await expect(
        githubRequest('/contents/test.md', {
          method: 'DELETE',
          body: { message: 'test', sha: 'abc', branch: 'main' }
        })
      ).rejects.toThrow('GitHub API error: 422');
    });

    it('throws error for invalid JSON response', async () => {
      nock('https://api.github.com')
        .get('/repos/mfrench71/circleseven-website/contents/test.md?ref=main')
        .reply(200, 'invalid json{');

      await expect(
        githubRequest('/contents/test.md?ref=main')
      ).rejects.toThrow('Failed to parse GitHub API response');
    });

    it('throws error for network failures', async () => {
      nock('https://api.github.com')
        .get('/repos/mfrench71/circleseven-website/contents/test.md?ref=main')
        .replyWithError('Network error');

      await expect(
        githubRequest('/contents/test.md?ref=main')
      ).rejects.toThrow('Network error');
    });
  });

  describe('HTTP Methods', () => {
    it('defaults to GET when method not specified', async () => {
      let capturedMethod = '';

      nock('https://api.github.com')
        .get('/repos/mfrench71/circleseven-website/contents/test.md?ref=main')
        .reply(function(uri) {
          capturedMethod = this.req.method;
          return [200, {}];
        });

      await githubRequest('/contents/test.md?ref=main');

      expect(capturedMethod).toBe('GET');
    });

    it('uses specified HTTP method', async () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

      for (const method of methods) {
        let capturedMethod = '';

        const scope = nock('https://api.github.com');
        scope[method.toLowerCase()]('/repos/mfrench71/circleseven-website/test')
          .reply(function(uri) {
            capturedMethod = this.req.method;
            return [200, {}];
          });

        await githubRequest('/test', {
          method,
          body: method !== 'GET' ? { data: 'test' } : undefined
        });

        expect(capturedMethod).toBe(method);
      }
    });
  });
});
