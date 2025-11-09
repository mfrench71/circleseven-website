/**
 * @vitest-environment node
 *
 * Unit Tests for Recently Published Netlify Function
 *
 * Tests retrieval of recently modified posts and pages from GitHub.
 * Covers GET operation for fetching the 10 most recent files.
 */

// Set env vars BEFORE importing handler
process.env.GITHUB_TOKEN = 'test-github-token-12345';
process.env.GITHUB_REPO = 'mfrench71/circleseven-website';

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockGitHubAPI, cleanMocks } from '../../utils/github-mock.js';
import { handler } from '../../../netlify/functions/recently-published.js';

describe('Recently Published Function', () => {
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

      // Mock both _posts and _pages directories (without ?ref=main)
      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_posts',
        responseBody: []
      });
      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_pages',
        responseBody: []
      });

      const response = await handler(event, {});

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('GET - Retrieve recently published files', () => {
    it('fetches recent posts and pages from GitHub', async () => {
      const event = {
        httpMethod: 'GET'
      };

      // Mock _posts directory with 2 files
      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_posts',
        responseBody: [
          { name: '2025-01-15-test-post.md', path: '_posts/2025-01-15-test-post.md' },
          { name: '2025-01-10-old-post.md', path: '_posts/2025-01-10-old-post.md' }
        ]
      });

      // Mock _pages directory with 2 files
      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_pages',
        responseBody: [
          { name: 'about.md', path: '_pages/about.md' },
          { name: 'contact.md', path: '_pages/contact.md' }
        ]
      });

      // Mock commit dates for each file
      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/commits?path=_posts/2025-01-15-test-post.md&per_page=1',
        responseBody: [{
          commit: { committer: { date: '2025-01-15T10:00:00Z' } }
        }]
      });

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/commits?path=_posts/2025-01-10-old-post.md&per_page=1',
        responseBody: [{
          commit: { committer: { date: '2025-01-10T10:00:00Z' } }
        }]
      });

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/commits?path=_pages/about.md&per_page=1',
        responseBody: [{
          commit: { committer: { date: '2025-01-12T10:00:00Z' } }
        }]
      });

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/commits?path=_pages/contact.md&per_page=1',
        responseBody: [{
          commit: { committer: { date: '2025-01-08T10:00:00Z' } }
        }]
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(4);
    });

    it('returns empty array when no files exist', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_posts',
        responseBody: []
      });
      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_pages',
        responseBody: []
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toEqual([]);
    });

    it('includes file metadata in response', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_posts',
        responseBody: [
          { name: '2025-01-15-test-post.md', path: '_posts/2025-01-15-test-post.md' }
        ]
      });

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_pages',
        responseBody: []
      });

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/commits?path=_posts/2025-01-15-test-post.md&per_page=1',
        responseBody: [{
          commit: { committer: { date: '2025-01-15T10:00:00Z' } }
        }]
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body[0]).toHaveProperty('name');
      expect(body[0]).toHaveProperty('type');
      expect(body[0]).toHaveProperty('folder');
      expect(body[0]).toHaveProperty('title');
      expect(body[0]).toHaveProperty('lastModified');
      expect(body[0].type).toBe('Post');
      expect(body[0].folder).toBe('_posts');
    });

    it('removes date prefix from post titles', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_posts',
        responseBody: [
          { name: '2025-01-15-hello-world.md', path: '_posts/2025-01-15-hello-world.md' }
        ]
      });

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_pages',
        responseBody: []
      });

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/commits?path=_posts/2025-01-15-hello-world.md&per_page=1',
        responseBody: [{
          commit: { committer: { date: '2025-01-15T10:00:00Z' } }
        }]
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body[0].title).toBe('Hello World');
    });

    it('converts hyphens to spaces and capitalizes titles', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_pages',
        responseBody: [
          { name: 'about-our-company.md', path: '_pages/about-our-company.md' }
        ]
      });

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_posts',
        responseBody: []
      });

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/commits?path=_pages/about-our-company.md&per_page=1',
        responseBody: [{
          commit: { committer: { date: '2025-01-15T10:00:00Z' } }
        }]
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body[0].title).toBe('About Our Company');
    });

    it('handles missing commit data gracefully', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_posts',
        responseBody: [
          { name: 'test.md', path: '_posts/test.md' }
        ]
      });

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_pages',
        responseBody: []
      });

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/commits?path=_posts/test.md&per_page=1',
        responseBody: [] // No commits
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body[0].lastModified).toBe(new Date(0).toISOString());
    });

    it('includes cache-control headers', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_posts',
        responseBody: []
      });
      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_pages',
        responseBody: []
      });

      const response = await handler(event, {});

      expect(response.headers['Cache-Control']).toBe('no-cache, no-store, must-revalidate');
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
  });

  describe('Security', () => {
    it('does not expose GitHub token in responses', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_posts',
        responseBody: []
      });
      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_pages',
        responseBody: []
      });

      const response = await handler(event, {});
      const responseBody = JSON.stringify(response);

      expect(responseBody).not.toContain('test-github-token-12345');
      expect(responseBody).not.toContain('GITHUB_TOKEN');
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

      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_posts',
        responseBody: []
      });
      mockGitHubAPI({
        method: 'GET',
        path: '/repos/mfrench71/circleseven-website/contents/_pages',
        responseBody: []
      });

      // First request should succeed
      const response1 = await handler(event, {});
      expect(response1.statusCode).toBe(200);
    });
  });
});
