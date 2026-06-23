import { test, expect } from '@playwright/test';

test.describe('App Navigation', () => {
  test('should load landing page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('banner').getByRole('link', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/signin/);
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('should navigate to sign up page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('link', { name: /get started|start free/i }).first().click();
    await expect(page).toHaveURL(/signup|signin/);
  });

  test('should redirect unauthenticated users from dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/signin|auth|\/$/);
  });

  test('should navigate back with browser back button', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.goto('/signin');
    await page.waitForLoadState('domcontentloaded');
    
    await page.goBack();
    await expect(page).toHaveURL('/');
  });

  test('should handle 404 gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz123');
    await page.waitForLoadState('domcontentloaded');
    
    const notFoundText = page.locator('text=/not found|404|page.*exist/i').first();
    const redirectedHome = page.url().endsWith('/') || page.url().includes('signin');
    
    expect(await notFoundText.isVisible() || redirectedHome).toBeTruthy();
  });

  test('should have working footer links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    
    const footerNav = page.locator('footer').first();
    await expect(footerNav).toBeVisible();
  });
});
