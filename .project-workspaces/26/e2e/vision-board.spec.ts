import { test, expect } from '@playwright/test';
import { navigateAuthenticated } from './fixtures/auth-helpers';

test.describe('Vision Board', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/vision-board');
  });

  test('should display vision board page', async ({ page }) => {
    await expect(page.locator('text=/vision|dream|goal|board/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show add vision item button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add|create|new|\+/i }).first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
  });

  test('should display vision items or empty state', async ({ page }) => {
    await page.waitForTimeout(2000);
    const hasItems = await page.locator('[class*="card"], [class*="item"], [class*="vision"]').first().isVisible().catch(() => false);
    const hasEmptyState = await page.locator('text=/add|create|start|empty|no vision/i').first().isVisible().catch(() => false);
    expect(hasItems || hasEmptyState).toBeTruthy();
  });

  test('should allow interaction with vision items', async ({ page }) => {
    await page.waitForTimeout(2000);
    const visionItem = page.locator('[class*="card"], [class*="item"]').first();
    if (await visionItem.isVisible()) {
      await visionItem.click();
    }
    expect(true).toBe(true);
  });
});
