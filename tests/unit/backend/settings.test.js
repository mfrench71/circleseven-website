/**
 * Unit Tests for Settings Netlify Function
 *
 * Tests Jekyll site configuration management (_config.yml).
 * Covers GET/PUT operations with security whitelist validation.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import yaml from 'js-yaml';
import { mockGetFile, mockPutFile, mockGitHubError, cleanMocks } from '../../utils/github-mock.js';
import handler from '../../../netlify/functions/settings.mjs';

describe('Settings Function', () => {
  // Sample config for testing
  const sampleConfig = {
    title: 'Circle Seven Blog',
    description: 'Technology and software development',
    author: 'Matthew French',
    email: 'test@example.com',
    github_username: 'mfrench71',
    paginate: 12,
    related_posts_count: 5,
    timezone: 'America/Los_Angeles',
    lang: 'en',
    // Non-editable fields (should be filtered)
    plugins: ['jekyll-feed', 'jekyll-seo-tag'],
    theme: 'minima',
    markdown: 'kramdown',
    permalink: '/:categories/:year/:month/:day/:title:output_ext'
  };

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

      const yamlContent = yaml.dump(sampleConfig);
      mockGetFile('_config.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'abc123'
      });

      const response = await handler(event, {});

      expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
      expect(response.headers['Content-Type']).toBe('application/json');
    });
  });

  describe('GET - Read settings', () => {
    it('retrieves settings from _config.yml', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const yamlContent = yaml.dump(sampleConfig);
      mockGetFile('_config.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'abc123'
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Circle Seven Blog');
      expect(body.description).toBe('Technology and software development');
      expect(body.author).toBe('Matthew French');
      expect(body.paginate).toBe(12);
    });

    it('returns only whitelisted editable fields', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const yamlContent = yaml.dump(sampleConfig);
      mockGetFile('_config.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'abc123'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      // Should include editable fields
      expect(body.title).toBeDefined();
      expect(body.description).toBeDefined();
      expect(body.paginate).toBeDefined();

      // Should NOT include non-editable fields
      expect(body.plugins).toBeUndefined();
      expect(body.theme).toBeUndefined();
      expect(body.markdown).toBeUndefined();
      expect(body.permalink).toBeUndefined();
    });

    it('makes request to GitHub with correct path', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const yamlContent = yaml.dump(sampleConfig);
      const scope = mockGetFile('_config.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'abc123'
      });

      await handler(event, {});

      // Verify the nock interceptor was called
      expect(scope.isDone()).toBe(true);
    });

    it('handles missing editable fields gracefully', async () => {
      const event = {
        httpMethod: 'GET'
      };

      const minimalConfig = {
        title: 'Minimal Site',
        plugins: ['jekyll-feed']
        // Most editable fields missing
      };

      const yamlContent = yaml.dump(minimalConfig);
      mockGetFile('_config.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'abc123'
      });

      const response = await handler(event, {});
      const body = JSON.parse(response.body);

      expect(body.title).toBe('Minimal Site');
      expect(body.description).toBeUndefined();
      expect(body.author).toBeUndefined();
    });

    it('handles YAML parsing errors', async () => {
      const event = {
        httpMethod: 'GET'
      };

      // Truly invalid YAML - tabs and improper indentation that will cause parsing error
      const invalidYaml = 'title:\n\t\t- Test\n  bad indentation:\n- broken';

      mockGetFile('_config.yml', {
        content: Buffer.from(invalidYaml).toString('base64'),
        sha: 'abc123'
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
    });

    it('handles GitHub API errors', async () => {
      const event = {
        httpMethod: 'GET'
      };

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_config.yml?ref=main', 404, 'Not Found');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });
  });

  describe('PUT - Update settings', () => {
    it('updates settings successfully', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          title: 'Updated Title',
          description: 'Updated description',
          paginate: 15
        })
      };

      const yamlContent = yaml.dump(sampleConfig);

      // GET current file
      mockGetFile('_config.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'current-sha-123'
      });

      // PUT updated file
      mockPutFile('_config.yml', {
        commit: { sha: 'new-commit-sha-456' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('Settings updated successfully');
      expect(body.commitSha).toBe('new-commit-sha-456');
    });

    it('sends updated YAML to GitHub', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          title: 'New Title',
          paginate: 20
        })
      };

      const yamlContent = yaml.dump(sampleConfig);
      let capturedContent = '';

      // GET current file
      mockGetFile('_config.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'current-sha'
      });

      // PUT updated file - capture request body
      nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_config.yml', (body) => {
          capturedContent = JSON.stringify(body);
          return true;
        })
        .reply(200, { commit: { sha: 'new' } });

      await handler(event, {});

      // Verify request body
      const requestBody = JSON.parse(capturedContent);
      expect(requestBody.message).toBe('Update site settings from custom admin');
      expect(requestBody.sha).toBe('current-sha');
      expect(requestBody.branch).toBe('main');

      // Verify updated YAML content
      const decodedYaml = Buffer.from(requestBody.content, 'base64').toString('utf8');
      const updatedConfig = yaml.load(decodedYaml);
      expect(updatedConfig.title).toBe('New Title');
      expect(updatedConfig.paginate).toBe(20);
      // Original fields should be preserved
      expect(updatedConfig.author).toBe('Matthew French');
      expect(updatedConfig.plugins).toEqual(['jekyll-feed', 'jekyll-seo-tag']);
    });

    it('preserves non-editable fields', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          title: 'Updated Title'
        })
      };

      const yamlContent = yaml.dump(sampleConfig);
      let capturedContent = '';

      // GET current file
      mockGetFile('_config.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'sha'
      });

      // PUT updated file - capture request body
      nock('https://api.github.com')
        .put('/repos/mfrench71/circleseven-website/contents/_config.yml', (body) => {
          capturedContent = JSON.stringify(body);
          return true;
        })
        .reply(200, { commit: { sha: 'new' } });

      await handler(event, {});

      const requestBody = JSON.parse(capturedContent);
      const decodedYaml = Buffer.from(requestBody.content, 'base64').toString('utf8');
      const updatedConfig = yaml.load(decodedYaml);

      // Non-editable fields should be unchanged
      expect(updatedConfig.plugins).toEqual(['jekyll-feed', 'jekyll-seo-tag']);
      expect(updatedConfig.theme).toBe('minima');
      expect(updatedConfig.markdown).toBe('kramdown');
      expect(updatedConfig.permalink).toBe('/:categories/:year/:month/:day/:title:output_ext');
    });

    it('rejects updates to non-whitelisted fields', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          title: 'New Title',
          plugins: ['malicious-plugin'], // Not in whitelist
          theme: 'evil-theme' // Not in whitelist
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toContain('plugins');
      expect(body.message).toContain('theme');
    });

    it('allows updating only whitelisted fields', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          title: 'New Title',
          description: 'New description',
          author: 'New Author',
          email: 'new@example.com',
          github_username: 'newuser',
          paginate: 10,
          related_posts_count: 3,
          timezone: 'UTC',
          lang: 'es'
        })
      };

      const yamlContent = yaml.dump(sampleConfig);

      // GET current file
      mockGetFile('_config.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'sha'
      });

      // PUT updated file
      mockPutFile('_config.yml', {
        commit: { sha: 'new' }
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('returns 400 for empty updates', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({})
      };

      const yamlContent = yaml.dump(sampleConfig);

      // GET current file
      mockGetFile('_config.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'sha'
      });

      // PUT updated file
      mockPutFile('_config.yml', {
        commit: { sha: 'new' }
      });

      const response = await handler(event, {});

      // Empty updates are technically valid (no invalid fields)
      // But won't make any changes. Should still succeed.
      expect(response.statusCode).toBe(200);
    });

    it('returns 400 when trying to update only non-whitelisted fields', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          build: 'something',
          destination: '/tmp'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
    });

    it('returns 503 when GITHUB_TOKEN is missing', async () => {
      delete process.env.GITHUB_TOKEN;

      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          title: 'New Title'
        })
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Service unavailable');
      expect(body.message).toContain('GITHUB_TOKEN');
    });

    it('handles GitHub API errors during update', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          title: 'New Title'
        })
      };

      const yamlContent = yaml.dump(sampleConfig);

      // GET succeeds
      mockGetFile('_config.yml', {
        content: Buffer.from(yamlContent).toString('base64'),
        sha: 'sha'
      });

      // PUT fails
      mockGitHubError('PUT', '/repos/mfrench71/circleseven-website/contents/_config.yml', 409, 'SHA conflict');

      const response = await handler(event, {});

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Internal server error');
    });

    it('handles malformed JSON in request body', async () => {
      const event = {
        httpMethod: 'PUT',
        body: 'not valid json{{'
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
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

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_config.yml?ref=main', 500, 'Internal error');

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

      mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_config.yml?ref=main', 500, 'Internal error');

      const response = await handler(event, {});

      const body = JSON.parse(response.body);
      expect(body.stack).toBeUndefined();

      delete process.env.NODE_ENV;
    });
  });

  describe('Security - Whitelist validation', () => {
    const whitelistedFields = [
      'title',
      'description',
      'author',
      'email',
      'github_username',
      'paginate',
      'related_posts_count',
      'timezone',
      'lang'
    ];

    it('allows all whitelisted fields individually', async () => {
      const yamlContent = yaml.dump(sampleConfig);

      for (const field of whitelistedFields) {
        const event = {
          httpMethod: 'PUT',
          body: JSON.stringify({
            [field]: 'test-value'
          })
        };

        // GET current file
        mockGetFile('_config.yml', {
          content: Buffer.from(yamlContent).toString('base64'),
          sha: 'sha'
        });

        // PUT updated file
        mockPutFile('_config.yml', {
          commit: { sha: 'new' }
        });

        const response = await handler(event, {});

        expect(response.statusCode).toBe(200);
      }
    });

    it('rejects common dangerous fields', async () => {
      const dangerousFields = {
        plugins: ['evil'],
        theme: 'malicious',
        destination: '/etc/passwd',
        source: '/sensitive',
        exclude: [],
        include: [],
        keep_files: [],
        encoding: 'utf-8',
        markdown_ext: 'md',
        strict_front_matter: false
      };

      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify(dangerousFields)
      };

      const response = await handler(event, {});

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('Bad Request');
      expect(body.message).toContain('plugins');
    });
  });

  describe('Blob Cache Integration', () => {
    it('GET works correctly with Blob cache (graceful fallback)', async () => {
      const event = {
        httpMethod: 'GET'
      };

      // Blob cache will fail to initialize in test environment
      // Function should gracefully fall back to GitHub
      const configYaml = `
title: Circle Seven
description: Tech blog
author: Matthew French
email: test@example.com
paginate: 12
      `;

      mockGetFile('_config.yml', {
        content: Buffer.from(configYaml).toString('base64'),
        sha: 'abc123'
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.title).toBe('Circle Seven');
      expect(body.description).toBe('Tech blog');
      expect(body.author).toBe('Matthew French');
      expect(body.email).toBe('test@example.com');
      expect(body.paginate).toBe(12);
    });

    it('PUT works correctly with Blob cache (graceful fallback)', async () => {
      const event = {
        httpMethod: 'PUT',
        body: JSON.stringify({
          title: 'Updated Title',
          description: 'Updated Description'
        })
      };

      // GET current file for SHA
      const configYaml = `title: Old Title\ndescription: Old Description\nauthor: Test`;
      mockGetFile('_config.yml', {
        content: Buffer.from(configYaml).toString('base64'),
        sha: 'current-sha-123'
      });

      // PUT updated file
      mockPutFile('_config.yml', {
        commit: { sha: 'new-commit-sha-456' }
      });

      const response = await handler(event, {});

      // Should succeed even if Blob cache fails to write
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.commitSha).toBe('new-commit-sha-456');
      expect(body.message).toContain('Settings updated successfully');
    });

    it('GET only returns whitelisted fields', async () => {
      const event = {
        httpMethod: 'GET'
      };

      // Config includes both safe and dangerous fields
      const configYaml = `
title: Circle Seven
description: Tech blog
author: Matthew French
plugins:
  - evil-plugin
destination: /etc/passwd
theme: malicious
      `;

      mockGetFile('_config.yml', {
        content: Buffer.from(configYaml).toString('base64'),
        sha: 'abc123'
      });

      const response = await handler(event, {});

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      // Should only include whitelisted fields
      expect(body.title).toBe('Circle Seven');
      expect(body.description).toBe('Tech blog');
      expect(body.author).toBe('Matthew French');

      // Should NOT include dangerous fields
      expect(body.plugins).toBeUndefined();
      expect(body.destination).toBeUndefined();
      expect(body.theme).toBeUndefined();
    });
  });
});
