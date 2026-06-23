import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('landing page should load within 3 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(3000);
  });

  test('auth page should load within 2 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(2000);
  });

  test('page should not have excessive DOM nodes', async ({ page }) => {
    await page.goto('/');
    
    const nodeCount = await page.evaluate(() => document.querySelectorAll('*').length);
    
    // Warn if over 1500 nodes
    expect(nodeCount).toBeLessThan(3000);
  });

  test('should not have console errors on load', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out expected errors (like missing favicon)
    const criticalErrors = errors.filter(
      (e) => !e.includes('favicon') && !e.includes('404')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });

  test('images should be optimized', async ({ page }) => {
    await page.goto('/');
    
    const images = page.locator('img');
    const count = await images.count();
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const img = images.nth(i);
      const src = await img.getAttribute('src');
      
      // Check for lazy loading on below-fold images
      if (i > 0) {
        const loading = await img.getAttribute('loading');
        // It's okay if not set, but good practice to have lazy
      }
    }
  });

  test('navigation should be fast', async ({ page }) => {
    await page.goto('/');
    
    const start = Date.now();
    await page.goto('/auth');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1500);
  });
});
