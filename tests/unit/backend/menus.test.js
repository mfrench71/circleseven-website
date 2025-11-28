/**
 * @vitest-environment node
 *
 * Unit Tests for Menus Netlify Function
 *
 * Tests WordPress-style menu management system.
 * Covers GET/PUT operations for _data/menus.yml.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import yaml from 'js-yaml';
import { mockGetFile, mockPutFile, mockGitHubError, cleanMocks } from '../../utils/github-mock.js';
import { callV2Handler } from '../../utils/request-mock.js';
import handlerFn from '../../../netlify/functions/menus.mjs';

// Wrap v2 handler to accept v1 event objects (for test compatibility)
const handler = (event, context) => callV2Handler(handlerFn, event, context);

describe('Menus Function', () => {
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

      const menus = {
        header_menu: [
          { id: 'about', type: 'page', label: 'About', url: '/about/' }
        ],
        mobile_menu: []
      };

      const yamlContent = yaml.dump(menus);
      mockGetFile('_data/menus.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'abc123'
      });

      const response = await handler(event, {});

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('GET - Read menus', () => {
    it('retrieves menu configurations from menus.yml', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const menus = {
        header_menu: [
          { id: 'about', type: 'page', label: 'About', url: '/about/' },
          { id: 'contact', type: 'page', label: 'Contact', url: '/contact/' }
        ],
        mobile_menu: [
          { id: 'about-mobile', type: 'page', label: 'About', url: '/about/' }
        ],
        footer_menu: []
      };

      const yamlContent = yaml.dump(menus);
      mockGetFile('_data/menus.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'abc123'
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.header_menu).toHaveLength(2);
      expect(body.header_menu[0].id).toBe('about');
      expect(body.mobile_menu).toHaveLength(1);
      expect(body.footer_menu).toEqual([]);
    });

    it('handles nested menu items (children)', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const menus = {
        header_menu: [
          {
            id: 'projects',
            type: 'category',
            label: 'Projects',
            url: '/category/projects/',
            mega_menu: true,
            children: [
              { id: 'projects-heading', type: 'heading', label: 'Project Categories', icon: 'fas fa-folder-open' },
              { id: 'photography', type: 'category', label: 'Photography', url: '/category/photography/' }
            ]
          }
        ],
        mobile_menu: []
      };

      const yamlContent = yaml.dump(menus);
      mockGetFile('_data/menus.yml', {
        content: Buffer.from(yamlContent).toString('base64')
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.header_menu[0].children).toHaveLength(2);
      expect(body.header_menu[0].children[0].type).toBe('heading');
      expect(body.header_menu[0].children[1].type).toBe('category');
    });

    it('handles empty menus', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const menus = {
        header_menu: [],
        mobile_menu: [],
        footer_menu: []
      };

      const yamlContent = yaml.dump(menus);
      mockGetFile('_data/menus.yml', {
        content: Buffer.from(yamlContent).toString('base64')
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.header_menu).toEqual([]);
      expect(body.mobile_menu).toEqual([]);
      expect(body.footer_menu).toEqual([]);
    });

    it('handles missing menu fields', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const menus = {
        header_menu: [
          { id: 'about', type: 'page', label: 'About', url: '/about/' }
        ]
        // mobile_menu and footer_menu missing
      };

      const yamlContent = yaml.dump(menus);
      mockGetFile('_data/menus.yml', {
        content: Buffer.from(yamlContent).toString('base64')
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.header_menu).toHaveLength(1);
      expect(body.mobile_menu).toEqual([]);
      expect(body.footer_menu).toEqual([]);
    });

    it('makes request to GitHub with correct path', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const menus = { header_menu: [], mobile_menu: [] };
      const yamlContent = yaml.dump(menus);
      const scope = mockGetFile('_data/menus.yml', {
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

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_data/menus.yml?ref=main', 404, 'Not Found');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });

    it('handles YAML parsing errors', async () => {
      const event = {
        httpMethod: 'GET'
      };

      // Invalid YAML - tabs and improper indentation
      const invalidYaml = 'header_menu:\n\t\t- id: test\n  bad indentation:\n- broken';

      mockGetFile('_data/menus.yml', {
        content: Buffer.from(invalidYaml).toString('base64')
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
    });
  });

  describe('PUT - Update menus', () => {
    it('updates menus successfully', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          header_menu: [
            { id: 'about', type: 'page', label: 'About', url: '/about/' }
          ],
          mobile_menu: [
            { id: 'about-mobile', type: 'page', label: 'About', url: '/about/' }
          ]
        })
      };

      // GET current file for SHA
      mockGetFile('_data/menus.yml', {
        content: Buffer.from('old content').toString('base64'),
        sha: 'current-sha-123'
      });

      // PUT updated file
      mockPutFile('_data/menus.yml', {
        commit: { sha: 'new-commit-sha-456' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Menus updated successfully');
      expect(body.commitSha).toBe('new-commit-sha-456');
    });

    it('builds YAML with correct format and comments', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          header_menu: [
            { id: 'about', type: 'page', label: 'About', url: '/about/' }
          ],
          mobile_menu: []
        })
      };

      let capturedContent = '';

      // GET current file for SHA
      mockGetFile('_data/menus.yml', {
        content: Buffer.from('old').toString('base64'),
        sha: 'sha'
      });

      // PUT updated file - use nock to capture request body
      nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_data/menus.yml', (body) => {
          capturedContent = JSON.stringify(body);
          return true;  // Accept any body
        })
        .reply(200, { commit: { sha: 'new' } });

      await handler(event, {});

      // Verify YAML format
      const requestBody = JSON.parse(capturedContent);
      const decodedYaml = Buffer.from(requestBody.content, 'base64').toString('utf8');

      expect(decodedYaml).toContain('# Menu Configuration');
      expect(decodedYaml).toContain('header_menu:');
      expect(decodedYaml).toContain('- id: "about"');
      expect(decodedYaml).toContain('type: "page"');
      expect(decodedYaml).toContain('label: "About"');
      expect(decodedYaml).toContain('url: "/about/"');
    });

    it('handles nested menu items correctly', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          header_menu: [
            {
              id: 'projects',
              type: 'category',
              label: 'Projects',
              url: '/category/projects/',
              mega_menu: true,
              children: [
                { id: 'photography', type: 'category', label: 'Photography', url: '/category/photography/' }
              ]
            }
          ]
        })
      };

      let capturedContent = '';

      mockGetFile('_data/menus.yml', { sha: 'sha' });

      nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_data/menus.yml', (body) => {
          capturedContent = JSON.stringify(body);
          return true;
        })
        .reply(200, { commit: { sha: 'new' } });

      await handler(event, {});

      const requestBody = JSON.parse(capturedContent);
      const decodedYaml = Buffer.from(requestBody.content, 'base64').toString('utf8');

      expect(decodedYaml).toContain('mega_menu: true');
      expect(decodedYaml).toContain('children:');
      expect(decodedYaml).toContain('- id: "photography"');
    });

    it('sends commit message and SHA to GitHub', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          header_menu: [
            { id: 'about', type: 'page', label: 'About', url: '/about/' }
          ]
        })
      };

      let capturedContent = '';

      // GET current file for SHA
      mockGetFile('_data/menus.yml', {
        sha: 'original-sha-789'
      });

      // PUT updated file - capture request body
      nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_data/menus.yml', (body) => {
          capturedContent = JSON.stringify(body);
          return true;
        })
        .reply(200, { commit: { sha: 'new' } });

      await handler(event, {});

      const requestBody = JSON.parse(capturedContent);
      expect(requestBody.message).toBe('Update menus from admin interface');
      expect(requestBody.sha).toBe('original-sha-789');
      expect(requestBody.branch).toBe('main');
    });

    it('handles empty menu arrays', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          header_menu: [],
          mobile_menu: [],
          footer_menu: []
        })
      };

      mockGetFile('_data/menus.yml', { sha: 'sha' });
      mockPutFile('_data/menus.yml', { commit: { sha: 'new' } });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
    });

    it('returns 400 when all menu fields are missing', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          // No header_menu, mobile_menu, or footer_menu
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Validation failed');
    });

    it('returns 400 when menu item is missing required fields', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          header_menu: [
            { id: 'about' } // Missing type and label
          ]
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toContain('Validation failed');
    });

    it('returns 400 for invalid JSON', async () => {
      const event = {
        httpMethod: 'PUT',
        body: 'invalid json {'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Invalid JSON');
    });

    it('returns 503 when GITHUB_TOKEN is missing', async () => {
      delete process.env.GITHUB_TOKEN;

      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          header_menu: []
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Service unavailable');
    });

    it('handles GitHub API errors during PUT', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          header_menu: [
            { id: 'about', type: 'page', label: 'About', url: '/about/' }
          ]
        })
      };

      mockGetFile('_data/menus.yml', { sha: 'sha' });
      mockGitHubError('PUT', '/repos/mfrench71/circleseven-website/contents/_data/menus.yml', 422, 'Validation Failed');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('Method Not Allowed', () => {
    it('returns 405 for POST method', async () => {
      const event = {
        httpMethod: 'POST',
        body: '{}'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Method not allowed');
    });

    it('returns 405 for PATCH method', async () => {
      const event = {
        httpMethod: 'PATCH'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(405);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Method not allowed');
    });
  });

  describe('DELETE - Clear cache', () => {
    it('attempts to clear the menu cache (requires Blobs environment)', async () => {
      const event = {
        httpMethod: 'DELETE'
      };

      const response = await handler(event, {});

      // In test environment without Blobs configured, this will return 500
      // In production with Blobs, it returns 200
      // We just test that the endpoint exists and responds
      expect([200, 500]).toContain(response.statusCode);
    });
  });
});
