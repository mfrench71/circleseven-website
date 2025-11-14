# Testing Improvements Required

## Issue: Content-Length Bug Not Caught by Tests

### What Happened
A critical bug in `netlify/utils/github-api.cjs` wasn't caught by tests:
- DELETE requests with body were missing the `Content-Length` header
- GitHub API rejected these requests with 422 errors
- Posts couldn't be deleted (moved to bin)
- Tests passed because `nock` mocks don't validate HTTP headers

### Root Cause
Tests use `nock` to mock GitHub API, which accepts requests regardless of proper HTTP formatting. The real GitHub API is stricter and requires `Content-Length` for requests with bodies.

## Recommended Improvements

### 1. Add Header Validation to Mocks ⚠️ HIGH PRIORITY

Update `tests/utils/github-mock.js` to validate critical HTTP headers:

```javascript
export function mockDeleteFile(path, response = { message: 'deleted' }) {
  return nock(GITHUB_API)
    .delete(`/repos/mfrench71/circleseven-website/contents/${path}`)
    .matchHeader('content-length', /\d+/)  // Validate Content-Length exists
    .matchHeader('content-type', 'application/json')
    .reply(200, response);
}

export function mockPutFile(path, response) {
  return nock(GITHUB_API)
    .put(`/repos/mfrench71/circleseven-website/contents/${path}`)
    .matchHeader('content-length', /\d+/)  // Validate Content-Length exists
    .matchHeader('content-type', 'application/json')
    .reply(200, response);
}
```

### 2. Add HTTP Request Format Tests

Create `tests/unit/utils/github-api.test.js`:

```javascript
describe('GitHub API Utility', () => {
  describe('HTTP Request Formatting', () => {
    it('includes Content-Length header for DELETE with body', async () => {
      let capturedHeaders = {};

      nock('https://api.github.com')
        .delete('/repos/user/repo/contents/file.md')
        .reply(function(uri, requestBody) {
          capturedHeaders = this.req.headers;
          return [200, { message: 'deleted' }];
        });

      await githubRequest('/contents/file.md', {
        method: 'DELETE',
        body: { message: 'test', sha: 'abc', branch: 'main' }
      });

      expect(capturedHeaders['content-length']).toBeDefined();
      expect(parseInt(capturedHeaders['content-length'])).toBeGreaterThan(0);
    });

    it('includes Content-Length header for PUT with body', async () => {
      // Similar test for PUT requests
    });

    it('includes Content-Type header for requests with body', async () => {
      // Test Content-Type is set correctly
    });
  });
});
```

### 3. Re-enable Tests in Pre-commit Hook

File: `netlify/build.sh` line 40

```bash
# TEMPORARILY DISABLED - Re-enable after fixing test environment
# if ! npm test; then
#   echo "Tests failed. Commit aborted."
#   exit 1
# fi
```

**Action**: Remove the comment and re-enable test running before commits.

### 4. Add Integration Tests with Real GitHub API

Create `tests/integration/github-api-real.test.js`:

```javascript
// Uses a real test repository to validate actual GitHub API behavior
// Only runs when INTEGRATION_TEST=true environment variable is set

describe('GitHub API - Real Integration Tests', () => {
  // Skip if not explicitly enabled
  const runIntegration = process.env.INTEGRATION_TEST === 'true';

  (runIntegration ? describe : describe.skip)('DELETE operations', () => {
    it('requires Content-Length header', async () => {
      // Test against real GitHub API with test repository
      // Validates that missing Content-Length causes 422 error
    });
  });
});
```

### 5. Add Request Body Validation

Update `mockDeleteFile` to validate request body structure:

```javascript
export function mockDeleteFile(path, response = { message: 'deleted' }, validateBody = true) {
  const scope = nock(GITHUB_API)
    .delete(`/repos/mfrench71/circleseven-website/contents/${path}`)
    .matchHeader('content-length', /\d+/);

  if (validateBody) {
    // Validate DELETE request body has required fields
    scope.reply(function(uri, requestBody) {
      const body = JSON.parse(requestBody);
      if (!body.message || !body.sha || !body.branch) {
        return [422, {
          message: 'Invalid request.\n\n"message", "sha" weren\'t supplied.',
          documentation_url: 'https://docs.github.com/rest/repos/contents#delete-a-file'
        }];
      }
      return [200, response];
    });
  } else {
    scope.reply(200, response);
  }

  return scope;
}
```

### 6. Add Test Coverage for github-api.cjs

Current coverage: **0%** (utility not directly tested)

Add comprehensive tests:
- Request header formatting
- Body serialization
- Error handling
- Response parsing
- Content-Length calculation

## Implementation Priority

1. **Immediate**: Add header validation to existing mocks (prevents similar bugs)
2. **Short-term**: Add github-api.cjs unit tests
3. **Medium-term**: Re-enable pre-commit test hooks
4. **Long-term**: Set up integration tests with real GitHub API

## Test Coverage Goals

- `netlify/utils/github-api.cjs`: 0% → 100%
- `netlify/functions/bin.js`: ~90% → 100% (with header validation)
- Overall backend: ~85% → 95%

## Related Issues

- Tests temporarily disabled in pre-commit hook
- No validation of HTTP request formatting in mocks
- No integration tests against real APIs
- Utility functions lack direct unit tests

---

**Created**: 2025-11-14
**Issue**: DELETE operations failing with 422 due to missing Content-Length header
**Fix**: Added Content-Length to `netlify/utils/github-api.cjs`
