/**
 * Unit Tests for Pages Netlify Function
 *
 * Tests CRUD operations for Jekyll page files via GitHub API integration.
 * Covers GET (list/single), POST (create), PUT (update), DELETE operations.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import nock from 'nock';
import { mockListContents, mockGetFile, mockPutFile, mockDeleteFile, mockGitHubError, cleanMocks } from '../../utils/github-mock.js';
import { callV2Handler } from '../../utils/request-mock.js';

// Mock @netlify/blobs before importing the handler
vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    setJSON: vi.fn().mockResolvedValue(undefined)
  }))
}));

import handlerFn from '../../../netlify/functions/pages.mjs';

const handler = (event, context) => callV2Handler(handlerFn, event, context);

describe('Pages Function', () => {
  beforeEach(() => {
    // Mock environment variables
    process.env.GITHUB_TOKEN = 'test-github-token-12345';

    // Clean any previous mocks
    cleanMocks();
  });

  afterEach(() => {
    // Clean up mocks
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
        httpMethod: 'GET',
        queryStringParameters: {}
      };

      // Mock successful GitHub response
      mockListContents('_pages', [
        { name: 'about.md', path: '_pages/about.md', sha: 'abc123', size: 500 }
      ]);

      const response = await handler(event, {});

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('GET - List all pages', () => {
    it('lists all markdown pages from _pages directory', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {}
      };

      const mockFiles = [
        { name: 'about.md', path: '_pages/about.md', sha: 'sha1', size: 500 },
        { name: 'contact.md', path: '_pages/contact.md', sha: 'sha2', size: 600 },
        { name: 'README.txt', path: '_pages/README.txt', sha: 'sha3', size: 100 } // Should be filtered
      ];

      mockListContents('_pages', mockFiles);

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.pages).toHaveLength(2);
      expect(body.pages[0].name).toBe('about.md');
      expect(body.pages[1].name).toBe('contact.md');
      // Verify README.txt was filtered out
      expect(body.pages.some(p => p.name === 'README.txt')).toBe(false);
    });

    it('makes request to GitHub with correct path', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {}
      };

      const scope = mockListContents('_pages', []);

      await handler(event, {});

      // Verify the nock interceptor was called
      expect(scope.isDone()).toBe(true);
    });

    it('returns only name, path, sha, and size for each page', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {}
      };

      const mockFiles = [
        {
          name: 'about.md',
          path: '_pages/about.md',
          sha: 'abc123',
          size: 500,
          url: 'https://api.github.com/...',  // Should be filtered
          git_url: 'https://...',  // Should be filtered
          html_url: 'https://...'  // Should be filtered
        }
      ];

      mockListContents('_pages', mockFiles);

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.pages[0]).toEqual({
        name: 'about.md',
        path: '_pages/about.md',
        sha: 'abc123',
        size: 500
      });
      expect(body.pages[0].url).toBeUndefined();
      expect(body.pages[0].git_url).toBeUndefined();
    });
  });

  describe('GET - List pages with metadata', () => {
    it('fetches frontmatter for each page when metadata=true', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { metadata: 'true' }
      };

      // First call: list pages
      mockListContents('_pages', [
        { name: 'about.md', path: '_pages/about.md', sha: 'sha1', size: 500 }
      ]);

      // Second call: get individual page content
      mockGetFile('_pages/about.md', {
        name: 'about.md',
        sha: 'sha1',
        content: Buffer.from('---\ntitle: About Us\npermalink: /about/\n---\nPage content').toString('base64')
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.pages[0].frontmatter).toEqual({
        title: 'About Us',
        permalink: '/about/'
      });
    });

    it('handles metadata fetch errors gracefully', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { metadata: 'true' }
      };

      // List pages
      mockListContents('_pages', [
        { name: 'page1.md', path: '_pages/page1.md', sha: 'sha1', size: 500 },
        { name: 'page2.md', path: '_pages/page2.md', sha: 'sha2', size: 600 }
      ]);

      // Page 1 succeeds
      mockGetFile('_pages/page1.md', {
        content: Buffer.from('---\ntitle: Page 1\n---\nContent').toString('base64')
      });

      // Page 2 fails with error
      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_pages/page2.md?ref=main', 404, 'Not Found');

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      // Should return both pages, but page2 without metadata
      expect(body.pages).toHaveLength(2);
      expect(body.pages[0].frontmatter).toBeDefined();
      expect(body.pages[1].frontmatter).toBeUndefined();
    });

    it('does not fetch metadata when metadata=false', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { metadata: 'false' }
      };

      const scope = mockListContents('_pages', [
        { name: 'page.md', path: '_pages/page.md', sha: 'sha1', size: 500 }
      ]);

      const response = await handler(event, {});

      // Verify only 1 API call was made (list), no individual page fetches
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('GET - Single page', () => {
    it('retrieves single page with frontmatter and body', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'about.md' }
      };

      const pageContent = `---
title: About Us
permalink: /about/
layout: page
protected: false
---
This is the about page content.`;

      mockGetFile('_pages/about.md', {
        name: 'about.md',
        sha: 'abc123',
        content: Buffer.from(pageContent).toString('base64')
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.path).toBe('about.md');
      expect(body.sha).toBe('abc123');
      expect(body.frontmatter.title).toBe('About Us');
      expect(body.frontmatter.permalink).toBe('/about/');
      expect(body.frontmatter.layout).toBe('page');
      expect(body.frontmatter.protected).toBe(false);
      expect(body.body).toBe('This is the about page content.');
    });

    it('makes request to correct GitHub path for single page', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'contact.md' }
      };

      const scope = mockGetFile('_pages/contact.md', {
        content: Buffer.from('---\ntitle: Contact\n---\nBody').toString('base64'),
        sha: 'abc123'
      });

      await handler(event, {});

      // Verify the nock interceptor was called (correct path was used)
      expect(scope.isDone()).toBe(true);
    });

    it('handles page with no frontmatter', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'simple.md' }
      };

      const pageContent = 'Just plain markdown content, no frontmatter.';

      mockGetFile('_pages/simple.md', {
        content: Buffer.from(pageContent).toString('base64'),
        sha: 'def456'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.frontmatter).toEqual({});
      expect(body.body).toBe(pageContent);
    });

    it('handles page not found (404)', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'nonexistent.md' }
      };

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_pages/nonexistent.md?ref=main', 404, 'Not Found');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });

    it('handles protected page correctly', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'home.md' }
      };

      const pageContent = `---
title: Home
protected: true
---
Home page content.`;

      mockGetFile('_pages/home.md', {
        content: Buffer.from(pageContent).toString('base64'),
        sha: 'abc123'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.frontmatter.protected).toBe(true);
    });
  });

  describe('POST - Create new page', () => {
    it('creates new page successfully', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          path: 'services.md',
          frontmatter: {
            title: 'Our Services',
            permalink: '/services/',
            layout: 'page',
            protected: false
          },
          body: 'This is the services page content.'
        })
      };

      mockPutFile('_pages/services.md', {
        commit: { sha: 'commit-sha-123' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Page created successfully');
      expect(body.commitSha).toBe('commit-sha-123');
    });

    it('sends correct data to GitHub API', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: {
            title: 'Test Page',
            permalink: '/test/'
          },
          body: 'Page body'
        })
      };

      // Mock with a request body matcher to verify the sent data
      const scope = nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_pages/test.md', (body) => {
          // Verify request body structure
          expect(body.message).toBe('Create page: test.md');
          expect(body.branch).toBe('main');

          // Verify content is base64 encoded markdown with frontmatter
          const decodedContent = Buffer.from(body.content, 'base64').toString('utf8');
          expect(decodedContent).toContain('---\ntitle: Test Page');
          expect(decodedContent).toContain('Page body');

          return true;
        })
        .reply(201, { commit: { sha: 'abc' } });

      await handler(event, {});

      // Verify the request was made
      expect(scope.isDone()).toBe(true);
    });

    it('creates page with date field and sets last_modified_at', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: {
            title: 'Test',
            date: '2025-01-01 10:00:00'
          },
          body: 'Body'
        })
      };

      const scope = nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_pages/test.md', (body) => {
          const decodedContent = Buffer.from(body.content, 'base64').toString('utf8');
          // Should have last_modified_at matching the date
          expect(decodedContent).toContain('last_modified_at:');
          expect(decodedContent).toContain('2025-01-01 10:00:00');
          return true;
        })
        .reply(201, { commit: { sha: 'abc' } });

      await handler(event, {});

      expect(scope.isDone()).toBe(true);
    });

    it('creates page without date field and sets last_modified_at to current time', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: {
            title: 'Test'
          },
          body: 'Body'
        })
      };

      const scope = nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_pages/test.md', (body) => {
          const decodedContent = Buffer.from(body.content, 'base64').toString('utf8');
          // Should have last_modified_at set
          expect(decodedContent).toContain('last_modified_at:');
          return true;
        })
        .reply(201, { commit: { sha: 'abc' } });

      await handler(event, {});

      expect(scope.isDone()).toBe(true);
    });

    it('returns 400 when path is missing', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          frontmatter: { title: 'Test' },
          body: 'Body'
          // path missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation failed');
    });

    it('returns 400 when frontmatter is missing', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          path: 'test.md',
          body: 'Body'
          // frontmatter missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation failed');
    });

    it('returns 400 when body is missing', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: { title: 'Test' }
          // body missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation failed');
    });

    it('allows empty string body', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: { title: 'Test' },
          body: ''
        })
      };

      mockPutFile('_pages/test.md', {
        commit: { sha: 'abc' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(201);
    });

    it('returns 503 when GITHUB_TOKEN is missing', async () => {
      delete process.env.GITHUB_TOKEN;

      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: { title: 'Test' },
          body: 'Body'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Service unavailable');
      expect(body.message).toContain('GITHUB_TOKEN');
    });

    it('handles GitHub API error during creation', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: { title: 'Test' },
          body: 'Body'
        })
      };

      mockGitHubError('PUT', '/repos/mfrench71/circleseven-website/contents/_pages/test.md', 409, 'File already exists');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('PUT - Update existing page', () => {
    it('updates page successfully', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          path: 'about.md',
          frontmatter: {
            title: 'Updated About',
            permalink: '/about/'
          },
          body: 'Updated content',
          sha: 'current-sha-123'
        })
      };

      mockPutFile('_pages/about.md', {
        commit: { sha: 'new-commit-sha-456' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Page updated successfully');
      expect(body.commitSha).toBe('new-commit-sha-456');
    });

    it('auto-updates last_modified_at timestamp on update', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: { title: 'Test' },
          body: 'Body',
          sha: 'original-sha-abc123'
        })
      };

      const scope = nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_pages/test.md', (body) => {
          const decodedContent = Buffer.from(body.content, 'base64').toString('utf8');
          // Should have last_modified_at set to current time
          expect(decodedContent).toContain('last_modified_at:');
          return true;
        })
        .reply(200, { commit: { sha: 'new-sha' } });

      await handler(event, {});

      expect(scope.isDone()).toBe(true);
    });

    it('sends SHA for conflict detection', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: { title: 'Test' },
          body: 'Body',
          sha: 'original-sha-abc123'
        })
      };

      // Mock with a request body matcher to verify SHA is sent
      const scope = nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_pages/test.md', (body) => {
          expect(body.sha).toBe('original-sha-abc123');
          expect(body.message).toBe('Update page: test.md');
          return true;
        })
        .reply(200, { commit: { sha: 'new-sha' } });

      await handler(event, {});

      expect(scope.isDone()).toBe(true);
    });

    it('returns 400 when path is missing', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          frontmatter: { title: 'Test' },
          body: 'Body',
          sha: 'abc123'
          // path missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation failed');
    });

    it('returns 400 when sha is missing', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: { title: 'Test' },
          body: 'Body'
          // sha missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation failed');
    });

    it('returns 503 when GITHUB_TOKEN is missing', async () => {
      delete process.env.GITHUB_TOKEN;

      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: { title: 'Test' },
          body: 'Body',
          sha: 'abc123'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Service unavailable');
    });

    it('handles SHA conflict (409)', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: { title: 'Test' },
          body: 'Body',
          sha: 'old-sha'
        })
      };

      mockGitHubError('PUT', '/repos/mfrench71/circleseven-website/contents/_pages/test.md', 409, 'SHA does not match');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('DELETE - Delete page', () => {
    it('deletes page successfully', async () => {
      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          path: 'old-page.md',
          sha: 'file-sha-123'
        })
      };

      mockDeleteFile('_pages/old-page.md', {
        commit: { sha: 'delete-commit-sha' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Page deleted successfully');
      expect(body.commitSha).toBe('delete-commit-sha');
    });

    it('sends correct delete request to GitHub', async () => {
      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          path: 'test-page.md',
          sha: 'sha-to-delete'
        })
      };

      // Mock DELETE request - use mockDeleteFile helper which handles the exact request
      mockDeleteFile('_pages/test-page.md', {
        commit: { sha: 'commit' }
      });

      const response = await handler(event, {});

      // Verify successful deletion
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('returns 400 when path is missing', async () => {
      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          sha: 'abc123'
          // path missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation failed');
    });

    it('returns 400 when sha is missing', async () => {
      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          path: 'test.md'
          // sha missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation failed');
    });

    it('returns 503 when GITHUB_TOKEN is missing', async () => {
      delete process.env.GITHUB_TOKEN;

      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          path: 'test.md',
          sha: 'abc123'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Service unavailable');
    });

    it('handles page not found during delete', async () => {
      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          path: 'nonexistent.md',
          sha: 'abc123'
        })
      };

      mockGitHubError('DELETE', '/repos/mfrench71/circleseven-website/contents/_pages/nonexistent.md', 404, 'Not Found');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('Frontmatter parsing', () => {
    it('parses simple key-value pairs', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'test.md' }
      };

      const content = `---
title: Simple Page
permalink: /simple/
layout: page
---
Body content`;

      mockGetFile('_pages/test.md', {
        content: Buffer.from(content).toString('base64'),
        sha: 'abc'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.frontmatter.title).toBe('Simple Page');
      expect(body.frontmatter.permalink).toBe('/simple/');
      expect(body.frontmatter.layout).toBe('page');
    });

    it('parses boolean protected field', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'test.md' }
      };

      const content = `---
title: Test
protected: true
---
Body`;

      mockGetFile('_pages/test.md', {
        content: Buffer.from(content).toString('base64'),
        sha: 'abc'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.frontmatter.protected).toBe(true);
      expect(typeof body.frontmatter.protected).toBe('boolean');
    });

    it('removes quotes from values', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'test.md' }
      };

      const content = `---
title: "Quoted Title"
permalink: '/quoted-permalink/'
description: "Value with: colon"
---
Body`;

      mockGetFile('_pages/test.md', {
        content: Buffer.from(content).toString('base64'),
        sha: 'abc'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.frontmatter.title).toBe('Quoted Title');
      expect(body.frontmatter.permalink).toBe('/quoted-permalink/');
      expect(body.frontmatter.description).toBe('Value with: colon');
    });

    it('preserves colons in values', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'test.md' }
      };

      const content = `---
title: Page Title
url: https://example.com:8080/path
---
Body`;

      mockGetFile('_pages/test.md', {
        content: Buffer.from(content).toString('base64'),
        sha: 'abc'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.frontmatter.url).toBe('https://example.com:8080/path');
    });

    it('separates body from frontmatter', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'test.md' }
      };

      const content = `---
title: Test Page
---
# Heading

Paragraph with content.

More content here.`;

      mockGetFile('_pages/test.md', {
        content: Buffer.from(content).toString('base64'),
        sha: 'abc'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.body).toBe('# Heading\n\nParagraph with content.\n\nMore content here.');
      expect(body.body).not.toContain('---');
      expect(body.body).not.toContain('title:');
    });
  });

  describe('Validation', () => {
    it('validates query parameters for GET', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'valid-path.md' }
      };

      mockGetFile('_pages/valid-path.md', {
        content: Buffer.from('---\ntitle: Test\n---\nContent').toString('base64'),
        sha: 'abc'
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
    });

    it('returns 400 for invalid path length', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          path: 'a'.repeat(501), // Too long (max 500)
          frontmatter: { title: 'Test' },
          body: 'Body'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation failed');
    });

    it('returns 400 for body too large', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          path: 'test.md',
          frontmatter: { title: 'Test' },
          body: 'x'.repeat(1000001) // Too large (max 1MB)
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation failed');
    });
  });

  describe('Error handling', () => {
    it('returns 405 for unsupported methods', async () => {
      const event = {
        httpMethod: 'PATCH'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Method not allowed');
    });

    it('handles network errors', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {}
      };

      // Simulate a network error using nock
      nock('https://api.github.com')
        .get('/repos/mfrench71/circleseven-website/contents/_pages?ref=main')
        .replyWithError('Network connection failed');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });

    it('includes stack trace in development mode', async () => {
      process.env.NODE_ENV = 'development';

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {}
      };

      // Simulate an error
      nock('https://api.github.com')
        .get('/repos/mfrench71/circleseven-website/contents/_pages?ref=main')
        .replyWithError(new Error('Test error with stack'));

      const response = await handler(event, {});

      const body = JSON.parse(response.body);
      expect(body.stack).toBeDefined();

      delete process.env.NODE_ENV;
    });

    it('hides stack trace in production', async () => {
      process.env.NODE_ENV = 'production';

      const event = {
        httpMethod: 'GET',
        queryStringParameters: {}
      };

      // Simulate an error
      nock('https://api.github.com')
        .get('/repos/mfrench71/circleseven-website/contents/_pages?ref=main')
        .replyWithError(new Error('Test error'));

      const response = await handler(event, {});

      const body = JSON.parse(response.body);
      expect(body.stack).toBeUndefined();

      delete process.env.NODE_ENV;
    });

    it('handles malformed JSON in request body', async () => {
      const event = {
        httpMethod: 'POST',
        body: 'not valid json{{'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
    });
  });

});
