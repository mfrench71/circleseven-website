/**
 * Unit Tests for Bin Netlify Function
 *
 * Tests soft-deletion and restoration system for posts and pages.
 * Covers bin operations: list, move to bin, restore, permanent delete.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { mockListContents, mockGetFile, mockPutFile, mockDeleteFile, mockGitHubError, cleanMocks } from '../../utils/github-mock.js';
import { handler } from '../../../netlify/functions/bin.js';

describe('Bin Function', () => {
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
        httpMethod: 'GET'
      };

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_bin?ref=main', 404, 'Not Found');

      const response = await handler(event, {});

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('GET - List bined items', () => {
    it('lists all bined markdown files', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const mockBinFiles = [
        { name: '2025-10-21-post.md', path: '_bin/2025-10-21-post.md', sha: 'sha1', size: 500 },
        { name: 'about.md', path: '_bin/about.md', sha: 'sha2', size: 300 },
        { name: 'README.txt', path: '_bin/README.txt', sha: 'sha3', size: 100 } // Should be filtered
      ];

      // First call: list bin directory
      mockListContents('_bin', mockBinFiles);

      // Subsequent calls: get each file's content for binned_at
      mockGetFile('_bin/2025-10-21-post.md', {
        content: Buffer.from('---\ntitle: Post\nbinned_at: 2025-10-21T10:00:00Z\n---\nContent').toString('base64')
      });

      mockGetFile('_bin/about.md', {
        content: Buffer.from('---\ntitle: About\nbinned_at: 2025-10-22T15:30:00Z\n---\nContent').toString('base64')
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toHaveLength(2);
      expect(body.items[0].name).toBe('2025-10-21-post.md');
      expect(body.items[0].type).toBe('post');
      expect(body.items[0].binned_at).toBe('2025-10-21T10:00:00Z');
      expect(body.items[1].name).toBe('about.md');
      expect(body.items[1].type).toBe('page');
      // Verify .txt file was filtered out
      expect(body.items.some(item => item.name === 'README.txt')).toBe(false);
    });

    it('auto-detects item type based on filename pattern', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const mockBinFiles = [
        { name: '2025-10-21-my-post.md', path: '_bin/2025-10-21-my-post.md', sha: 'sha1', size: 500 },
        { name: 'contact.md', path: '_bin/contact.md', sha: 'sha2', size: 300 },
        { name: '2024-12-01-old-post.md', path: '_bin/2024-12-01-old-post.md', sha: 'sha3', size: 400 }
      ];

      // List bin directory
      mockListContents('_bin', mockBinFiles);

      // Get each file's content
      mockGetFile('_bin/2025-10-21-my-post.md', {
        content: Buffer.from('---\ntitle: Post 1\nbinned_at: 2025-10-21\n---\n').toString('base64')
      });
      mockGetFile('_bin/contact.md', {
        content: Buffer.from('---\ntitle: Contact\nbinned_at: 2025-10-21\n---\n').toString('base64')
      });
      mockGetFile('_bin/2024-12-01-old-post.md', {
        content: Buffer.from('---\ntitle: Old\nbinned_at: 2024-12-01\n---\n').toString('base64')
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      // Files starting with YYYY-MM-DD- are posts
      expect(body.items[0].type).toBe('post');
      expect(body.items[2].type).toBe('post');
      // Files without date prefix are pages
      expect(body.items[1].type).toBe('page');
    });

    it('returns empty array when bin directory does not exist', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_bin?ref=main', 404, 'Not Found');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.items).toEqual([]);
    });

    it('handles missing binned_at gracefully', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const mockBinFiles = [
        { name: 'test.md', path: '_bin/test.md', sha: 'sha1', size: 500 }
      ];

      // List bin directory
      mockListContents('_bin', mockBinFiles);

      // Get file content without binned_at
      mockGetFile('_bin/test.md', {
        content: Buffer.from('---\ntitle: Test\n---\nNo binned_at field').toString('base64')
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.items[0].binned_at).toBeNull();
    });

    it('handles error fetching binned_at for individual files', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const mockBinFiles = [
        { name: 'file1.md', path: '_bin/file1.md', sha: 'sha1', size: 500 },
        { name: 'file2.md', path: '_bin/file2.md', sha: 'sha2', size: 600 }
      ];

      // List bin directory
      mockListContents('_bin', mockBinFiles);

      // file1 succeeds
      mockGetFile('_bin/file1.md', {
        content: Buffer.from('---\nbinned_at: 2025-10-21\n---\n').toString('base64')
      });

      // file2 errors - mock a network error
      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_bin/file2.md?ref=main', 500, 'Network error');

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      // Should still return both files, file2 with null binned_at
      expect(body.items).toHaveLength(2);
      expect(body.items[0].binned_at).toBe('2025-10-21');
      expect(body.items[1].binned_at).toBeNull();
    });
  });

  describe('POST - Move to bin', () => {
    it('moves post to bin successfully', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          filename: '2025-10-21-test-post.md',
          sha: 'old-sha-123',
          type: 'post'
        })
      };

      const originalContent = `---
title: Test Post
date: 2025-10-21
---
Post content here`;

      // Step 1: Get original file from _posts
      mockGetFile('_posts/2025-10-21-test-post.md', {
        content: Buffer.from(originalContent).toString('base64'),
        sha: 'current-sha-456'
      });

      // Step 2: Check if already exists in bin (returns 404 - doesn't exist)
      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_bin/2025-10-21-test-post.md?ref=main', 404, 'Not Found');

      // Step 3: Create in bin
      mockPutFile('_bin/2025-10-21-test-post.md', {
        commit: { sha: 'bin-commit-sha' }
      });

      // Step 4: Delete from source
      mockDeleteFile('_posts/2025-10-21-test-post.md', {
        commit: { sha: 'delete-commit-sha' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Post moved to bin successfully');
      expect(body.commitSha).toBe('bin-commit-sha');
    });

    it('adds binned_at timestamp to frontmatter', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          filename: 'test.md',
          sha: 'sha123',
          type: 'post'
        })
      };

      const originalContent = `---
title: Test
---
Content`;

      let binedContent = '';

      // Step 1: Get original file
      mockGetFile('_posts/test.md', {
        content: Buffer.from(originalContent).toString('base64'),
        sha: 'current-sha'
      });

      // Step 2: Check bin (404)
      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_bin/test.md?ref=main', 404, 'Not Found');

      // Step 3: Create in bin - capture content
      nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_bin/test.md', (body) => {
          binedContent = JSON.stringify(body);
          return true;
        })
        .reply(200, { commit: { sha: 'abc' } });

      // Step 4: Delete from source
      mockDeleteFile('_posts/test.md', {
        commit: { sha: 'def' }
      });

      await handler(event, {});

      // Verify binned_at was added
      const requestBody = JSON.parse(binedContent);
      const decodedContent = Buffer.from(requestBody.content, 'base64').toString('utf8');
      expect(decodedContent).toContain('binned_at:');
      expect(decodedContent).toMatch(/binned_at: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('renames file with timestamp if already exists in bin', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          filename: 'existing-post.md',
          sha: 'sha123',
          type: 'post'
        })
      };

      let capturedPath = '';

      // Step 1: Get original file
      mockGetFile('_posts/existing-post.md', {
        content: Buffer.from('---\ntitle: Test\n---\nContent').toString('base64'),
        sha: 'current'
      });

      // Step 2: Check bin - file EXISTS (returns 200, not 404)
      mockGetFile('_bin/existing-post.md', {
        name: 'existing-post.md',
        sha: 'exists'
      });

      // Step 3: Create in bin with renamed file - capture path with regex matcher
      nock('https://api.github.com')
        .put(/\/repos\/mfrench71\/circleseven-website\/contents\/_bin\/existing-post-.*\.md$/, (body) => {
          return true;
        })
        .reply(function(uri) {
          capturedPath = uri;
          return [200, { commit: { sha: 'abc' } }];
        });

      // Step 4: Delete from source
      mockDeleteFile('_posts/existing-post.md', {
        commit: { sha: 'def' }
      });

      await handler(event, {});

      // Verify filename was renamed with timestamp
      expect(capturedPath).toContain('_bin/existing-post-');
      expect(capturedPath).toMatch(/_bin\/existing-post-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.md$/);
    });

    it('uses post directory for type=post', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          filename: '2025-10-21-post.md',
          sha: 'sha123',
          type: 'post'
        })
      };

      // Should get from _posts directory
      const scope = mockGetFile('_posts/2025-10-21-post.md', {
        content: Buffer.from('---\ntitle: Test\n---\n').toString('base64'),
        sha: 'abc'
      });

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_bin/2025-10-21-post.md?ref=main', 404, 'Not Found');
      mockPutFile('_bin/2025-10-21-post.md', { commit: { sha: 'bin' } });
      mockDeleteFile('_posts/2025-10-21-post.md', { commit: { sha: 'del' } });

      await handler(event, {});

      // Verify nock intercepted _posts path (not _pages)
      expect(scope.isDone()).toBe(true);
    });

    it('uses page directory for type=page', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          filename: 'about.md',
          sha: 'sha123',
          type: 'page'
        })
      };

      // Should get from _pages directory
      const scope = mockGetFile('_pages/about.md', {
        content: Buffer.from('---\ntitle: Test\n---\n').toString('base64'),
        sha: 'abc'
      });

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_bin/about.md?ref=main', 404, 'Not Found');
      mockPutFile('_bin/about.md', { commit: { sha: 'bin' } });
      mockDeleteFile('_pages/about.md', { commit: { sha: 'del' } });

      await handler(event, {});

      // Verify nock intercepted _pages path (not _posts)
      expect(scope.isDone()).toBe(true);
    });

    it('defaults to posts directory when type not specified', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          filename: 'test.md',
          sha: 'sha123'
          // type not specified
        })
      };

      // Should default to _posts directory
      const scope = mockGetFile('_posts/test.md', {
        content: Buffer.from('---\ntitle: Test\n---\n').toString('base64'),
        sha: 'abc'
      });

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_bin/test.md?ref=main', 404, 'Not Found');
      mockPutFile('_bin/test.md', { commit: { sha: 'bin' } });
      mockDeleteFile('_posts/test.md', { commit: { sha: 'del' } });

      await handler(event, {});

      // Verify nock intercepted _posts path (default behavior)
      expect(scope.isDone()).toBe(true);
    });

    it('returns 400 when filename is missing', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          sha: 'sha123',
          type: 'post'
          // filename missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Validation failed');
      expect(body.message).toContain('filename');
    });

    it('returns 400 when sha is missing', async () => {
      const event = {
        httpMethod: 'POST',
        body: JSON.stringify({
          filename: 'test.md',
          type: 'post'
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
        httpMethod: 'POST',
        body: JSON.stringify({
          filename: 'test.md',
          sha: 'sha123',
          type: 'post'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('GitHub integration not configured');
    });
  });

  describe('PUT - Restore from bin', () => {
    it('restores post from bin successfully', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          filename: '2025-10-21-restored-post.md',
          sha: 'bin-sha-123',
          type: 'post'
        })
      };

      const binedContent = `---
title: Restored Post
date: 2025-10-21
binned_at: 2025-10-21T10:00:00Z
---
Content`;

      // Step 1: Check if exists in destination (404 - doesn't exist, which is good)
      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_posts/2025-10-21-restored-post.md?ref=main', 404, 'Not Found');

      // Step 2: Get binned item from bin
      mockGetFile('_bin/2025-10-21-restored-post.md', {
        content: Buffer.from(binedContent).toString('base64'),
        sha: 'bin-sha-123'
      });

      // Step 3: Restore to destination (_posts)
      mockPutFile('_posts/2025-10-21-restored-post.md', {
        commit: { sha: 'restore-commit' }
      });

      // Step 4: Delete from bin
      mockDeleteFile('_bin/2025-10-21-restored-post.md', {
        commit: { sha: 'delete-commit' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Post restored successfully');
      expect(body.commitSha).toBe('restore-commit');
    });

    it('removes binned_at from frontmatter when restoring', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          filename: 'test.md',
          sha: 'sha123',
          type: 'post'
        })
      };

      const binedContent = `---
title: Test
date: 2025-10-21
binned_at: 2025-10-21T10:00:00Z
categories:
  - Tech
---
Content`;

      let restoredContent = '';

      // Step 1: Check destination (404)
      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_posts/test.md?ref=main', 404, 'Not Found');

      // Step 2: Get binned item
      mockGetFile('_bin/test.md', {
        content: Buffer.from(binedContent).toString('base64')
      });

      // Step 3: Restore - capture content
      nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_posts/test.md', (body) => {
          restoredContent = JSON.stringify(body);
          return true;
        })
        .reply(200, { commit: { sha: 'abc' } });

      // Step 4: Delete from bin
      mockDeleteFile('_bin/test.md', {
        commit: { sha: 'def' }
      });

      await handler(event, {});

      // Verify binned_at was removed
      const requestBody = JSON.parse(restoredContent);
      const decodedContent = Buffer.from(requestBody.content, 'base64').toString('utf8');
      expect(decodedContent).not.toContain('binned_at');
      expect(decodedContent).toContain('title: Test');
      expect(decodedContent).toContain('categories:');
    });

    it('auto-detects type from filename when type not provided', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          filename: '2025-10-21-auto-detected-post.md',
          sha: 'sha123'
          // type not provided - should auto-detect as post
        })
      };

      // Filename starts with YYYY-MM-DD-, so should go to _posts
      const scope = mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_posts/2025-10-21-auto-detected-post.md?ref=main', 404, 'Not Found');

      mockGetFile('_bin/2025-10-21-auto-detected-post.md', {
        content: Buffer.from('---\ntitle: Test\n---\n').toString('base64')
      });

      mockPutFile('_posts/2025-10-21-auto-detected-post.md', {
        commit: { sha: 'abc' }
      });

      mockDeleteFile('_bin/2025-10-21-auto-detected-post.md', {
        commit: { sha: 'def' }
      });

      await handler(event, {});

      // Verify nock intercepted _posts path (auto-detected from date in filename)
      expect(scope.isDone()).toBe(true);
    });

    it('auto-detects page type from filename without date', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          filename: 'about.md',
          sha: 'sha123'
          // type not provided - should auto-detect as page
        })
      };

      // Filename doesn't start with date, so should go to _pages
      const scope = mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_pages/about.md?ref=main', 404, 'Not Found');

      mockGetFile('_bin/about.md', {
        content: Buffer.from('---\ntitle: About\n---\n').toString('base64')
      });

      mockPutFile('_pages/about.md', {
        commit: { sha: 'abc' }
      });

      mockDeleteFile('_bin/about.md', {
        commit: { sha: 'def' }
      });

      await handler(event, {});

      // Verify nock intercepted _pages path (auto-detected from lack of date in filename)
      expect(scope.isDone()).toBe(true);
    });

    it('returns 409 when file already exists in destination', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          filename: '2025-10-21-existing.md',
          sha: 'sha123',
          type: 'post'
        })
      };

      // Mock file already exists in destination
      mockGetFile('_posts/2025-10-21-existing.md', {
        name: '2025-10-21-existing.md',
        sha: 'already-exists'
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('File already exists');
      expect(body.message).toContain('already exists');
    });

    it('returns 400 when filename is missing', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          sha: 'sha123',
          type: 'post'
          // filename missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('filename');
    });

    it('returns 503 when GITHUB_TOKEN is missing', async () => {
      delete process.env.GITHUB_TOKEN;

      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          filename: 'test.md',
          sha: 'sha123'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('GitHub integration not configured');
    });
  });

  describe('DELETE - Permanent delete', () => {
    it('permanently deletes item from bin', async () => {
      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          filename: '2025-10-21-deleted.md',
          sha: 'bin-sha-123',
          type: 'post'
        })
      };

      mockDeleteFile('_bin/2025-10-21-deleted.md', {
        commit: { sha: 'delete-commit-sha' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toBe('Post permanently deleted');
      expect(body.commitSha).toBe('delete-commit-sha');
    });

    it('sends delete request to bin directory', async () => {
      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          filename: 'test.md',
          sha: 'sha123',
          type: 'post'
        })
      };

      // Mock with body matcher to verify delete request details
      mockDeleteFile('_bin/test.md', {
        commit: { sha: 'abc' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
    });

    it('capitalizes item type in message', async () => {
      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          filename: 'about.md',
          sha: 'sha123',
          type: 'page'
        })
      };

      mockDeleteFile('_bin/about.md', {
        commit: { sha: 'abc' }
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.message).toBe('Page permanently deleted');
    });

    it('returns 400 when filename is missing', async () => {
      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          sha: 'sha123'
          // filename missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('filename');
    });

    it('returns 503 when GITHUB_TOKEN is missing', async () => {
      delete process.env.GITHUB_TOKEN;

      const event = {
        httpMethod: 'DELETE',
        body: JSON.stringify({
          filename: 'test.md',
          sha: 'sha123'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('GitHub integration not configured');
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

    it('includes error details in development mode', async () => {
      process.env.NODE_ENV = 'development';

      const event = {
        httpMethod: 'POST',
        body: 'invalid json{{'
      };

      const response = await handler(event, {});

      const body = JSON.parse(response.body);
      expect(body.stack).toBeDefined();

      delete process.env.NODE_ENV;
    });

    it('hides stack trace in production', async () => {
      process.env.NODE_ENV = 'production';

      const event = {
        httpMethod: 'POST',
        body: 'invalid json'
      };

      const response = await handler(event, {});

      const body = JSON.parse(response.body);
      expect(body.stack).toBeUndefined();

      delete process.env.NODE_ENV;
    });
  });

  // Helper functions
});
