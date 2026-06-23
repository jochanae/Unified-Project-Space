import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should display sign in form by default', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Sign In' })).toBeVisible();
  });

  test('should switch between sign in and sign up tabs', async ({ page }) => {
    const signUpTab = page.getByRole('tab', { name: 'Sign Up' });
    await expect(signUpTab).toBeVisible();
    await signUpTab.click();
    
    const signInTab = page.getByRole('tab', { name: 'Sign In' });
    await expect(signInTab).toBeVisible();
    await signInTab.click();
    
    await expect(page.getByRole('tabpanel', { name: 'Sign In' })).toBeVisible();
  });

  test('should have password visibility toggle', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toHaveAttribute('type', 'password');
    
    const toggleButton = page.locator('button[type="button"]').filter({ has: page.locator('svg') }).last();
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
    }
  });

  test('should have Google sign in option', async ({ page }) => {
    await expect(page.getByRole('button', { name: /sign in with google/i })).toBeVisible();
  });

  test('should have forgot password button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /forgot password/i })).toBeVisible();
  });

  test('should have remember me checkbox', async ({ page }) => {
    await expect(page.getByRole('checkbox', { name: /remember me/i })).toBeVisible();
  });
});
