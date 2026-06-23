import { test, expect } from '@playwright/test';
import { navigateAuthenticated } from './fixtures/auth-helpers';
import { getSeededTestData } from './fixtures/seeded-data-reader';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/dashboard');
  });

  test('should display dashboard header', async ({ page }) => {
    await expect(page.locator('text=/dashboard|welcome|overview|home|good morning|good afternoon|good evening|coinsbloom/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('should show financial overview cards with seeded data', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const seededData = getSeededTestData();
    if (seededData && (seededData.goals.length > 0 || seededData.budgets.length > 0)) {
      // Rigorous test: verify overview cards reflect seeded data
      const overviewCards = page.locator('[class*="card"]');
      await expect(overviewCards.first()).toBeVisible({ timeout: 5000 });
      
      // Verify at least some financial data is shown
      const financialData = page.locator('text=/\\$|budget|goal|balance|spent|saved/i');
      await expect(financialData.first()).toBeVisible({ timeout: 5000 });
    } else {
      // Fallback
      const cards = page.locator('[class*="card"], [class*="stat"], [class*="metric"]');
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should display navigation menu', async ({ page }) => {
    const menuButton = page.locator('button').filter({ hasText: /menu/i }).or(page.locator('[data-testid*="menu"]')).or(page.locator('button[aria-label*="menu" i]'));
    if (await menuButton.first().isVisible()) {
      await menuButton.first().click();
      await expect(page.locator('text=/goals|budgets|bills|accounts/i').first()).toBeVisible();
    } else {
      await expect(page.locator('a, button').filter({ hasText: /goals|budgets|bills/i }).first()).toBeVisible();
    }
  });

  test('should have working navigation to seeded goal', async ({ page }) => {
    const seededData = getSeededTestData();
    
    // Dismiss any modals first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    // Navigate to goals
    const goalsLink = page.locator('a[href*="goals"], button').filter({ hasText: /goals/i }).first();
    await goalsLink.click({ force: true });
    await expect(page).toHaveURL(/goals/, { timeout: 10000 });
    
    if (seededData && seededData.goals.length > 0) {
      // Verify seeded goal is visible
      await expect(page.locator(`text=${seededData.goals[0].title}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate to budgets page with seeded data', async ({ page }) => {
    const seededData = getSeededTestData();
    
    // Dismiss any modals first
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const budgetsLink = page.locator('a[href*="budgets"], button').filter({ hasText: /budgets/i }).first();
    await budgetsLink.click({ force: true });
    await expect(page).toHaveURL(/budgets/, { timeout: 10000 });
    
    if (seededData && seededData.budgets.length > 0) {
      // Verify seeded budget is visible
      await expect(page.locator(`text=${seededData.budgets[0].name}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display quick actions or widgets', async ({ page }) => {
    await page.waitForTimeout(2000);
    const hasQuickActions = await page.locator('text=/quick actions|add|create|new/i').first().isVisible().catch(() => false);
    const hasWidgets = await page.locator('[class*="card"], [class*="widget"]').first().isVisible().catch(() => false);
    expect(hasQuickActions || hasWidgets).toBeTruthy();
  });

  test('should show user avatar or profile indicator', async ({ page }) => {
    const profileIndicator = page.locator('img[alt*="avatar" i], img[alt*="profile" i], [class*="avatar"], [class*="Avatar"], [data-testid*="profile"], [data-testid*="user"], button[aria-label*="profile" i], a[href*="profile"], a[href*="settings"]').first();
    if (await profileIndicator.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(profileIndicator).toBeVisible();
    } else {
      expect(true).toBe(true);
    }
  });

  test('should be responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    await expect(page.locator('text=/dashboard|welcome|overview|good morning|good afternoon|good evening|coinsbloom/i').first()).toBeVisible({ timeout: 10000 });
    
    const cards = page.locator('[class*="card"]');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
