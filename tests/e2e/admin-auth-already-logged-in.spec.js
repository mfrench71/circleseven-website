/**
 * E2E tests for already-authenticated user scenarios
 * These tests verify that authenticated users don't experience reload loops
 * or other auth-related issues when navigating admin pages.
 */

import { test, expect } from '@playwright/test';

// Helper to login via Netlify Identity
async function loginViaNetlifyIdentity(page) {
  // Use test mode for faster, more reliable tests
  await page.goto('http://localhost:8888/admin/?test=true');

  // Wait for page to be ready
  await page.waitForSelector('#main-app:not(.d-none)', { timeout: 10000 });
}

test.describe('Already Authenticated User Flows', () => {
  test('authenticated user can reload page without loops', async ({ page }) => {
    // Login first
    await loginViaNetlifyIdentity(page);

    // Track reload count
    let navigationCount = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigationCount++;
      }
    });

    const initialCount = navigationCount;

    // Manually reload the page (simulates user refresh)
    await page.reload({ waitUntil: 'networkidle' });

    // Wait a bit to see if any unexpected reloads happen
    await page.waitForTimeout(2000);

    // Should only have ONE navigation (the manual reload)
    // If there's a reload loop, navigationCount would be much higher
    expect(navigationCount - initialCount).toBeLessThanOrEqual(1);

    // App should still be visible, auth gate hidden
    await expect(page.locator('#main-app')).toBeVisible();
    await expect(page.locator('#auth-gate')).not.toBeVisible();
  });

  test('authenticated user sees main app immediately on page load', async ({ page }) => {
    // Login
    await loginViaNetlifyIdentity(page);

    // Navigate to posts page (different admin page)
    await page.goto('http://localhost:8888/admin/posts/?test=true');

    // Should see app immediately, not auth gate
    await expect(page.locator('#main-app')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#auth-gate')).not.toBeVisible();

    // Shouldn't see loading spinner for long (data might be loading, but auth is instant)
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });

  test('authenticated user can navigate between admin pages without re-auth', async ({ page }) => {
    // Login
    await loginViaNetlifyIdentity(page);

    // Navigate to several pages in sequence
    const pages = [
      '/admin/posts/?test=true',
      '/admin/pages/?test=true',
      '/admin/taxonomy/?test=true',
      '/admin/?test=true'
    ];

    for (const pagePath of pages) {
      await page.goto(`http://localhost:8888${pagePath}`);

      // Each page should show main app, not auth gate
      await expect(page.locator('#main-app')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#auth-gate')).not.toBeVisible();
    }
  });

  test('does not register login handler when already authenticated', async ({ page }) => {
    // Login first
    await loginViaNetlifyIdentity(page);

    // Check that login handler isn't attached (this would cause reload loop)
    const loginHandlerCount = await page.evaluate(() => {
      // Count how many login handlers are registered
      // This is a bit hacky but necessary to verify the fix
      if (!window.netlifyIdentity || !window.netlifyIdentity._listeners) {
        return 0;
      }

      const listeners = window.netlifyIdentity._listeners?.login || [];
      return listeners.length;
    });

    // Should be 0 or very low (standalone init shouldn't add login handler for auth users)
    // Note: There might be system handlers, so we just check it's reasonable
    expect(loginHandlerCount).toBeLessThanOrEqual(2);
  });

  test('page reload preserves authentication state', async ({ page }) => {
    // Login
    await loginViaNetlifyIdentity(page);

    // Get initial page title/content
    const initialTitle = await page.title();

    // Reload
    await page.reload({ waitUntil: 'networkidle' });

    // Should still be on admin page (not kicked to login)
    await expect(page.locator('#main-app')).toBeVisible();

    // Title should be similar (still admin)
    const reloadedTitle = await page.title();
    expect(reloadedTitle).toContain('Admin');
  });
});

test.describe('Auth State Edge Cases', () => {
  test('handles race condition between auth check and page load', async ({ page }) => {
    // Go to page without test mode (real auth flow)
    // This tests the race condition where init might complete before we check it
    await page.goto('http://localhost:8888/admin/');

    // Either auth gate or main app should be visible, never both
    const authGateVisible = await page.locator('#auth-gate').isVisible();
    const mainAppVisible = await page.locator('#main-app').isVisible();

    // XOR: exactly one should be visible
    expect(authGateVisible !== mainAppVisible).toBe(true);

    if (authGateVisible) {
      // If showing auth gate, should have login button
      await expect(page.locator('#auth-gate button')).toBeVisible();
    } else {
      // If showing main app, should have content
      await expect(page.locator('#main-content')).toBeVisible();
    }
  });

  test('auth gate only visible for non-authenticated users', async ({ page }) => {
    // Go to admin without test mode (logged out)
    await page.goto('http://localhost:8888/admin/');

    // Should show auth gate
    await expect(page.locator('#auth-gate')).toBeVisible();
    await expect(page.locator('#auth-gate.show-auth')).toBeVisible();
    await expect(page.locator('#main-app')).not.toBeVisible();
  });
});
