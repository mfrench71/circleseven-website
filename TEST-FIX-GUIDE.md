# Test Fix Implementation Guide

**Created:** 2025-11-08
**Status:** In Progress
**Priority:** CRITICAL - Must complete before Phase 1 optimizations

---

## Current Status

**Test Progress: 441/669 passing (66%)**

✅ **Completed Migrations:**
1. Installed `nock` for HTTP mocking (`npm install --save-dev nock`)
2. Created `/tests/utils/github-mock.js` - Helper functions for GitHub/Cloudinary API mocking
3. ✅ `posts.test.js` - 44/44 tests passing (100%)
4. ✅ `pages.test.js` - 17/17 tests passing (100%)
5. ✅ `deployment-status.test.js` - 21/21 tests passing (100%)
6. ✅ `deployment-history.test.js` - 19/19 tests passing (100%)
7. ✅ `rate-limit.test.js` - 15/15 tests passing (100%) + bug fix in rate-limit.js

🔧 **In Progress:**
1. `taxonomy.test.js` - 18/26 tests passing (8 complex tests remaining)
2. `settings.test.js` - 16/24 tests passing (8 complex tests remaining)
3. `bin.test.js` - 17/31 tests passing (14 complex tests remaining)
4. `media.test.js` - 8/20 tests passing (12 tests - env var timing issue)

❌ **Remaining Work:**
1. Complete partially migrated backend files (42 tests failing)
2. Fix frontend DOM setup issues (186 tests failing)
3. Achieve 100% test pass rate (669/669 tests)

---

## How to Fix Backend Tests

### Step 1: Understanding the Problem

**Old Broken Approach:**
```javascript
import https from 'https';
vi.mock('https');  // ❌ This doesn't work properly

// Complex manual mocking that fails
mockRequest = { on: vi.fn(), write: vi.fn(), end: vi.fn() };
https.request = vi.fn().mockReturnValue(mockRequest);
```

**New Working Approach:**
```javascript
import { mockListContents, mockGetFile } from '../../utils/github-mock.js';

// Simple, reliable nock-based mocking
mockListContents('_posts', [
  { name: 'post.md', path: '_posts/post.md', sha: 'abc123', size: 500 }
]);
```

---

## Migration Pattern

### For Each Backend Test File:

#### 1. Update Imports

**Before:**
```javascript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import https from 'https';

vi.mock('https');

describe('Posts Function', () => {
  let handler;
  let mockRequest;
  let mockResponse;

  beforeEach(async () => {
    vi.resetModules();
    process.env.GITHUB_TOKEN = 'test-github-token-12345';

    mockRequest = { on: vi.fn(), write: vi.fn(), end: vi.fn() };
    mockResponse = { statusCode: 200, on: vi.fn(), setEncoding: vi.fn() };
    https.request = vi.fn().mockReturnValue(mockRequest);

    const module = await import('../../../netlify/functions/posts.js');
    handler = module.handler;
  });
```

**After:**
```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mockListContents, mockGetFile, mockPutFile, mockDeleteFile, mockGitHubError, cleanMocks } from '../../utils/github-mock.js';
import { handler } from '../../../netlify/functions/posts.js';

describe('Posts Function', () => {
  beforeEach(() => {
    process.env.GITHUB_TOKEN = 'test-github-token-12345';
    cleanMocks();
  });
```

#### 2. Replace setupGitHubMock() Calls

**Before:**
```javascript
setupGitHubMock({
  statusCode: 200,
  body: JSON.stringify([
    { name: 'post.md', path: '_posts/post.md', sha: 'abc', size: 500 }
  ])
});
```

**After:**
```javascript
mockListContents('_posts', [
  { name: 'post.md', path: '_posts/post.md', sha: 'abc', size: 500 }
]);
```

#### 3. Handle Different HTTP Methods

**GET (list files):**
```javascript
mockListContents('_posts', arrayOfFiles);
```

