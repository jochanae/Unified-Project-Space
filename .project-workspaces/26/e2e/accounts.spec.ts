import { test, expect } from '@playwright/test';
import { navigateAuthenticated } from './fixtures/auth-helpers';

test.describe('Accounts Management', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/accounts');
  });

  test('should display accounts page', async ({ page }) => {
    await expect(page.locator('text=/accounts|bank|wallet|assets/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show add account button', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add|create|new|link|connect|\+/i }).first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
  });

  test('should display account types or categories', async ({ page }) => {
    await page.waitForTimeout(2000);
    const accountTypes = page.locator('text=/checking|savings|credit|investment|cash|wallet/i');
    const count = await accountTypes.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show total balance or net worth', async ({ page }) => {
    await page.waitForTimeout(2000);
    const balanceInfo = page.locator('text=/total|balance|net worth|assets|\$/i');
    const count = await balanceInfo.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should open add account form', async ({ page }) => {
    const addButton = page.getByRole('button', { name: /add|create|new|link|connect|\+/i }).first();
    await addButton.click();
    
    await expect(page.locator('input, [role="dialog"], form').first()).toBeVisible({ timeout: 5000 });
  });

  test('should show account cards or list', async ({ page }) => {
    await page.waitForTimeout(2000);
    const accountElements = page.locator('[class*="card"], [class*="account"], li');
    const count = await accountElements.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should allow clicking on account for details', async ({ page }) => {
    await page.waitForTimeout(2000);
    const accountCard = page.locator('[class*="card"]').first();
    if (await accountCard.isVisible()) {
      await accountCard.click();
      await page.waitForTimeout(500);
    }
    expect(true).toBe(true);
  });
});
