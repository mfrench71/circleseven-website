# Testing Guide

**Last Updated:** February 2026
**Status:** ✅ Tests PASSING (99.7% pass rate)

---

## Current Status

| Metric | Value |
|--------|-------|
| **Total Tests** | 1,099 |
| **Passing** | 1,096 (99.7%) |
| **Skipped** | 3 |
| **Test Files** | 37 |
| **Coverage Target** | 80%+ |

---

## Quick Start

```bash
# Run all tests (unit + integration)
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode (TDD)
npm run test:watch

# E2E tests
npm run test:e2e
```

---

## Test Infrastructure

### Frameworks
- **Vitest** - Unit/integration testing
- **Playwright** - E2E testing
- **Happy DOM** - Lightweight DOM for unit tests
- **V8 Coverage** - Code coverage reporting

### Directory Structure

```
tests/
├── README.md              # This file
├── setup.js               # Global test configuration
├── fixtures/
│   └── mock-data.js       # E2E test fixtures
├── utils/
│   ├── mock-data.js       # Unit test mock data
│   ├── dom-helpers.js     # DOM manipulation helpers
│   ├── github-mock.js     # GitHub API mocking
│   ├── blob-mock.js       # Netlify Blobs mocking
│   └── request-mock.js    # HTTP request mocking
├── unit/
│   ├── backend/           # Netlify function tests
│   ├── frontend/          # Admin UI tests
│   └── utils/             # Utility function tests
├── integration/
│   └── module-loading.test.js
└── e2e/
    ├── admin-smoke.spec.js
    ├── admin-comprehensive.spec.js
    ├── admin-auth-flow.spec.js
    └── jekyll-site.spec.js
```

---

## Test Coverage

### Backend (Netlify Functions)

| Function | Status |
|----------|--------|
| posts.mjs | ✅ Tested |
| pages.mjs | ✅ Tested |
| taxonomy.mjs | ✅ Tested |
| menus.mjs | ✅ Tested |
| settings.mjs | ✅ Tested |
| media.mjs | ✅ Tested |
| bin.mjs | ✅ Tested |
| comments-submit.mjs | ✅ Tested |
| deployment-status.mjs | ✅ Tested |
| deployment-history.mjs | ✅ Tested |
| rate-limit.mjs | ✅ Tested |
| cloudinary-folders.mjs | ✅ Tested |
| recently-published.mjs | ✅ Tested |
| content-health.mjs | ✅ Tested |

### Frontend (Admin Modules)

| Module | Status |
|--------|--------|
| posts.js | ✅ Tested |
| pages.js | ✅ Tested |
| taxonomy.js | ✅ Tested |
| menus.js | ✅ Tested |
| settings.js | ✅ Tested |
| media.js | ✅ Tested |
| bin.js | ✅ Tested |
| deployments.js | ✅ Tested |
| analytics.js | ✅ Tested |
| appearance.js | ✅ Tested |
| image-chooser.js | ✅ Tested |
| link-editor.js | ✅ Tested |
| notifications.js | ✅ Tested |
| utils.js | ✅ Tested |
| logger.js | ✅ Tested |
| header.js | ✅ Tested |
| sidebar.js | ✅ Tested |

### Utility Functions

| Utility | Status |
|---------|--------|
| github-api.mjs | ✅ Tested |
| frontmatter.mjs | ✅ Tested |
| response-helpers.mjs | ✅ Tested |
| validation-schemas.mjs | ✅ Tested |
| rate-limiter.mjs | ✅ Tested |

---

## Writing Tests

### Unit Test Template

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Module Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('functionName', () => {
    it('does what it should', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('handles error case', () => {
      expect(() => functionName(null)).toThrow();
    });
  });
});
```

### Backend Test Template (with GitHub mock)

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mockGetFile, mockPutFile, resetMocks } from '../../utils/github-mock.js';

describe('Function Name', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  it('reads from GitHub', async () => {
    mockGetFile('_data/file.yml', 'content: value');

    const response = await handler(event);

    expect(response.statusCode).toBe(200);
  });
});
```

### E2E Test Template

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/path');
  });

  test('performs action', async ({ page }) => {
    await page.click('#button');
    await expect(page.locator('#result')).toBeVisible();
  });
});
```

---

## Best Practices

### Unit Tests
1. ✅ Test one thing per test
2. ✅ Use descriptive test names
3. ✅ Arrange-Act-Assert pattern
4. ✅ Mock external dependencies
5. ✅ Test both success and error cases
6. ✅ Use `beforeEach` for common setup
7. ✅ Validate HTTP headers in API mocks

### E2E Tests
1. ✅ Use semantic selectors (IDs, data attributes)
2. ✅ Wait for elements before interacting
3. ✅ Test complete user workflows
4. ✅ Keep tests independent
5. ✅ Test across viewports (mobile/desktop)

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npx vitest tests/unit/backend/posts.test.js

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

### E2E Tests

```bash
# Headless (default)
npm run test:e2e

# UI mode (interactive)
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

---

## Debugging

```bash
# Verbose output
npx vitest tests/unit/backend/posts.test.js --reporter=verbose

# E2E with trace
npm run test:e2e -- --trace on
```

### Common Issues

**"ReferenceError: window is not defined"**
→ Ensure test uses happy-dom environment

**Mock not working**
→ Call `vi.clearAllMocks()` in `beforeEach()`
→ Check mock is set up before the function call

**E2E timeout**
→ Ensure dev server is running or let Playwright start it

---

## Continuous Integration

Tests run automatically on every push/PR via GitHub Actions.

**.github/workflows/test.yml** runs:
1. Unit tests
2. Integration tests
3. E2E tests
4. Coverage upload to Codecov

---

## Coverage Goals

| Metric | Target |
|--------|--------|
| Lines | 80% |
| Functions | 80% |
| Branches | 75% |
| Statements | 80% |

Run `npm run test:coverage` to check current coverage.

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Happy-DOM GitHub](https://github.com/capricorn86/happy-dom)
