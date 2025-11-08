# Testing Guide

**Last Updated:** 2025-11-08
**Status:** 🔴 Tests Currently FAILING (46% failure rate - 310/669 tests failing)
**Priority:** CRITICAL - Fix tests before implementing new features

---

## 🚨 CURRENT STATUS - TESTS ARE BROKEN

**Test Results:**
- ✅ **Passing:** 359 tests
- ❌ **Failing:** 310 tests
- **Success Rate:** 54% (UNACCEPTABLE)
- **Blockers:** HTTP mocking broken, DOM setup incomplete

**See `/OPTIMIZATION-ROADMAP.md` for detailed analysis and fix plan.**

---

## Quick Start

```bash
# Run all tests (unit + integration)
npm test

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
- **Vitest 1.6.1** - Unit/integration testing
- **Playwright 1.40.0** - E2E testing
- **Happy DOM 20.0.10** - Lightweight DOM for unit tests
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
│   └── dom-helpers.js     # DOM manipulation helpers
├── unit/
│   ├── backend/           # 9 Netlify function tests (FAILING)
│   └── frontend/          # 10 admin UI tests (FAILING)
├── integration/
│   └── module-loading.test.js  # 6 tests (PASSING ✓)
└── e2e/
    ├── admin-smoke.spec.js          # Basic smoke tests
    ├── admin-comprehensive.spec.js  # Full workflows
    └── jekyll-site.spec.js          # Frontend features
```

---

## 🔧 Setup Instructions

### First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright browsers
npx playwright install chromium

# 3. Verify setup
npm run test:unit
```

### Troubleshooting Setup

**npm permission errors:**
```bash
sudo chown -R $(whoami) ~/.npm
npm cache clean --force
```

**Playwright browsers not found:**
```bash
npx playwright install
```

**E2E tests timeout:**
```bash
# Make sure dev server is running
netlify dev
```

---

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npx vitest tests/unit/backend/posts.test.js

# Watch mode (auto-rerun on changes)
npm run test:watch

# Interactive UI
npm run test:ui
```

### Integration Tests

```bash
npm run test:integration
```

### E2E Tests

```bash
# Headless (default)
npm run test:e2e

# UI mode (interactive debugger)
npm run test:e2e:ui

# Headed mode (see browser)
npm run test:e2e:headed

# Debug mode (step through)
npm run test:e2e:debug
```

### Coverage

```bash
npm run test:coverage

# View HTML report
open coverage/index.html
```

---

## 📊 Current Test Coverage

### Backend (Netlify Functions): 9/12 tested, 200+ tests

| Function | Tests | Status |
|----------|-------|--------|
| posts.js | 42 | ❌ Failing |
| pages.js | ~50 | ❌ Failing |
| bin.js | 40 | ❌ Failing |
| taxonomy.js | 30 | ❌ Failing |
| settings.js | 27 | ❌ Failing |
| media.js | 21 | ❌ Failing |
| deployment-status.js | 15 | ❌ Failing |
| deployment-history.js | 12 | ❌ Failing |
| rate-limit.js | 10 | ❌ Failing |
| **cloudinary-folders.js** | 0 | ⚠️ No tests |
| **recently-published.js** | 0 | ⚠️ No tests |
| **taxonomy-migrate.js** | 0 | ⚠️ No tests |

### Frontend (Admin Modules): 10/17 tested, 60+ tests

| Module | Tests | Status |
|--------|-------|--------|
| posts.js | 58 | ❌ Failing |
| pages.js | ~50 | ❌ Failing |
| taxonomy.js | ~30 | ❌ Failing |
| deployments.js | ~20 | ❌ Failing |
| settings.js | ~25 | ❌ Failing |
| media.js | ~20 | ❌ Failing |
| image-chooser.js | ~15 | ❌ Failing |
| bin.js | ~10 | ❌ Failing |
| notifications.js | ~5 | ❌ Failing |
| utils.js | ~10 | ❌ Failing |
| **link-editor.js** | 0 | ⚠️ No tests |
| **sidebar.js** | 0 | ⚠️ No tests |
| **appearance.js** | 0 | ⚠️ No tests |
| **logger.js** | 0 | ⚠️ No tests |
| **header.js** | 0 | ⚠️ No tests |

### E2E Tests: 3 files, 110+ tests

- **jekyll-site.spec.js** - 45 tests (navigation, lazy loading, lightbox, etc.)
- **admin-comprehensive.spec.js** - 65 tests (full admin workflows)
- **admin-smoke.spec.js** - Basic smoke tests

---

## 🚨 Critical Issues (Must Fix First)

### Issue #1: Backend HTTP Mocking Broken

**Symptom:**
```
GitHub API error: 401 Bad credentials
Expected: 200, Received: 500
```

**Cause:** `vi.mock('https')` not working properly
**Impact:** 200+ backend tests failing
**Priority:** CRITICAL
**Solution:** Rewrite mocking strategy or use MSW (Mock Service Worker)

### Issue #2: Frontend DOM Setup Incomplete

**Symptom:**
```
TypeError: Cannot read properties of null (reading 'classList')
at pages.js:879 in showPagesList()
```

**Cause:** Missing DOM elements in test setup
**Impact:** 100+ frontend tests failing
**Priority:** CRITICAL
**Solution:** Enhanced DOM builders in `tests/utils/dom-helpers.js`

