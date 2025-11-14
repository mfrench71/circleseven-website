/**
 * Unit Tests for Taxonomy Migrate Netlify Function
 *
 * Tests bulk taxonomy operations: find, rename, and merge.
 * Validates operations across posts and pages.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';

// Import test utilities
import {
  mockListContents,
  mockGetFile,
  mockPutFile,
  cleanMocks
} from '../../utils/github-mock.js';

// Import function
const { handler } = await import('../../../netlify/functions/taxonomy-migrate.js');

describe('Taxonomy Migrate Function', () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'test-token';
    cleanMocks();
  });

  afterEach(() => {
    cleanMocks();
    delete process.env.GITHUB_TOKEN;
  });

  describe('OPTIONS - CORS Preflight', () => {
    it('returns 200 for OPTIONS requests', async () => {
      const event = {
        httpMethod: 'OPTIONS',
        headers: {}
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    });
  });

  describe('POST - Find Operation', () => {
    it('finds posts with matching category', async () => {
      // Mock _posts directory listing
      mockListContents('_posts', [
        { name: '2025-01-01-post1.md', path: '_posts/2025-01-01-post1.md', sha: 'sha1' },
        { name: '2025-01-02-post2.md', path: '_posts/2025-01-02-post2.md', sha: 'sha2' }
      ]);

      // Mock _pages directory listing
      mockListContents('_pages', []);

      // Mock file contents with categories
      mockGetFile('_posts/2025-01-01-post1.md', {
        content: Buffer.from(`---
title: Post 1
categories:
  - Tech
  - Life
---
Content`).toString('base64')
      });

      mockGetFile('_posts/2025-01-02-post2.md', {
        content: Buffer.from(`---
title: Post 2
categories:
  - Music
---
Content`).toString('base64')
      });

      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'find',
          type: 'category',
          terms: ['Tech']
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.operation).toBe('find');
      expect(body.type).toBe('category');
      expect(body.totalAffected).toBe(1);
      expect(body.affected.length).toBe(1);
      expect(body.affected[0].name).toBe('2025-01-01-post1.md');
      expect(body.affected[0].matchingTerms).toContain('Tech');
    });

    it('finds pages with matching tags', async () => {
      mockListContents('_posts', []);

      mockListContents('_pages', [
        { name: 'about.md', path: '_pages/about.md', sha: 'sha1' }
      ]);

      mockGetFile('_pages/about.md', {
        content: Buffer.from(`---
title: About
tags:
  - featured
  - important
---
Content`).toString('base64')
      });

      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'find',
          type: 'tag',
          terms: ['featured']
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.totalAffected).toBe(1);
      expect(body.affected[0].name).toBe('about.md');
    });

    it('finds multiple files with matching terms (case-insensitive)', async () => {
      mockListContents('_posts', [
        { name: '2025-01-01-post1.md', path: '_posts/2025-01-01-post1.md', sha: 'sha1' },
        { name: '2025-01-02-post2.md', path: '_posts/2025-01-02-post2.md', sha: 'sha2' }
      ]);

      mockListContents('_pages', []);

      mockGetFile('_posts/2025-01-01-post1.md', {
        content: Buffer.from(`---
title: Post 1
tags:
  - tech
---
Content`).toString('base64')
      });

      mockGetFile('_posts/2025-01-02-post2.md', {
        content: Buffer.from(`---
title: Post 2
tags:
  - Tech
  - Life
---
Content`).toString('base64')
      });

      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'find',
          type: 'tag',
          terms: ['Tech'] // Should match both 'tech' and 'Tech'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.totalAffected).toBe(2);
    });

    it('returns 400 for missing terms', async () => {
      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'find',
          type: 'category'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toContain('terms');
    });
  });

  describe('POST - Rename Operation', () => {
    it('renames category across all affected files', async () => {
      mockListContents('_posts', [
        { name: '2025-01-01-post1.md', path: '_posts/2025-01-01-post1.md', sha: 'sha1' }
      ]);

      mockListContents('_pages', []);

      const originalContent = `---
title: Post 1
categories:
  - Tech
  - Life
---
Content`;

      mockGetFile('_posts/2025-01-01-post1.md', {
        content: Buffer.from(originalContent).toString('base64')
      });

      // First get for finding
      mockGetFile('_posts/2025-01-01-post1.md', {
        content: Buffer.from(originalContent).toString('base64')
      });

      mockPutFile('_posts/2025-01-01-post1.md', {
        commit: { sha: 'new-sha' }
      });

      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'rename',
          type: 'category',
          oldName: 'Tech',
          newName: 'Technology'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.operation).toBe('rename');
      expect(body.oldName).toBe('Tech');
      expect(body.newName).toBe('Technology');
      expect(body.updated.length).toBe(1);
      expect(body.errors.length).toBe(0);
    });

    it('renames tags (case-insensitive matching)', async () => {
      mockListContents('_posts', [
        { name: '2025-01-01-post1.md', path: '_posts/2025-01-01-post1.md', sha: 'sha1' }
      ]);

      mockListContents('_pages', []);

      const originalContent = `---
title: Post 1
tags:
  - tech
  - life
---
Content`;

      mockGetFile('_posts/2025-01-01-post1.md', {
        content: Buffer.from(originalContent).toString('base64')
      });

      mockGetFile('_posts/2025-01-01-post1.md', {
        content: Buffer.from(originalContent).toString('base64')
      });

      mockPutFile('_posts/2025-01-01-post1.md', {
        commit: { sha: 'new-sha' }
      });

      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'rename',
          type: 'tag',
          oldName: 'Tech', // Uppercase
          newName: 'Technology'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.updated.length).toBe(1);
    });

    it('returns 400 for missing oldName or newName', async () => {
      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'rename',
          type: 'category',
          oldName: 'Tech'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.message).toContain('newName');
    });
  });

  describe('POST - Merge Operation', () => {
    it('merges multiple categories into one', async () => {
      mockListContents('_posts', [
        { name: '2025-01-01-post1.md', path: '_posts/2025-01-01-post1.md', sha: 'sha1' },
        { name: '2025-01-02-post2.md', path: '_posts/2025-01-02-post2.md', sha: 'sha2' }
      ]);

      mockListContents('_pages', []);

      const content1 = `---
title: Post 1
categories:
  - Tech
  - Life
---
Content`;

      const content2 = `---
title: Post 2
categories:
  - Technology
  - Music
---
Content`;

      // For finding
      mockGetFile('_posts/2025-01-01-post1.md', {
        content: Buffer.from(content1).toString('base64')
      });

      mockGetFile('_posts/2025-01-02-post2.md', {
        content: Buffer.from(content2).toString('base64')
      });

      // For updating
      mockGetFile('_posts/2025-01-01-post1.md', {
        content: Buffer.from(content1).toString('base64')
      });

      mockGetFile('_posts/2025-01-02-post2.md', {
        content: Buffer.from(content2).toString('base64')
      });

      mockPutFile('_posts/2025-01-01-post1.md', {
        commit: { sha: 'new-sha-1' }
      });

      mockPutFile('_posts/2025-01-02-post2.md', {
        commit: { sha: 'new-sha-2' }
      });

      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'merge',
          type: 'category',
          sourceTerms: ['Tech', 'Technology'],
          targetTerm: 'Technology'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.operation).toBe('merge');
      expect(body.sourceTerms).toEqual(['Tech', 'Technology']);
      expect(body.targetTerm).toBe('Technology');
      expect(body.updated.length).toBe(2);
    });

    it('removes duplicates after merging', async () => {
      mockListContents('_posts', [
        { name: '2025-01-01-post1.md', path: '_posts/2025-01-01-post1.md', sha: 'sha1' }
      ]);

      mockListContents('_pages', []);

      // File already has both source and target terms
      const originalContent = `---
title: Post 1
tags:
  - old-tag
  - new-tag
---
Content`;

      mockGetFile('_posts/2025-01-01-post1.md', {
        content: Buffer.from(originalContent).toString('base64')
      });

      mockGetFile('_posts/2025-01-01-post1.md', {
        content: Buffer.from(originalContent).toString('base64')
      });

      mockPutFile('_posts/2025-01-01-post1.md', {
        commit: { sha: 'new-sha' }
      });

      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'merge',
          type: 'tag',
          sourceTerms: ['old-tag'],
          targetTerm: 'new-tag'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('returns 400 for missing sourceTerms or targetTerm', async () => {
      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'merge',
          type: 'category',
          sourceTerms: ['Tech']
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.message).toContain('targetTerm');
    });
  });

  describe('Validation', () => {
    it('returns 400 for invalid type', async () => {
      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'find',
          type: 'invalid',
          terms: ['test']
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.message).toContain('type');
    });

    it('returns 400 for invalid operation', async () => {
      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'invalid',
          type: 'category'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.body);
      expect(body.message).toContain('operation');
      expect(body.validOperations).toBeDefined();
    });

    it('returns 400 for invalid JSON', async () => {
      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: 'invalid json{'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
    });
  });

  describe('Error Handling', () => {
    it('returns 503 when GITHUB_TOKEN is missing', async () => {
      delete process.env.GITHUB_TOKEN;

      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'find',
          type: 'category',
          terms: ['Tech']
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(503);

      const body = JSON.parse(response.body);
      expect(body.error).toBe('Service unavailable');
    });

    it('handles errors during file updates', async () => {
      mockListContents('_posts', [
        { name: '2025-01-01-post1.md', path: '_posts/2025-01-01-post1.md', sha: 'sha1' }
      ]);

      mockListContents('_pages', []);

      const originalContent = `---
title: Post 1
categories:
  - Tech
---
Content`;

      mockGetFile('_posts/2025-01-01-post1.md', {
        content: Buffer.from(originalContent).toString('base64')
      });

      mockGetFile('_posts/2025-01-01-post1.md', {
        content: Buffer.from(originalContent).toString('base64')
      });

      // Mock PUT to fail
      nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_posts/2025-01-01-post1.md')
        .reply(500, { message: 'Server error' });

      const event = {
        httpMethod: 'POST',
        headers: {
          'client-ip': '192.168.1.1'
        },
        body: JSON.stringify({
          operation: 'rename',
          type: 'category',
          oldName: 'Tech',
          newName: 'Technology'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.errors.length).toBe(1);
      expect(body.updated.length).toBe(0);
    });
  });

});
