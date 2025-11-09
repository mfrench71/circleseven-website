/**
 * @vitest-environment node
 *
 * Unit Tests for Rate Limit Netlify Function
 *
 * Tests GitHub API rate limit checking functionality.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { mockRateLimit, mockGitHubError, cleanMocks } from '../../utils/github-mock.js';
import { handler } from '../../../netlify/functions/rate-limit.js';

describe('Rate Limit Function', () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'test-github-token-12345';
    cleanMocks();
  });

  afterEach(() => {
    cleanMocks();
    delete process.env.GITHUB_TOKEN;
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

      mockRateLimit({
        resources: {
          core: {
            limit: 5000,
            remaining: 4850,
            reset: Math.floor(Date.now() / 1000) + 3600,
            used: 150
          }
        }
      });

      const response = await handler(event, {});

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('GET rate limit', () => {
    it('fetches and returns rate limit data', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const resetTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      mockRateLimit({
        resources: {
          core: {
            limit: 5000,
            remaining: 4850,
            reset: resetTime,
            used: 150
          }
        }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.limit).toBe(5000);
      expect(body.remaining).toBe(4850);
      expect(body.used).toBe(150);
      expect(body.usedPercent).toBe(3);
      expect(body).toHaveProperty('resetDate');
      expect(body).toHaveProperty('minutesUntilReset');
    });

    it('makes request to GitHub with correct headers', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const scope = mockRateLimit({
        resources: {
          core: {
            limit: 5000,
            remaining: 4850,
            reset: Math.floor(Date.now() / 1000) + 3600,
            used: 150
          }
        }
      });

      await handler(event, {});

      // Verify nock intercepted the request
      expect(scope.isDone()).toBe(true);
    });

    it('calculates usedPercent correctly', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockRateLimit({
        resources: {
          core: {
            limit: 5000,
            remaining: 3000, // 2000 used = 40%
            reset: Math.floor(Date.now() / 1000) + 3600,
            used: 2000
          }
        }
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.usedPercent).toBe(40);
    });

    it('calculates minutesUntilReset correctly', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const resetTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now

      mockRateLimit({
        resources: {
          core: {
            limit: 5000,
            remaining: 4850,
            reset: resetTime,
            used: 150
          }
        }
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.minutesUntilReset).toBeGreaterThan(25);
      expect(body.minutesUntilReset).toBeLessThanOrEqual(30);
    });

    it('formats resetDate as ISO string', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const resetTime = 1634567890;

      mockRateLimit({
        resources: {
          core: {
            limit: 5000,
            remaining: 4850,
            reset: resetTime,
            used: 150
          }
        }
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.resetDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      expect(new Date(body.resetDate).getTime()).toBe(resetTime * 1000);
    });
  });

  describe('Error handling', () => {
    it('returns 503 when GITHUB_TOKEN is missing', async () => {
      delete process.env.GITHUB_TOKEN;

      const event = {
        httpMethod: 'GET'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Service unavailable');
      expect(body.message).toContain('GITHUB_TOKEN');
    });

    it('returns 405 for unsupported methods', async () => {
      const event = {
        httpMethod: 'POST'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Method not allowed');
    });

    it('handles GitHub API errors', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockGitHubError('GET', '/rate_limit', 403, 'Rate limit exceeded');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });

    it('handles network errors', async () => {
      const event = {
        httpMethod: 'GET'
      };

      nock('https://api.github.com')
        .get('/rate_limit')
        .replyWithError('Network error');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
      expect(body.message).toContain('Network error');
    });

    it('handles malformed JSON from GitHub', async () => {
      const event = {
        httpMethod: 'GET'
      };

      nock('https://api.github.com')
        .get('/rate_limit')
        .reply(200, 'not valid json');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('Edge cases', () => {
    it('handles reset time in the past (shows 0 minutes)', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const resetTime = Math.floor(Date.now() / 1000) - 60; // 1 minute ago

      mockRateLimit({
        resources: {
          core: {
            limit: 5000,
            remaining: 4850,
            reset: resetTime,
            used: 150
          }
        }
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.minutesUntilReset).toBe(0);
    });

    it('handles 100% usage', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockRateLimit({
        resources: {
          core: {
            limit: 5000,
            remaining: 0,
            reset: Math.floor(Date.now() / 1000) + 3600,
            used: 5000
          }
        }
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.remaining).toBe(0);
      expect(body.usedPercent).toBe(100);
    });

    it('handles 0% usage (brand new limit)', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockRateLimit({
        resources: {
          core: {
            limit: 5000,
            remaining: 5000,
            reset: Math.floor(Date.now() / 1000) + 3600,
            used: 0
          }
        }
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.remaining).toBe(5000);
      expect(body.usedPercent).toBe(0);
    });
  });
});
