/**
 * E2E Smoke Test for Admin Interface
 *
 * Tests basic navigation and functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Interface Smoke Test', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin
    await page.goto('/admin-custom/');

    // Note: In real tests, you'd handle Netlify Identity login
    // For now, this assumes you're already logged in or have bypassed auth
  });

  test('loads without console errors', async ({ page }) => {
    const errors = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForLoadState('networkidle');

    // Should have no console errors
    expect(errors).toHaveLength(0);
  });

  test('all navigation tabs are present', async ({ page }) => {
    await expect(page.locator('#nav-dashboard')).toBeVisible();
    await expect(page.locator('#nav-taxonomy')).toBeVisible();
    await expect(page.locator('#nav-posts')).toBeVisible();
    await expect(page.locator('#nav-pages')).toBeVisible();
    await expect(page.locator('#nav-media')).toBeVisible();
    await expect(page.locator('#nav-trash')).toBeVisible();
    await expect(page.locator('#nav-settings')).toBeVisible();
  });

  test('can navigate to settings section', async ({ page }) => {
    await page.click('#nav-settings');

    await expect(page.locator('#section-settings')).toBeVisible();
    await expect(page.locator('#admin-settings-form')).toBeVisible();
    await expect(page.locator('#settings-form')).toBeVisible();
  });

  test('admin settings fields are prepopulated', async ({ page }) => {
    await page.click('#nav-settings');

    // Wait for settings to load
    await page.waitForTimeout(500);

    // Check that fields have values
    const deploymentPollValue = await page.inputValue('#admin-setting-deployment-poll-interval');
    expect(deploymentPollValue).not.toBe('');
    expect(parseInt(deploymentPollValue)).toBeGreaterThan(0);

    const historyPollValue = await page.inputValue('#admin-setting-deployment-history-poll-interval');
    expect(historyPollValue).not.toBe('');
    expect(parseInt(historyPollValue)).toBeGreaterThan(0);
  });

  test('can navigate to taxonomy section', async ({ page }) => {
    await page.click('#nav-taxonomy');

    await expect(page.locator('#section-taxonomy')).toBeVisible();
    await expect(page.locator('#categories-list')).toBeVisible();
  });

  test('can navigate to posts section', async ({ page }) => {
    await page.click('#nav-posts');

    await expect(page.locator('#section-posts')).toBeVisible();
    await expect(page.locator('#posts-table-body')).toBeVisible();
  });

  test('can navigate to pages section', async ({ page }) => {
    await page.click('#nav-pages');

    await expect(page.locator('#section-pages')).toBeVisible();
    await expect(page.locator('#pages-table-body')).toBeVisible();
  });

  test('notifications work correctly', async ({ page }) => {
    // This test requires triggering an action that shows a notification
    // For example, resetting admin settings
    await page.click('#nav-settings');

    // Click reset button if it exists
    const resetBtn = page.locator('button:has-text("Reset to Defaults")');
    if (await resetBtn.isVisible()) {
      await resetBtn.click();

      // Success notification should appear
      const successEl = page.locator('#success');
      await expect(successEl).not.toHaveClass(/hidden/);
    }
  });
});
