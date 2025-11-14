/**
 * Unit Tests for Comments Submit Netlify Function
 *
 * Tests comment submission with email notifications via Resend API.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getStore } from '@netlify/blobs';

// Mock @netlify/blobs
vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn()
}));

describe('Comments Submit Function', () => {
  let handler;
  let mockStore;
  let originalFetch;
  let fetchCalls;

  beforeEach(async () => {
    // Mock fetch to intercept Resend API calls
    fetchCalls = [];
    originalFetch = global.fetch;
    global.fetch = vi.fn(async (url, options) => {
      fetchCalls.push({ url, options });

      // Mock successful Resend API response
      if (url === 'https://api.resend.com/emails') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'test-email-id' })
        };
      }

      return { ok: false, status: 404 };
    });

    // Mock Netlify Blobs store
    const comments = new Map();
    mockStore = {
      setJSON: vi.fn(async (key, value) => {
        comments.set(key, value);
        return value;
      }),
      get: vi.fn(async (key, options) => {
        const value = comments.get(key);
        if (options?.type === 'json') {
          return value || null;
        }
        return value ? JSON.stringify(value) : null;
      })
    };

    getStore.mockReturnValue(mockStore);

    // Set up environment variables
    process.env.RESEND_API_KEY = 're_test_key_12345';
    process.env.ADMIN_EMAIL = 'admin@example.com';
    process.env.FROM_EMAIL = 'onboarding@resend.dev';

    // Import handler after mocks are set up
    const module = await import('../../../netlify/functions/comments-submit.mjs');
    handler = module.default;
  });

  afterEach(() => {
    // Restore fetch
    global.fetch = originalFetch;

    // Clean up environment
    delete process.env.RESEND_API_KEY;
    delete process.env.ADMIN_EMAIL;
    delete process.env.FROM_EMAIL;

    // Clear mocks
    vi.clearAllMocks();
  });

  describe('Email Notifications', () => {
    it('sends email notification when comment is submitted', async () => {
      const request = new Request('https://example.com/comments-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nf-client-connection-ip': '127.0.0.1'
        },
        body: JSON.stringify({
          postSlug: 'test-post',
          name: 'Test User',
          email: 'test@example.com',
          message: 'This is a test comment with enough characters to pass validation.',
          website: '' // Honeypot field should be empty
        })
      });

      const response = await handler(request, {});

      // Verify comment was stored
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.commentId).toBeDefined();

      // Email should have been sent (awaited in handler)
      // Verify email was sent to Resend API
      expect(fetchCalls).toHaveLength(1);
      expect(fetchCalls[0].url).toBe('https://api.resend.com/emails');
      expect(fetchCalls[0].options.method).toBe('POST');

      // Verify email headers
      expect(fetchCalls[0].options.headers['Authorization']).toBe('Bearer re_test_key_12345');
      expect(fetchCalls[0].options.headers['Content-Type']).toBe('application/json');

      // Verify email content
      const emailData = JSON.parse(fetchCalls[0].options.body);
      expect(emailData.from).toBe('CircleSeven Comments <onboarding@resend.dev>');
      expect(emailData.to).toEqual(['admin@example.com']);
      expect(emailData.subject).toContain('test-post');
      expect(emailData.html).toContain('Test User');
      expect(emailData.html).toContain('test@example.com');
      expect(emailData.html).toContain('This is a test comment');
    });

    it('does not send email when RESEND_API_KEY is missing', async () => {
      // Need to re-import the module with RESEND_API_KEY unset
      delete process.env.RESEND_API_KEY;
      vi.resetModules();
      const module = await import('../../../netlify/functions/comments-submit.mjs?t=' + Date.now());
      const handlerNoKey = module.default;

      const request = new Request('https://example.com/comments-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nf-client-connection-ip': '127.0.0.1'
        },
        body: JSON.stringify({
          postSlug: 'test-post',
          name: 'Test User',
          email: 'test@example.com',
          message: 'This is a test comment with enough characters to pass validation.',
          website: ''
        })
      });

      const response = await handlerNoKey(request, {});

      expect(response.status).toBe(201);

      // Email should not have been sent (no API key)
      expect(fetchCalls).toHaveLength(0);
    });

    it('continues successfully even if email fails', async () => {
      // Mock fetch to simulate email failure
      global.fetch = vi.fn(async () => ({
        ok: false,
        status: 500,
        text: async () => 'Resend API error'
      }));

      const request = new Request('https://example.com/comments-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nf-client-connection-ip': '127.0.0.1'
        },
        body: JSON.stringify({
          postSlug: 'test-post',
          name: 'Test User',
          email: 'test@example.com',
          message: 'This is a test comment with enough characters to pass validation.',
          website: ''
        })
      });

      const response = await handler(request, {});

      // Comment should still be stored successfully
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  describe('Comment Validation', () => {
    it('rejects comment with missing fields', async () => {
      const request = new Request('https://example.com/comments-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug: 'test-post',
          name: 'Test User'
          // Missing email and message
        })
      });

      const response = await handler(request, {});

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Missing required fields');
    });

    it('rejects comment with invalid email', async () => {
      const request = new Request('https://example.com/comments-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug: 'test-post',
          name: 'Test User',
          email: 'invalid-email',
          message: 'This is a test comment with enough characters to pass validation.'
        })
      });

      const response = await handler(request, {});

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toContain('Invalid email address');
    });

    it('blocks spam via honeypot field', async () => {
      const request = new Request('https://example.com/comments-submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-nf-client-connection-ip': '127.0.0.1'
        },
        body: JSON.stringify({
          postSlug: 'test-post',
          name: 'Spam Bot',
          email: 'spam@bot.com',
          message: 'Buy my products!',
          website: 'http://spam.com' // Honeypot triggered
        })
      });

      const response = await handler(request, {});

      // Returns success to fool bots
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.commentId).toContain('spam-');

      // Verify comment was NOT stored
      expect(mockStore.setJSON).not.toHaveBeenCalled();

      // Verify email was NOT sent
      expect(fetchCalls).toHaveLength(0);
    });
  });
});
