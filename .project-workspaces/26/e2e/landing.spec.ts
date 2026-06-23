import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display hero section with main headline', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in|get started/i }).first()).toBeVisible();
  });

  test('should have working navigation links', async ({ page }) => {
    const navbar = page.locator('nav').first();
    await expect(navbar).toBeVisible();
    
    await expect(page.getByRole('link', { name: /support/i })).toBeVisible();
  });

  test('should navigate to auth page from CTA button', async ({ page }) => {
    const signInLink = page.getByRole('banner').getByRole('link', { name: 'Sign In' });
    await expect(signInLink).toBeVisible();
    await signInLink.click();
    await expect(page).toHaveURL(/signin|signup|auth/);
  });

  test('should display features section', async ({ page }) => {
    await page.evaluate(() => window.scrollBy(0, 500));
    await page.waitForTimeout(500);
    
    const featuresSection = page.locator('section').filter({ hasText: /feature|track|budget|goal/i });
    await expect(featuresSection.first()).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