### Issue #3: Async Race Conditions

**Symptom:** Timing issues with setImmediate(), event listeners
**Impact:** Intermittent failures, unreliable mocks
**Priority:** HIGH
**Solution:** Use waitFor() helpers, better async handling

---

## Writing Tests

### Unit Test Template

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Module Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Function Name', () => {
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

### E2E Tests
1. ✅ Use semantic selectors (IDs, data attributes)
2. ✅ Wait for elements before interacting
3. ✅ Test complete user workflows
4. ✅ Keep tests independent
5. ✅ Use page object patterns for complex pages
6. ✅ Test across viewports (mobile/desktop)

### Performance
1. ✅ Run unit tests in parallel
2. ✅ Use `test.concurrent` for independent E2E tests
3. ✅ Mock API calls in unit tests
4. ✅ Use fixtures for repeated E2E setup
5. ✅ Keep test data minimal

---

## Debugging Failing Tests

```bash
# Run specific test file with verbose output
npx vitest tests/unit/backend/posts.test.js --reporter=verbose

# E2E with browser UI
npm run test:e2e:ui

# E2E debug mode (step through)
npm run test:e2e:debug

# Check coverage gaps
npm run test:coverage
```

### Common Issues

**"ReferenceError: window is not defined"**
→ Ensure `environment: 'happy-dom'` in vitest.config.js

**"baseURL not responding" (E2E)**
→ Ensure `netlify dev` is running or let Playwright start it

**Mock not working**
→ Call `vi.clearAllMocks()` in `beforeEach()`

---

## Configuration Files

### vitest.config.js

```javascript
{
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
      include: [
        'admin/js/**/*.js',
        'netlify/functions/**/*.js'
      ],
      exclude: [
        'node_modules',
        'tests',
        '**/*.test.js',
        '**/*.spec.js'
      ]
    }
  }
}
```

### playwright.config.js

```javascript
{
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8888',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    { name: 'chromium', use: devices['Desktop Chrome'] }
  ],
  webServer: {
    command: 'netlify dev',
    url: 'http://localhost:8888',
    timeout: 120000
  }
}
```

---

## Continuous Integration

Tests run automatically on every push/PR via GitHub Actions.

**.github/workflows/test.yml** runs:
1. Unit tests
2. Integration tests
3. E2E tests
4. Coverage upload to Codecov

View results: https://github.com/mfrench71/circleseven-website/actions

---

## Manual Smoke Testing

### Quick 5-Minute Check

Before deploying, manually verify:

1. **Module Loading** (30s)
   - [ ] Open `/admin/`
   - [ ] Check console - ZERO red errors
   - [ ] No "does not provide export" errors

2. **Section Navigation** (1min)
   - [ ] Click through all tabs
   - [ ] Each shows content (not blank/error)

3. **Settings Prepopulation** (30s)
   - [ ] All admin settings have values
   - [ ] All site settings populated from _config.yml

4. **Protected Pages** (1min)
   - [ ] Lock icons present
   - [ ] Delete buttons absent on protected pages

5. **Create/Edit** (1min)
   - [ ] Can add/edit taxonomy
   - [ ] Green success message appears

6. **Notifications** (30s)
   - [ ] Messages appear
   - [ ] Auto-dismiss after 5s

### Pass/Fail Criteria

**✅ PASS - Safe to Deploy:**
- Zero console errors on load
- All sections load
- Settings fields populated
- Can create/edit items
- Notifications work

**❌ FAIL - Do Not Deploy:**
- Red console errors
- Blank/white sections
- Empty settings fields
- "undefined" or "not a function" errors

---

## Coverage Goals

### Current Targets (vitest.config.js)
- **Lines:** 80%
- **Functions:** 80%
- **Branches:** 75%
- **Statements:** 80%

### Current Reality
**Cannot measure** - Tests failing prevent coverage calculation

### After Fixes (Target)
- Backend: >80%
- Frontend: >75%
- Overall: >80%

---

## Next Steps

### Immediate (This Week)
1. 🔴 **Fix HTTP mocking** - Backend tests (1-2 days)
2. 🔴 **Fix DOM setup** - Frontend tests (1 day)
3. ⚠️ **Add missing tests** - 3 backend + 6 frontend files (2-3 days)
4. ✅ **Achieve >80% coverage** - Run coverage and fill gaps (1 day)

### Short-term (Next 2 Weeks)
1. Add missing edge case tests
2. Add error scenario tests
3. Add keyboard navigation tests
4. Add accessibility tests
5. Enable all E2E tests in CI

### Long-term
1. Performance testing
2. Visual regression testing
3. Mutation testing (Stryker)
4. Security testing

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Happy-DOM GitHub](https://github.com/capricorn86/happy-dom)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- **Main Optimization Guide:** `/OPTIMIZATION-ROADMAP.md`

---

## Summary

| Metric | Value |
|--------|-------|
| **Total Tests** | 669 |
| **Passing** | 359 (54%) |
| **Failing** | 310 (46%) |
| **Test Files** | 23 |
| **Coverage** | Unknown (blocked by failures) |
| **Status** | 🔴 CRITICAL - Fix immediately |

**See `/OPTIMIZATION-ROADMAP.md` for comprehensive testing analysis and fix plan.**