**GET (single file):**
```javascript
mockGetFile('_posts/2024-01-01-post.md', {
  name: '2024-01-01-post.md',
  path: '_posts/2024-01-01-post.md',
  sha: 'abc123',
  size: 1234,
  content: Buffer.from('---\ntitle: Test\n---\nContent').toString('base64')
});
```

**PUT (create/update):**
```javascript
mockPutFile('_posts/2024-01-01-post.md', {
  commit: { sha: 'new-sha-123' }
});
```

**DELETE:**
```javascript
mockDeleteFile('_bin/old-post.md', {
  commit: { sha: 'delete-sha-456' }
});
```

**Error responses:**
```javascript
mockGitHubError('GET', '/repos/mfrench71/circleseven-website/contents/_posts?ref=main', 401, 'Bad credentials');
```

#### 4. Remove the setupGitHubMock() Function

Delete the `setupGitHubMock()` function at the end of each test file (it's usually around line 1148).

---

## Files to Migrate

### Backend Tests (9 files)

1. ✅ `tests/unit/backend/posts.test.js` - Started (2/42 tests done)
2. ❌ `tests/unit/backend/pages.test.js`
3. ❌ `tests/unit/backend/bin.test.js`
4. ❌ `tests/unit/backend/taxonomy.test.js`
5. ❌ `tests/unit/backend/settings.test.js`
6. ❌ `tests/unit/backend/media.test.js`
7. ❌ `tests/unit/backend/deployment-status.test.js`
8. ❌ `tests/unit/backend/deployment-history.test.js`
9. ❌ `tests/unit/backend/rate-limit.test.js`

**Estimated Time:** 1-2 days (20-30 min per file)

---

## Frontend DOM Setup Fixes

### Problem

Frontend tests are failing with:
```
TypeError: Cannot read properties of null (reading 'classList')
at pages.js:879 in showPagesList()
```

### Root Cause

Missing DOM elements in test setup. Example:
```javascript
// pages.js expects these elements to exist:
document.getElementById('pages-list-view')  // ❌ null
document.getElementById('pages-editor-view') // ❌ null
```

### Solution

Enhance `/tests/utils/dom-helpers.js` with page-specific DOM builders:

```javascript
export function setupPagesDOM() {
  document.body.innerHTML = `
    <div id="pages-list-view">
      <table id="pages-table">
        <tbody id="pages-tbody"></tbody>
      </table>
      <input id="pages-search" type="text" />
    </div>
    <div id="pages-editor-view" class="hidden">
      <form id="page-form">
        <input id="page-title" />
        <input id="page-permalink" />
        <textarea id="page-content"></textarea>
        <input type="checkbox" id="page-protected" />
      </form>
    </div>
    <div id="loading" class="hidden"></div>
    <div id="success" class="hidden"><p></p></div>
    <div id="error" class="hidden"><p></p></div>
  `;
}
```

Then in tests:
```javascript
beforeEach(() => {
  setupPagesDOM();  // Instead of generic setupDocument()
});
```

### Files Needing DOM Fixes

1. `tests/unit/frontend/pages.test.js`
2. `tests/unit/frontend/posts.test.js`
3. `tests/unit/frontend/taxonomy.test.js`
4. `tests/unit/frontend/settings.test.js`
5. `tests/unit/frontend/media.test.js`
6. `tests/unit/frontend/deployments.test.js`
7. `tests/unit/frontend/bin.test.js`

**Estimated Time:** 1 day (1-2 hours per file)

---

## Testing the Fixes

After each file migration:

```bash
# Test single file
npx vitest tests/unit/backend/posts.test.js

# Run all backend tests
npm run test:unit -- tests/unit/backend

# Run all frontend tests
npm run test:unit -- tests/unit/frontend

# Run everything
npm test
```

**Target:** 0 failures, 100% passing

---

## Example: Complete File Migration

### rate-limit.test.js (Fully Migrated ✅)

**Migration Steps:**
1. ✅ Added `@vitest-environment node` directive to avoid nock/happy-dom conflicts
2. ✅ Updated imports from inline mocking to nock helpers
3. ✅ Created `mockRateLimit()` helper in github-mock.js
4. ✅ Converted 15 tests from `https.request.mockImplementation` to `mockRateLimit()`
5. ✅ Fixed bug in `/netlify/functions/rate-limit.js` - Added try-catch around `JSON.parse()`

**Bug Fix:**
```javascript
// Before (uncaught JSON parse errors)
resolve(JSON.parse(data));

// After (properly caught errors)
try {
  resolve(JSON.parse(data));
} catch (error) {
  reject(new Error(`Failed to parse GitHub API response: ${error.message}`));
}
```

**Result:** 15/15 tests passing (was 0/15 before)

### posts.test.js (Fully Migrated ✅)

**Changes Made:**
1. ✅ Removed `vi.mock('https')`
2. ✅ Removed manual mock setup
3. ✅ Imported nock helpers
4. ✅ Simplified beforeEach/afterEach
5. ✅ Replaced all `setupGitHubMock()` calls with helper functions
6. ✅ Deleted the `setupGitHubMock()` function

**Result:** 44/44 tests passing

---

## Helper Functions Reference

### github-mock.js API

```javascript
// List repository contents
mockListContents(path, files)

// Get single file
mockGetFile(path, file)

// Create/update file
mockPutFile(path, response)

// Delete file
mockDeleteFile(path, response)

// Mock GitHub Actions workflows
mockWorkflowRuns(runs)           // Includes branch=main parameter
mockWorkflowRun(runId, run)

// Mock GitHub rate limit
mockRateLimit(rateLimitData)     // For rate_limit endpoint

// Mock Cloudinary API
mockCloudinaryResources(resources, options)
mockCloudinaryError(statusCode, message)

// Mock error responses
mockGitHubError(method, path, statusCode, message)

// Cleanup
cleanMocks()  // Call in afterEach()
```

---

## Automated Migration Script (Optional)

You could create a script to automate some of the replacement:

```bash
# Replace setupGitHubMock calls with mockListContents
sed -i '' 's/setupGitHubMock({.*body: JSON.stringify(\[/mockListContents('"'"'_posts'"'"', [/g' tests/unit/backend/*.test.js

# But manual review is recommended for accuracy
```

---

## Progress Tracking

Update this checklist as you complete files:

### Backend Tests
- [x] posts.test.js - 44/44 passing ✅
- [x] pages.test.js - 17/17 passing ✅
- [x] deployment-status.test.js - 21/21 passing ✅
- [x] deployment-history.test.js - 19/19 passing ✅
- [x] rate-limit.test.js - 15/15 passing ✅ (+ bug fix)
- [ ] taxonomy.test.js - 18/26 passing (8 remaining)
- [ ] settings.test.js - 16/24 passing (8 remaining)
- [ ] bin.test.js - 17/31 passing (14 remaining)
- [ ] media.test.js - 8/20 passing (12 remaining)

### Frontend Tests
- [ ] pages.test.js
- [ ] posts.test.js
- [ ] taxonomy.test.js
- [ ] settings.test.js
- [ ] media.test.js
- [ ] deployments.test.js
- [ ] bin.test.js

### Verification
- [ ] All backend tests passing
- [ ] All frontend tests passing
- [ ] Coverage >80%
- [ ] No console errors
- [ ] CI/CD passing

---

## When Complete

After all tests pass:

1. Run full test suite: `npm test`
2. Check coverage: `npm run test:coverage`
3. Commit changes (don't push yet - wait for confirmation)
4. Update OPTIMIZATION-ROADMAP.md status
5. Move to Phase 1: CSS optimization

---

## Questions?

Refer to:
- `/tests/README.md` - Testing guide
- `/OPTIMIZATION-ROADMAP.md` - Full optimization plan
- `/tests/utils/github-mock.js` - Helper function source code
- `nock` documentation: https://github.com/nock/nock

---

**Estimated Total Time:** 2-3 days
**Priority:** Complete before starting CSS optimization
**Status:** Ready to continue migration
