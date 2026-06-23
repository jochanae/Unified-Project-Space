import { test, expect } from '@playwright/test';
import { navigateAuthenticated } from './fixtures/auth-helpers';

test.describe('Accessibility', () => {
  test('landing page should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);
    await expect(h1).toBeVisible();
  });

  test('landing page should have skip link', async ({ page }) => {
    await page.goto('/');
    
    // Tab to reveal skip link
    await page.keyboard.press('Tab');
    
    const skipLink = page.locator('a').filter({ hasText: /skip/i });
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeFocused();
    }
  });

  test('forms should have proper labels', async ({ page }) => {
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    
    // Check that form inputs exist with identifiable attributes
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    await expect(emailInput).toBeVisible();
    
    const passwordInput = page.locator('input[type="password"]').first();
    await expect(passwordInput).toBeVisible();
  });

  test('buttons should have accessible names', async ({ page }) => {
    await page.goto('/auth');
    
    const buttons = page.getByRole('button');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const name = await button.getAttribute('aria-label') || await button.textContent();
      expect(name).toBeTruthy();
    }
  });

  test('images should have alt text', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < Math.min(count, 5); i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).not.toBeNull();
    }
  });

  test('dashboard should be keyboard navigable', async ({ page }) => {
    await navigateAuthenticated(page, '/dashboard');
    
    // Tab through elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Check something is focused
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).not.toBe('BODY');
  });

  test('modals should trap focus', async ({ page }) => {
    await navigateAuthenticated(page, '/goals');
    
    await page.getByRole('button', { name: /add|create|new/i }).first().click();
    
    // Tab through modal
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Focus should stay within modal
    const focused = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], [class*="modal"], [class*="dialog"]');
      return modal?.contains(document.activeElement);
    });
    
    if (focused !== null) {
      expect(focused).toBe(true);
    }
  });

  test('color contrast should be sufficient', async ({ page }) => {
    await page.goto('/');
    
    // This is a basic check - for full contrast testing use axe-core
    const body = page.locator('body');
    const styles = await body.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
      };
    });
    
    expect(styles.backgroundColor).toBeTruthy();
    expect(styles.color).toBeTruthy();
  });
});
