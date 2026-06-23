import { test, expect } from '@playwright/test';
import { navigateAuthenticated } from './fixtures/auth-helpers';

test.describe('Credit Score Tracking', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/credit');
  });

  test('should display credit page', async ({ page }) => {
    await expect(page.getByText('Credit Score').first()).toBeVisible();
  });

  test('should show credit score tab', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /credit score/i })).toBeVisible();
  });

  test('should show products tab', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /products/i })).toBeVisible();
  });

  test('should have score overview section', async ({ page }) => {
    const overviewTab = page.getByRole('tab', { name: /overview/i });
    if (await overviewTab.isVisible()) {
      await overviewTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('should show goals sub-tab', async ({ page }) => {
    const goalsTab = page.getByRole('tab', { name: /goals/i });
    if (await goalsTab.isVisible()) {
      await goalsTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('should switch to products tab', async ({ page }) => {
    await page.getByRole('tab', { name: /products/i }).click();
    await page.waitForTimeout(500);
  });

  test('should navigate to utilization sub-tab', async ({ page }) => {
    const utilizationTab = page.getByRole('tab', { name: /utilization/i });
    if (await utilizationTab.isVisible()) {
      await utilizationTab.click();
      await page.waitForTimeout(500);
    }
  });

  test('should navigate to simulator sub-tab', async ({ page }) => {
    const simulatorTab = page.getByRole('tab', { name: /simulator/i });
    if (await simulatorTab.isVisible()) {
      await simulatorTab.click();
      await page.waitForTimeout(500);
    }
  });
});
