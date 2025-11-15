# Testing Improvement Plan

## Issues Found in Production

1. **Reload Loop**: Login handler triggered on already-authenticated page loads
2. **Missing Geodata**: Data fetched but not rendered (destructuring bug)
3. **Missing Loading States**: Spinner color inconsistency not tested

## Required Test Additions

### 1. E2E Auth Tests (HIGH PRIORITY)
**File:** `tests/e2e/admin-auth-already-logged-in.spec.js`

```javascript
test('already-authenticated user can reload page without loops', async ({ page }) => {
  // Login first
  await page.goto('http://localhost:8888/admin/');
  await loginViaNetlifyIdentity(page);

  // Get initial load count
  let reloadCount = 0;
  page.on('load', () => reloadCount++);

  // Reload the page (simulates user refresh)
  await page.reload();

  // Wait 3 seconds
  await page.waitForTimeout(3000);

  // Should only reload ONCE (the manual reload)
  expect(reloadCount).toBe(1);

  // App should still be visible
  await expect(page.locator('#main-app')).toBeVisible();
  await expect(page.locator('#auth-gate')).not.toBeVisible();
});

test('authenticated user sees main app immediately', async ({ page }) => {
  // Login and navigate to a page
  await loginAndNavigate(page, '/admin/');

  // Navigate to another admin page (no reload)
  await page.goto('http://localhost:8888/admin/posts/');

  // Should see app, not auth gate
  await expect(page.locator('#main-app')).toBeVisible();
  await expect(page.locator('#auth-gate')).not.toBeVisible();
});
```

### 2. Analytics Render Tests (MEDIUM PRIORITY)
**File:** `tests/unit/frontend/analytics.test.js`

```javascript
describe('renderCustomAnalytics', () => {
  it('renders geodata when countryStats and cityStats are present', () => {
    const data = {
      summary: { totalPageViews: 100, uniqueVisitors: 50, totalPages: 10 },
      topPages: [],
      topReferrers: [],
      deviceStats: [],
      countryStats: [
        { country: 'United States', count: 50 },
        { country: 'United Kingdom', count: 25 }
      ],
      cityStats: [
        { city: 'London', count: 15 },
        { city: 'New York', count: 10 }
      ],
      dailyViews: [],
      hourlyViews: []
    };

    const html = renderCustomAnalytics(data);

    // Should contain geographic data section
    expect(html).toContain('Geographic Data');
    expect(html).toContain('United States');
    expect(html).toContain('United Kingdom');
    expect(html).toContain('London');
    expect(html).toContain('New York');
  });

  it('shows placeholder when no geodata', () => {
    const data = {
      summary: { totalPageViews: 10, uniqueVisitors: 5, totalPages: 2 },
      topPages: [],
      topReferrers: [],
      deviceStats: [],
      countryStats: [],
      cityStats: [],
      dailyViews: [],
      hourlyViews: []
    };

    const html = renderCustomAnalytics(data);

    expect(html).toContain('Geographic data will appear');
  });

  it('includes text-primary on loading spinner', () => {
    const container = document.createElement('div');

    // Spy on innerHTML setter
    const innerHTMLSpy = vi.spyOn(container, 'innerHTML', 'set');

    renderAnalytics(container);

    const loadingHTML = innerHTMLSpy.mock.calls[0][0];
    expect(loadingHTML).toContain('spinner-border text-primary');
  });
});
```

### 3. Visual Regression Tests (LOW PRIORITY)
**Tool:** Playwright screenshot comparison

```javascript
test('analytics page matches snapshot', async ({ page }) => {
  await page.goto('http://localhost:8888/admin/analytics/');
  await expect(page).toHaveScreenshot('analytics-with-data.png');
});
```

### 4. Integration Tests for Auth Flow
**File:** `tests/integration/auth-integration.spec.js`

```javascript
describe('Auth Integration', () => {
  it('does not trigger login handlers when already authenticated', async () => {
    // Mock netlifyIdentity
    const loginHandlers = [];
    window.netlifyIdentity = {
      currentUser: () => ({ email: 'test@example.com' }),
      on: (event, handler) => {
        if (event === 'login') loginHandlers.push(handler);
      },
      init: () => {}
    };

    // Initialize page (user already logged in)
    await initStandalonePage('test', async () => {});

    // Login handlers should NOT be registered for authenticated users
    expect(loginHandlers.length).toBe(0);
  });
});
```

## Pre-Deploy Checklist

Before every deployment:

- [ ] Unit tests pass (`npm test`)
- [ ] E2E tests pass (`npm run test:e2e`)
- [ ] Visual inspection of all admin pages
- [ ] Test already-authenticated page loads
- [ ] Verify geodata displays in analytics
- [ ] Check loading states have correct colors

## Test Coverage Goals

- **Unit Tests:** 80% coverage minimum
- **E2E Tests:** All critical user paths
- **Integration Tests:** All auth flows

## CI/CD Improvements

1. **Require tests to pass** before merge (currently not enforced)
2. **Add E2E tests to GitHub Actions** workflow
3. **Test both fresh AND authenticated sessions** in E2E
4. **Add visual regression testing** for critical pages

## Lessons Learned

- ✅ Test the happy path (fresh login)
- ❌ **MISSED:** Test the return user path (already logged in)
- ❌ **MISSED:** Validate rendered output contains expected data
- ❌ **MISSED:** Test page reloads for authenticated users
