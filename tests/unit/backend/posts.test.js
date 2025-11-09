/**
 * Unit Tests for Posts Netlify Function
 *
 * Tests CRUD operations for Jekyll post files via GitHub API integration.
 * Covers GET (list/single), POST (create), PUT (update), DELETE operations.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { mockListContents, mockGetFile, mockPutFile, mockDeleteFile, mockGitHubError, cleanMocks } from '../../utils/github-mock.js';
import { handler } from '../../../netlify/functions/posts.js';

describe('Posts Function', () => {
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
      mockListContents('_posts', [
        { name: '2025-10-21-test-post.md', path: '_posts/2025-10-21-test-post.md', sha: 'abc123', size: 500 }
      ]);

      const response = await handler(event, {});

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('GET - List all posts', () => {
    it('lists all markdown posts from _posts directory', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {}
      };

      const mockFiles = [
        { name: '2025-10-21-first-post.md', path: '_posts/2025-10-21-first-post.md', sha: 'sha1', size: 500 },
        { name: '2025-10-22-second-post.md', path: '_posts/2025-10-22-second-post.md', sha: 'sha2', size: 600 },
        { name: 'README.txt', path: '_posts/README.txt', sha: 'sha3', size: 100 } // Should be filtered
      ];

      mockListContents('_posts', mockFiles);

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.posts).toHaveLength(2);
      expect(body.posts[0].name).toBe('2025-10-21-first-post.md');
      expect(body.posts[1].name).toBe('2025-10-22-second-post.md');
      // Verify README.txt was filtered out
      expect(body.posts.some(p => p.name === 'README.txt')).toBe(false);
    });

    it('makes request to GitHub with correct path', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {}
      };

      const scope = mockListContents('_posts', []);

      await handler(event, {});

      // Verify the nock interceptor was called
      expect(scope.isDone()).toBe(true);
    });

    it('returns only name, path, sha, and size for each post', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: {}
      };

      const mockFiles = [
        {
          name: '2025-10-21-post.md',
          path: '_posts/2025-10-21-post.md',
          sha: 'abc123',
          size: 500,
          url: 'https://api.github.com/...',  // Should be filtered
          git_url: 'https://...',  // Should be filtered
          html_url: 'https://...'  // Should be filtered
        }
      ];

      mockListContents('_posts', mockFiles);

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.posts[0]).toEqual({
        name: '2025-10-21-post.md',
        path: '_posts/2025-10-21-post.md',
        sha: 'abc123',
        size: 500
      });
      expect(body.posts[0].url).toBeUndefined();
      expect(body.posts[0].git_url).toBeUndefined();
    });
  });

  describe('GET - List posts with metadata', () => {
    it('fetches frontmatter for each post when metadata=true', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { metadata: 'true' }
      };

      // First call: list posts
      mockListContents('_posts', [
        { name: '2025-10-21-post.md', path: '_posts/2025-10-21-post.md', sha: 'sha1', size: 500 }
      ]);

      // Second call: get individual post content
      mockGetFile('_posts/2025-10-21-post.md', {
        name: '2025-10-21-post.md',
        sha: 'sha1',
        content: Buffer.from('---\ntitle: Test Post\ndate: 2025-10-21\n---\nPost content').toString('base64')
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.posts[0].frontmatter).toEqual({
        title: 'Test Post',
        date: '2025-10-21'
      });
    });

    it('handles metadata fetch errors gracefully', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { metadata: 'true' }
      };

      // List posts
      mockListContents('_posts', [
        { name: 'post1.md', path: '_posts/post1.md', sha: 'sha1', size: 500 },
        { name: 'post2.md', path: '_posts/post2.md', sha: 'sha2', size: 600 }
      ]);

      // Post 1 succeeds
      mockGetFile('_posts/post1.md', {
        content: Buffer.from('---\ntitle: Post 1\n---\nContent').toString('base64')
      });

      // Post 2 fails with error
      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_posts/post2.md?ref=main', 404, 'Not Found');

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      // Should return both posts, but post2 without metadata
      expect(body.posts).toHaveLength(2);
      expect(body.posts[0].frontmatter).toBeDefined();
      expect(body.posts[1].frontmatter).toBeUndefined();
    });

    it('does not fetch metadata when metadata=false', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { metadata: 'false' }
      };

      const scope = mockListContents('_posts', [
        { name: 'post.md', path: '_posts/post.md', sha: 'sha1', size: 500 }
      ]);

      const response = await handler(event, {});

      // Verify only 1 API call was made (list), no individual post fetches
      expect(scope.isDone()).toBe(true);
    });
  });

  describe('GET - Single post', () => {
    it('retrieves single post with frontmatter and body', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: '2025-10-21-test-post.md' }
      };

      const postContent = `---
title: My Test Post
date: 2025-10-21
categories:
  - Technology
  - JavaScript
tags:
  - coding
---
This is the post body content.`;

      mockGetFile('_posts/2025-10-21-test-post.md', {
        name: '2025-10-21-test-post.md',
        sha: 'abc123',
        content: Buffer.from(postContent).toString('base64')
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.path).toBe('2025-10-21-test-post.md');
      expect(body.sha).toBe('abc123');
      expect(body.frontmatter.title).toBe('My Test Post');
      expect(body.frontmatter.date).toBe('2025-10-21');
      expect(body.frontmatter.categories).toEqual(['Technology', 'JavaScript']);
      expect(body.frontmatter.tags).toEqual(['coding']);
      expect(body.body).toBe('This is the post body content.');
    });

    it('makes request to correct GitHub path for single post', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: '2025-10-21-my-post.md' }
      };

      const scope = mockGetFile('_posts/2025-10-21-my-post.md', {
        content: Buffer.from('---\ntitle: Test\n---\nBody').toString('base64'),
        sha: 'abc123'
      });

      await handler(event, {});

      // Verify the nock interceptor was called (correct path was used)
      expect(scope.isDone()).toBe(true);
    });

    it('handles post with no frontmatter', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'simple-post.md' }
      };

      const postContent = 'Just plain markdown content, no frontmatter.';

      mockGetFile('_posts/simple-post.md', {
        content: Buffer.from(postContent).toString('base64'),
        sha: 'def456'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.frontmatter).toEqual({});
      expect(body.body).toBe(postContent);
    });

    it('handles post not found (404)', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'nonexistent-post.md' }
      };

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_posts/nonexistent-post.md?ref=main', 404, 'Not Found');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('POST - Create new post', () => {
    it('creates new post successfully', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          filename: '2025-10-22-new-post.md',
          frontmatter: {
            title: 'New Post',
            date: '2025-10-22',
            categories: ['Tech'],
            tags: ['test']
          },
          body: 'This is the new post content.'
        })
      };

      mockPutFile('_posts/2025-10-22-new-post.md', {
        commit: { sha: 'commit-sha-123' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Post created successfully');
      expect(body.commitSha).toBe('commit-sha-123');
    });

    it('sends correct data to GitHub API', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          filename: '2025-10-22-test.md',
          frontmatter: {
            title: 'Test Post',
            date: '2025-10-22'
          },
          body: 'Post body'
        })
      };

      // Mock with a request body matcher to verify the sent data
      const scope = nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_posts/2025-10-22-test.md', (body) => {
          // Verify request body structure
          expect(body.message).toBe('Create post: 2025-10-22-test.md');
          expect(body.branch).toBe('main');

          // Verify content is base64 encoded markdown with frontmatter
          const decodedContent = Buffer.from(body.content, 'base64').toString('utf8');
          expect(decodedContent).toContain('---\ntitle: Test Post');
          expect(decodedContent).toContain('Post body');

          return true;
        })
        .reply(201, { commit: { sha: 'abc' } });

      await handler(event, {});

      // Verify the request was made
      expect(scope.isDone()).toBe(true);
    });

    it('builds frontmatter correctly with arrays', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          filename: 'test.md',
          frontmatter: {
            title: 'Test',
            categories: ['Tech', 'JavaScript'],
            tags: []
          },
          body: 'Body'
        })
      };

      // Mock with a request body matcher to verify frontmatter formatting
      const scope = nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_posts/test.md', (body) => {
          const decodedContent = Buffer.from(body.content, 'base64').toString('utf8');
          expect(decodedContent).toContain('categories:\n  - Tech\n  - JavaScript');
          expect(decodedContent).toContain('tags: []');
          return true;
        })
        .reply(201, { commit: { sha: 'abc' } });

      await handler(event, {});

      expect(scope.isDone()).toBe(true);
    });

    it('returns 400 when filename is missing', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          frontmatter: { title: 'Test' },
          body: 'Body'
          // filename missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation failed');
      expect(body.message).toContain('filename');
    });

    it('returns 400 when frontmatter is missing', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          filename: 'test.md',
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
          filename: 'test.md',
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
          filename: 'test.md',
          frontmatter: { title: 'Test' },
          body: ''
        })
      };

      mockPutFile('_posts/test.md', {
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
          filename: 'test.md',
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
          filename: 'test.md',
          frontmatter: { title: 'Test' },
          body: 'Body'
        })
      };

      mockGitHubError('PUT', '/repos/mfrench71/circleseven-website/contents/_posts/test.md', 409, 'File already exists');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('PUT - Update existing post', () => {
    it('updates post successfully', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          path: '2025-10-21-existing-post.md',
          frontmatter: {
            title: 'Updated Title',
            date: '2025-10-21'
          },
          body: 'Updated content',
          sha: 'current-sha-123'
        })
      };

      mockPutFile('_posts/2025-10-21-existing-post.md', {
        commit: { sha: 'new-commit-sha-456' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Post updated successfully');
      expect(body.commitSha).toBe('new-commit-sha-456');
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
        .put('/repos/mfrench71/circleseven-website/contents/_posts/test.md', (body) => {
          expect(body.sha).toBe('original-sha-abc123');
          expect(body.message).toBe('Update post: test.md');
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
      expect(body.message).toContain('path');
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
      expect(body.message).toContain('sha');
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

      mockGitHubError('PUT', '/repos/mfrench71/circleseven-website/contents/_posts/test.md', 409, 'SHA does not match');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('DELETE - Delete post', () => {
    it('deletes post successfully', async () => {
      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          path: '2025-10-21-old-post.md',
          sha: 'file-sha-123'
        })
      };

      mockDeleteFile('_posts/2025-10-21-old-post.md', {
        commit: { sha: 'delete-commit-sha' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Post deleted successfully');
      expect(body.commitSha).toBe('delete-commit-sha');
    });

    it('sends correct delete request to GitHub', async () => {
      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          path: 'test-post.md',
          sha: 'sha-to-delete'
        })
      };

      // Mock DELETE request - use mockDeleteFile helper which handles the exact request
      mockDeleteFile('_posts/test-post.md', {
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
      expect(body.message).toContain('path');
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
      expect(body.message).toContain('sha');
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

    it('handles post not found during delete', async () => {
      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          path: 'nonexistent.md',
          sha: 'abc123'
        })
      };

      mockGitHubError('DELETE', '/repos/mfrench71/circleseven-website/contents/_posts/nonexistent.md', 404, 'Not Found');

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
title: Simple Post
date: 2025-10-21
author: John Doe
---
Body content`;

      mockGetFile('_posts/test.md', {
        content: Buffer.from(content).toString('base64'),
        sha: 'abc'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.frontmatter.title).toBe('Simple Post');
      expect(body.frontmatter.date).toBe('2025-10-21');
      expect(body.frontmatter.author).toBe('John Doe');
    });

    it('parses arrays with dash syntax', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'test.md' }
      };

      const content = `---
title: Test
categories:
  - Technology
  - JavaScript
  - Web Development
tags:
  - coding
---
Body`;

      mockGetFile('_posts/test.md', {
        content: Buffer.from(content).toString('base64'),
        sha: 'abc'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.frontmatter.categories).toEqual(['Technology', 'JavaScript', 'Web Development']);
      expect(body.frontmatter.tags).toEqual(['coding']);
    });

    it('parses arrays with bracket syntax', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'test.md' }
      };

      const content = `---
title: Test
categories: [Tech, JavaScript]
tags: ['coding', 'tutorial']
---
Body`;

      mockGetFile('_posts/test.md', {
        content: Buffer.from(content).toString('base64'),
        sha: 'abc'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.frontmatter.categories).toEqual(['Tech', 'JavaScript']);
      expect(body.frontmatter.tags).toEqual(['coding', 'tutorial']);
    });

    it('removes quotes from values', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'test.md' }
      };

      const content = `---
title: "Quoted Title"
author: 'Single Quoted'
description: "Value with: colon"
---
Body`;

      mockGetFile('_posts/test.md', {
        content: Buffer.from(content).toString('base64'),
        sha: 'abc'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.frontmatter.title).toBe('Quoted Title');
      expect(body.frontmatter.author).toBe('Single Quoted');
      expect(body.frontmatter.description).toBe('Value with: colon');
    });

    it('preserves colons in values', async () => {
      const event = {
        httpMethod: 'GET',
        queryStringParameters: { path: 'test.md' }
      };

      const content = `---
title: Post Title
url: https://example.com:8080/path
---
Body`;

      mockGetFile('_posts/test.md', {
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
title: Test Post
---
# Heading

Paragraph with content.

More content here.`;

      mockGetFile('_posts/test.md', {
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
        .get('/repos/mfrench71/circleseven-website/contents/_posts?ref=main')
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
        .get('/repos/mfrench71/circleseven-website/contents/_posts?ref=main')
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
        .get('/repos/mfrench71/circleseven-website/contents/_posts?ref=main')
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
