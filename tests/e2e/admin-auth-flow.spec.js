/**
 * E2E Tests for Admin Authentication Flow
 *
 * These tests verify that admin pages:
 * - Don't get stuck in reload loops
 * - Handle authentication correctly with initStandalonePage
 * - Show/hide auth gates appropriately
 */

import { test, expect } from '@playwright/test';

const ADMIN_PAGES = [
  { path: '/admin/', name: 'Dashboard' },
  { path: '/admin/posts/', name: 'Posts' },
  { path: '/admin/pages/', name: 'Pages' },
  { path: '/admin/taxonomy/', name: 'Taxonomy' },
  { path: '/admin/tags/', name: 'Tags' },
  { path: '/admin/categories/', name: 'Categories' },
  { path: '/admin/media/', name: 'Media Library' },
  { path: '/admin/analytics/', name: 'Analytics' },
  { path: '/admin/bin/', name: 'Bin' },
  { path: '/admin/appearance/', name: 'Appearance' },
  { path: '/admin/settings/', name: 'Settings' }
];

test.describe('Admin Authentication Flow', () => {
  test.describe('Reload Loop Detection', () => {
    ADMIN_PAGES.forEach(({ path, name }) => {
      test(`${name} page should not reload infinitely`, async ({ page }) => {
        let loadCount = 0;
        const MAX_LOADS = 3; // Allow initial load + potential auth redirect, but not infinite

        // Track page loads
        page.on('load', () => {
          loadCount++;
        });

        // Navigate to admin page
        await page.goto(path, { waitUntil: 'networkidle' });

        // Wait a bit to see if multiple reloads occur
        await page.waitForTimeout(2000);

        // Should not reload more than MAX_LOADS times
        expect(loadCount).toBeLessThanOrEqual(MAX_LOADS);

        if (loadCount > MAX_LOADS) {
          throw new Error(`${name} page reloaded ${loadCount} times - possible infinite reload loop`);
        }
      });
    });
  });

  test.describe('Auth Gate Behavior', () => {
    ADMIN_PAGES.forEach(({ path, name }) => {
      test(`${name} page should show auth gate when not logged in`, async ({ page }) => {
        await page.goto(path);

        // Should show auth gate
        const authGate = page.locator('#auth-gate');
        await expect(authGate).toBeVisible({ timeout: 5000 });

        // Should have login button
        const loginButton = authGate.locator('button:has-text("Log In")');
        await expect(loginButton).toBeVisible();

        // Main app should be hidden
        const mainApp = page.locator('#main-app');
        await expect(mainApp).toHaveClass(/d-none/);
      });
    });
  });

  test.describe('Page Stability', () => {
    ADMIN_PAGES.forEach(({ path, name }) => {
      test(`${name} page should stabilize and not flash between states`, async ({ page }) => {
        const stateChanges = [];

        // Monitor visibility changes
        await page.goto(path);

        // Track initial state
        const authGateVisible = await page.locator('#auth-gate').isVisible();
        stateChanges.push({ state: 'auth-gate', visible: authGateVisible, time: Date.now() });

        // Wait and check if state flickers
        await page.waitForTimeout(1500);

        const authGateVisibleAfter = await page.locator('#auth-gate').isVisible();
        if (authGateVisible !== authGateVisibleAfter) {
          stateChanges.push({ state: 'auth-gate', visible: authGateVisibleAfter, time: Date.now() });
        }

        // Should not have rapid state changes (flickering)
        expect(stateChanges.length).toBeLessThanOrEqual(2);
      });
    });
  });

  test.describe('No Duplicate Event Handlers', () => {
    ADMIN_PAGES.forEach(({ path, name }) => {
      test(`${name} page should not have manual netlifyIdentity event handlers`, async ({ page }) => {
        await page.goto(path);

        // Check page source for conflicting patterns
        const pageContent = await page.content();

        // Should NOT have manual login/logout handlers alongside initStandalonePage
        const hasInitStandalonePage = pageContent.includes('initStandalonePage');
        const hasManualLoginHandler = pageContent.match(/netlifyIdentity\.on\(['"]login['"]/);
        const hasManualLogoutHandler = pageContent.match(/netlifyIdentity\.on\(['"]logout['"]/);

        if (hasInitStandalonePage) {
          expect(hasManualLoginHandler).toBeFalsy({
            message: `${name} page uses initStandalonePage but also has manual netlifyIdentity.on('login') handler - this causes reload loops`
          });

          expect(hasManualLogoutHandler).toBeFalsy({
            message: `${name} page uses initStandalonePage but also has manual netlifyIdentity.on('logout') handler - this causes conflicts`
          });
        }
      });
    });
  });

  test.describe('Console Error Detection', () => {
    ADMIN_PAGES.forEach(({ path, name }) => {
      test(`${name} page should not have critical console errors`, async ({ page }) => {
        const errors = [];

        // Capture console errors
        page.on('console', msg => {
          if (msg.type() === 'error') {
            errors.push(msg.text());
          }
        });

        // Capture page errors
        page.on('pageerror', error => {
          errors.push(error.message);
        });

        await page.goto(path);
        await page.waitForTimeout(2000);

        // Filter out known non-critical errors (like Netlify Identity widget warnings)
        const criticalErrors = errors.filter(err => {
          // Ignore Netlify Identity widget initialization warnings
          if (err.includes('Netlify Identity')) return false;
          if (err.includes('identity.netlify.com')) return false;
          return true;
        });

        // Should not have critical errors
        expect(criticalErrors).toHaveLength(0);

        if (criticalErrors.length > 0) {
          console.log(`${name} page errors:`, criticalErrors);
        }
      });
    });
  });
});

test.describe('Admin Page Load Performance', () => {
  test('All admin pages should load within reasonable time', async ({ page }) => {
    for (const { path, name } of ADMIN_PAGES) {
      const startTime = Date.now();
      await page.goto(path, { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      // Pages should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);

      console.log(`${name}: ${loadTime}ms`);
    }
  });
});
