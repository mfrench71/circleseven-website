/**
 * Tests for Netlify Blobs Comments Storage Utility
 *
 * NOTE: These tests are skipped in unit testing because they require a real Netlify Blobs environment.
 * The comments-blobs utility uses CommonJS require() which cannot be properly mocked in Vitest.
 *
 * These functions are tested indirectly through:
 * - comments-submit.test.js (which mocks comments-blobs functions)
 * - comments-moderate.test.js (which mocks comments-blobs functions)
 * - comments-api.test.js (which mocks comments-blobs functions)
 *
 * For full integration testing, deploy to Netlify and test with actual Blobs storage.
 */

import { describe, it } from 'vitest';

describe.skip('Comments Blobs Utility', () => {
  it.skip('requires Netlify Blobs environment for testing', () => {
    // These tests require a real Netlify Blobs connection
    // See integration tests or manual testing on deployed environment
  });
});
