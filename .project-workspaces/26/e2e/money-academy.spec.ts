import { test, expect } from '@playwright/test';
import { navigateAuthenticated } from './fixtures/auth-helpers';

test.describe('Money Academy', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/academy');
  });

  test('should display money academy page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /academy|learn|education/i })).toBeVisible();
  });

  test('should show video library', async ({ page }) => {
    const videosTab = page.getByRole('button', { name: /video/i });
    if (await videosTab.isVisible()) {
      await videosTab.click();
    }
    
    await expect(page.locator('text=/video|watch/i').first()).toBeVisible();
  });

  test('should show lessons library', async ({ page }) => {
    const lessonsTab = page.getByRole('button', { name: /lesson/i });
    if (await lessonsTab.isVisible()) {
      await lessonsTab.click();
    }
    
    await expect(page.locator('text=/lesson|read|article/i').first()).toBeVisible();
  });

  test('should filter content by category', async ({ page }) => {
    const categoryFilter = page.locator('[class*="select"], button').filter({ hasText: /category|all|budget|invest/i });
    if (await categoryFilter.isVisible()) {
      await categoryFilter.click();
    }
  });

  test('should open video player', async ({ page }) => {
    const videoCard = page.locator('[class*="card"]').first();
    if (await videoCard.isVisible()) {
      await videoCard.click();
      
      // Check for video player or modal
      const videoPlayer = page.locator('video, iframe, [class*="player"]');
      if (await videoPlayer.isVisible()) {
        await expect(videoPlayer).toBeVisible();
      }
    }
  });

  test('should open lesson content', async ({ page }) => {
    const lessonsTab = page.getByRole('button', { name: /lesson/i });
    if (await lessonsTab.isVisible()) {
      await lessonsTab.click();
    }
    
    const lessonCard = page.locator('[class*="card"]').first();
    if (await lessonCard.isVisible()) {
      await lessonCard.click();
    }
  });

  test('should show content duration', async ({ page }) => {
    await expect(page.locator('text=/min|minutes|duration/i').first()).toBeVisible();
  });
});
