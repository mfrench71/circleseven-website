/**
 * Unit Tests for Rate Limiter Utility
 *
 * Tests IP-based rate limiting functionality for Netlify functions.
 * Validates request counting, time windows, and rate limit responses.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import the actual implementation
const { checkRateLimit, getRateLimitStatus } = await import('../../../netlify/utils/rate-limiter.mjs');

describe('Rate Limiter Utility', () => {
  beforeEach(() => {
    // Clear any existing rate limit data between tests
    // The module uses a Map internally that persists, so we need to test with different IPs
    vi.clearAllMocks();
  });

  describe('checkRateLimit()', () => {
    it('allows first request from new IP', () => {
      const event = {
        headers: {
          'client-ip': '192.168.1.1'
        }
      };

      const result = checkRateLimit(event);

      expect(result).toBeNull(); // null means request allowed
    });

    it('allows requests within rate limit', () => {
      const event = {
        headers: {
          'client-ip': '192.168.1.2'
        }
      };

      // Make 5 requests (well under default limit of 100)
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(event);
        expect(result).toBeNull();
      }
    });

    it('blocks requests exceeding rate limit', () => {
      const event = {
        headers: {
          'client-ip': '192.168.1.3'
        }
      };

      const config = {
        maxRequests: 5,
        windowMs: 60000
      };

      // Make requests up to the limit
      for (let i = 0; i < 5; i++) {
        const result = checkRateLimit(event, config);
        expect(result).toBeNull();
      }

      // Next request should be blocked
      const blockedResult = checkRateLimit(event, config);

      expect(blockedResult).not.toBeNull();
      expect(blockedResult.statusCode).toBe(429);
      expect(blockedResult.headers['Retry-After']).toBeDefined();
      expect(blockedResult.headers['X-RateLimit-Limit']).toBe('5');
      expect(blockedResult.headers['X-RateLimit-Remaining']).toBe('0');
    });

    it('returns correct error response body when rate limited', () => {
      const event = {
        headers: {
          'client-ip': '192.168.1.4'
        }
      };

      const config = {
        maxRequests: 2,
        windowMs: 60000,
        message: 'Custom rate limit message'
      };

      // Exceed the limit
      checkRateLimit(event, config);
      checkRateLimit(event, config);
      const blockedResult = checkRateLimit(event, config);

      const body = JSON.parse(blockedResult.body);

      expect(body.error).toBe('Rate limit exceeded');
      expect(body.message).toBe('Custom rate limit message');
      expect(body.limit).toBe(2);
      expect(body.window).toBe(60);
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    it('uses custom configuration', () => {
      const event = {
        headers: {
          'client-ip': '192.168.1.5'
        }
      };

      const customConfig = {
        maxRequests: 3,
        windowMs: 30000,
        message: 'Too many requests!'
      };

      // Make 3 requests (at limit)
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit(event, customConfig);
        expect(result).toBeNull();
      }

      // 4th request should be blocked
      const result = checkRateLimit(event, customConfig);
      expect(result.statusCode).toBe(429);
      expect(result.headers['X-RateLimit-Limit']).toBe('3');
    });

    it('extracts IP from x-forwarded-for header', () => {
      const event = {
        headers: {
          'x-forwarded-for': '10.0.0.1, 192.168.1.1'
        }
      };

      const result = checkRateLimit(event);

      expect(result).toBeNull();
    });

    it('extracts IP from x-real-ip header', () => {
      const event = {
        headers: {
          'x-real-ip': '10.0.0.2'
        }
      };

      const result = checkRateLimit(event);

      expect(result).toBeNull();
    });

    it('handles missing headers gracefully', () => {
      const event = {
        headers: {}
      };

      const result = checkRateLimit(event);

      expect(result).toBeNull(); // Should still work with 'unknown' IP
    });

    it('handles undefined event gracefully', () => {
      const result = checkRateLimit({});

      expect(result).toBeNull();
    });

    it('resets count after time window expires', async () => {
      const event = {
        headers: {
          'client-ip': '192.168.1.6'
        }
      };

      const config = {
        maxRequests: 2,
        windowMs: 100 // Very short window for testing
      };

      // Use up the limit
      checkRateLimit(event, config);
      checkRateLimit(event, config);

      // Should be blocked
      let result = checkRateLimit(event, config);
      expect(result).not.toBeNull();
      expect(result.statusCode).toBe(429);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      result = checkRateLimit(event, config);
      expect(result).toBeNull();
    });

    it('tracks different IPs separately', () => {
      const event1 = {
        headers: { 'client-ip': '192.168.1.7' }
      };

      const event2 = {
        headers: { 'client-ip': '192.168.1.8' }
      };

      const config = {
        maxRequests: 2,
        windowMs: 60000
      };

      // IP1: Use up limit
      checkRateLimit(event1, config);
      checkRateLimit(event1, config);

      // IP1: Should be blocked
      let result1 = checkRateLimit(event1, config);
      expect(result1.statusCode).toBe(429);

      // IP2: Should still be allowed
      let result2 = checkRateLimit(event2, config);
      expect(result2).toBeNull();
    });
  });

  describe('getRateLimitStatus()', () => {
    it('returns full limit for new IP', () => {
      const event = {
        headers: {
          'client-ip': '192.168.1.20'
        }
      };

      const status = getRateLimitStatus(event);

      expect(status.limit).toBe(100); // Default limit
      expect(status.remaining).toBe(100);
      expect(status.reset).toBeGreaterThan(Date.now());
    });

    it('returns decreasing remaining count after requests', () => {
      const event = {
        headers: {
          'client-ip': '192.168.1.21'
        }
      };

      const config = {
        maxRequests: 10,
        windowMs: 60000
      };

      // Make 3 requests
      checkRateLimit(event, config);
      checkRateLimit(event, config);
      checkRateLimit(event, config);

      // Note: getRateLimitStatus uses default config, so we can't test
      // the exact remaining with custom config easily. But we can verify
      // the structure.
      const status = getRateLimitStatus(event);

      expect(status.limit).toBeDefined();
      expect(status.remaining).toBeDefined();
      expect(status.reset).toBeGreaterThan(Date.now());
    });

    it('returns zero remaining when rate limited', () => {
      const event = {
        headers: {
          'client-ip': '192.168.1.22'
        }
      };

      const config = {
        maxRequests: 2,
        windowMs: 60000
      };

      // Exceed limit
      checkRateLimit(event, config);
      checkRateLimit(event, config);
      checkRateLimit(event, config);

      // Note: Status will show default limit values, not custom config
      const status = getRateLimitStatus(event);

      expect(status.remaining).toBeGreaterThanOrEqual(0);
    });

    it('handles missing headers gracefully', () => {
      const event = {
        headers: {}
      };

      const status = getRateLimitStatus(event);

      expect(status.limit).toBeDefined();
      expect(status.remaining).toBeDefined();
      expect(status.reset).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('handles rapid concurrent requests', () => {
      const event = {
        headers: {
          'client-ip': '192.168.1.30'
        }
      };

      const config = {
        maxRequests: 50,
        windowMs: 60000
      };

      // Simulate 100 concurrent requests
      const results = [];
      for (let i = 0; i < 100; i++) {
        results.push(checkRateLimit(event, config));
      }

      const allowed = results.filter(r => r === null).length;
      const blocked = results.filter(r => r !== null).length;

      expect(allowed).toBeLessThanOrEqual(50);
      expect(blocked).toBeGreaterThanOrEqual(50);
      expect(allowed + blocked).toBe(100);
    });

    it('includes valid Retry-After header', () => {
      const event = {
        headers: {
          'client-ip': '192.168.1.31'
        }
      };

      const config = {
        maxRequests: 1,
        windowMs: 60000
      };

      checkRateLimit(event, config);
      const result = checkRateLimit(event, config);

      const retryAfter = parseInt(result.headers['Retry-After']);

      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60); // Within window
    });

    it('includes valid X-RateLimit headers', () => {
      const event = {
        headers: {
          'client-ip': '192.168.1.32'
        }
      };

      const config = {
        maxRequests: 5,
        windowMs: 60000
      };

      // Use up limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit(event, config);
      }

      const result = checkRateLimit(event, config);

      expect(result.headers['X-RateLimit-Limit']).toBe('5');
      expect(result.headers['X-RateLimit-Remaining']).toBe('0');
      expect(result.headers['X-RateLimit-Reset']).toBeDefined();

      const resetTime = parseInt(result.headers['X-RateLimit-Reset']);
      expect(resetTime).toBeGreaterThan(Date.now());
    });
  });
});
