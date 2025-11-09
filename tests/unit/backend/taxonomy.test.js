/**
 * @vitest-environment node
 *
 * Unit Tests for Taxonomy Netlify Function
 *
 * Tests site-wide taxonomy management (categories and tags).
 * Covers GET/PUT operations for _data/taxonomy.yml.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import yaml from 'js-yaml';
import { mockGetFile, mockPutFile, mockGitHubError, cleanMocks } from '../../utils/github-mock.js';
import { handler } from '../../../netlify/functions/taxonomy.js';

describe('Taxonomy Function', () => {
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

      const taxonomy = {
        categories: [
          { item: 'Technology' },
          { item: 'Life' }
        ],
        tags: [
          { item: 'JavaScript' }
        ]
      };

      const yamlContent = yaml.dump(taxonomy);
      mockGetFile('_data/taxonomy.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'abc123'
      });

      const response = await handler(event, {});

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('GET - Read taxonomy', () => {
    it('retrieves categories and tags from taxonomy.yml', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const taxonomy = {
        categories: [
          { item: 'Technology' },
          { item: 'Life' },
          { item: 'Travel' }
        ],
        tags: [
          { item: 'JavaScript' },
          { item: 'Python' }
        ]
      };

      const yamlContent = yaml.dump(taxonomy);
      mockGetFile('_data/taxonomy.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'abc123'
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.categories).toEqual(['Technology', 'Life', 'Travel']);
      expect(body.tags).toEqual(['JavaScript', 'Python']);
    });

    it('extracts strings from object format (item field)', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const taxonomy = {
        categories: [
          { item: 'Tech' },
          { item: 'Life' }
        ],
        tags: [
          { item: 'Coding' }
        ]
      };

      const yamlContent = yaml.dump(taxonomy);
      mockGetFile('_data/taxonomy.yml', {
        content: Buffer.from(yamlContent).toString('base64')
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.categories).toEqual(['Tech', 'Life']);
      expect(body.tags).toEqual(['Coding']);
    });

    it('handles plain string format', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const taxonomy = {
        categories: ['Tech', 'Life'],
        tags: ['JavaScript']
      };

      const yamlContent = yaml.dump(taxonomy);
      mockGetFile('_data/taxonomy.yml', {
        content: Buffer.from(yamlContent).toString('base64')
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.categories).toEqual(['Tech', 'Life']);
      expect(body.tags).toEqual(['JavaScript']);
    });

    it('handles mixed format (objects and strings)', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const taxonomy = {
        categories: [
          { item: 'Tech' },
          'Life', // Plain string
          { item: 'Travel' }
        ],
        tags: [
          'JavaScript', // Plain string
          { item: 'Python' }
        ]
      };

      const yamlContent = yaml.dump(taxonomy);
      mockGetFile('_data/taxonomy.yml', {
        content: Buffer.from(yamlContent).toString('base64')
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.categories).toEqual(['Tech', 'Life', 'Travel']);
      expect(body.tags).toEqual(['JavaScript', 'Python']);
    });

    it('handles empty categories and tags', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const taxonomy = {
        categories: [],
        tags: []
      };

      const yamlContent = yaml.dump(taxonomy);
      mockGetFile('_data/taxonomy.yml', {
        content: Buffer.from(yamlContent).toString('base64')
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.categories).toEqual([]);
      expect(body.tags).toEqual([]);
    });

    it('handles missing categories field', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const taxonomy = {
        tags: [{ item: 'JavaScript' }]
        // categories missing
      };

      const yamlContent = yaml.dump(taxonomy);
      mockGetFile('_data/taxonomy.yml', {
        content: Buffer.from(yamlContent).toString('base64')
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.categories).toEqual([]);
      expect(body.tags).toEqual(['JavaScript']);
    });

    it('makes request to GitHub with correct path', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const taxonomy = { categories: [], tags: [] };
      const yamlContent = yaml.dump(taxonomy);
      const scope = mockGetFile('_data/taxonomy.yml', {
        content: Buffer.from(yamlContent).toString('base64')
      });

      await handler(event, {});

      // Verify nock intercepted the request
      expect(scope.isDone()).toBe(true);
    });

    it('handles GitHub API errors', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_data/taxonomy.yml?ref=main', 404, 'Not Found');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid JSON');
      expect(body.message).toContain('404');
    });

    it('handles YAML parsing errors', async () => {
      const event = {
        httpMethod: 'GET'
      };

      // Truly invalid YAML - tabs and improper indentation that will cause parsing error
      const invalidYaml = 'categories:\n\t\t- item: Test\n  bad indentation:\n- broken';

      mockGetFile('_data/taxonomy.yml', {
        content: Buffer.from(invalidYaml).toString('base64')
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid JSON');
    });
  });

  describe('PUT - Update taxonomy', () => {
    it('updates taxonomy successfully', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          categories: ['Tech', 'Life', 'Travel'],
          tags: ['JavaScript', 'Python', 'Ruby']
        })
      };

      // GET current file for SHA
      mockGetFile('_data/taxonomy.yml', {
        content: Buffer.from('old content').toString('base64'),
        sha: 'current-sha-123'
      });

      // PUT updated file
      mockPutFile('_data/taxonomy.yml', {
        commit: { sha: 'new-commit-sha-456' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Taxonomy updated successfully');
      expect(body.commitSha).toBe('new-commit-sha-456');
    });

    it('builds YAML with correct format and comments', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          categories: ['Tech', 'Life'],
          tags: ['JavaScript']
        })
      };

      let capturedContent = '';

      // GET current file for SHA
      mockGetFile('_data/taxonomy.yml', {
        content: Buffer.from('old').toString('base64'),
        sha: 'sha'
      });

      // PUT updated file - use nock to capture request body
      nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_data/taxonomy.yml', (body) => {
          capturedContent = JSON.stringify(body);
          return true;  // Accept any body
        })
        .reply(200, { commit: { sha: 'new' } });

      await handler(event, {});

      // Verify YAML format
      const requestBody = JSON.parse(capturedContent);
      const decodedYaml = Buffer.from(requestBody.content, 'base64').toString('utf8');

      expect(decodedYaml).toContain('# Site Taxonomy');
      expect(decodedYaml).toContain('categories:');
      expect(decodedYaml).toContain('  - item: Tech');
      expect(decodedYaml).toContain('  - item: Life');
      expect(decodedYaml).toContain('tags:');
      expect(decodedYaml).toContain('  - item: JavaScript');
    });

    it('sends commit message and SHA to GitHub', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          categories: ['Tech'],
          tags: ['JS']
        })
      };

      let capturedContent = '';

      // GET current file for SHA
      mockGetFile('_data/taxonomy.yml', {
        sha: 'original-sha-789'
      });

      // PUT updated file - capture request body
      nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_data/taxonomy.yml', (body) => {
          capturedContent = JSON.stringify(body);
          return true;
        })
        .reply(200, { commit: { sha: 'new' } });

      await handler(event, {});

      const requestBody = JSON.parse(capturedContent);
      expect(requestBody.message).toBe('Update taxonomy from custom admin');
      expect(requestBody.sha).toBe('original-sha-789');
      expect(requestBody.branch).toBe('main');
    });

    it('handles empty arrays', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          categories: [],
          tags: []
        })
      };

      mockGetFile('_data/taxonomy.yml', { sha: 'sha' });
      mockPutFile('_data/taxonomy.yml', { commit: { sha: 'new' } });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
    });

    it('returns 400 when categories is not an array', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          categories: 'not-an-array',
          tags: []
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Validation failed');
      expect(body.error).toContain('arrays');
    });

    it('returns 400 when tags is not an array', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          categories: [],
          tags: 'not-an-array'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Validation failed');
    });

    it('returns 400 when categories is missing', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          tags: []
          // categories missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
    });

    it('returns 400 when tags is missing', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          categories: []
          // tags missing
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
    });

    it('returns 503 when GITHUB_TOKEN is missing', async () => {
      delete process.env.GITHUB_TOKEN;

      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          categories: ['Tech'],
          tags: ['JS']
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('GitHub integration not configured');
      expect(body.message).toContain('GITHUB_TOKEN');
    });

    it('handles GitHub API errors during update', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          categories: ['Tech'],
          tags: ['JS']
        })
      };

      // GET succeeds
      mockGetFile('_data/taxonomy.yml', {
        sha: 'sha'
      });

      // PUT fails with conflict
      mockGitHubError('PUT', '/repos/mfrench71/circleseven-website/contents/_data/taxonomy.yml', 409, 'Conflict');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('409');
    });

    it('handles malformed JSON in request body', async () => {
      const event = {
        httpMethod: 'PUT',
        body: 'invalid json{{'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Invalid JSON');
    });
  });

  describe('Error handling', () => {
    it('returns 405 for unsupported methods', async () => {
      const event = {
        httpMethod: 'POST'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Method not allowed');
    });

    it('returns 405 for DELETE method', async () => {
      const event = {
        httpMethod: 'DELETE'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Method not allowed');
    });

    it('includes stack trace in development mode', async () => {
      process.env.NODE_ENV = 'development';

      const event = {
        httpMethod: 'GET'
      };

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_data/taxonomy.yml?ref=main', 500, 'Error');

      const response = await handler(event, {});

      const body = JSON.parse(response.body);
      expect(body.stack).toBeDefined();

      delete process.env.NODE_ENV;
    });

    it('hides stack trace in production', async () => {
      process.env.NODE_ENV = 'production';

      const event = {
        httpMethod: 'GET'
      };

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_data/taxonomy.yml?ref=main', 500, 'Error');

      const response = await handler(event, {});

      const body = JSON.parse(response.body);
      expect(body.stack).toBeUndefined();

      delete process.env.NODE_ENV;
    });
  });
});
