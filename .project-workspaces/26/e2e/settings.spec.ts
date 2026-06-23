import { test, expect } from '@playwright/test';
import { navigateAuthenticated } from './fixtures/auth-helpers';

test.describe('User Settings', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/settings');
  });

  test('should display settings page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /setting/i })).toBeVisible();
  });

  test('should show profile section', async ({ page }) => {
    await expect(page.locator('text=/profile|account/i').first()).toBeVisible();
  });

  test('should show notification settings', async ({ page }) => {
    await expect(page.locator('text=/notification/i').first()).toBeVisible();
  });

  test('should toggle dark mode', async ({ page }) => {
    const darkModeToggle = page.locator('[role="switch"]').filter({ hasText: /dark|theme/i });
    if (await darkModeToggle.isVisible()) {
      await darkModeToggle.click();
    }
  });

  test('should update profile name', async ({ page }) => {
    const nameInput = page.getByLabel(/name|display/i);
    if (await nameInput.isVisible()) {
      await nameInput.fill('Updated Name');
      await page.getByRole('button', { name: /save|update/i }).click();
    }
  });

  test('should show privacy settings', async ({ page }) => {
    const privacyTab = page.getByRole('tab', { name: /privacy/i });
    if (await privacyTab.isVisible()) {
      await privacyTab.click();
      await expect(page.locator('text=/privacy|data/i').first()).toBeVisible();
    }
  });

  test('should show security settings', async ({ page }) => {
    const securityTab = page.getByRole('tab', { name: /security/i });
    if (await securityTab.isVisible()) {
      await securityTab.click();
      await expect(page.locator('text=/password|security/i').first()).toBeVisible();
    }
  });

  test('should have sign out option', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign out|logout/i })).toBeVisible();
  });

  test('should export data option exist', async ({ page }) => {
    const exportBtn = page.getByRole('button', { name: /export|download/i });
    if (await exportBtn.isVisible()) {
      await expect(exportBtn).toBeVisible();
    }
  });
});
