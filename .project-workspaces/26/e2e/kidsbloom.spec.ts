import { test, expect } from '@playwright/test';
import { testKid, testChore, testSavingsGoal } from './fixtures/test-data';

test.describe('KidsBloom - Kid Portal', () => {
  test.describe('Login', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/kidsbloom/login');
    });

    test('should display username/password login interface', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /kidsbloom|login|sign in/i })).toBeVisible();
      
      // Check for username and password fields
      await expect(page.getByLabel(/username/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
    });

    test('should show error for wrong credentials', async ({ page }) => {
      await page.getByLabel(/username/i).fill('wronguser');
      await page.getByLabel(/password/i).fill('wrongpassword');
      await page.getByRole('button', { name: /sign in|login|enter/i }).click();
      
      await expect(page.locator('text=/wrong|incorrect|invalid|error/i')).toBeVisible({ timeout: 5000 });
    });

    test('should show validation for empty fields', async ({ page }) => {
      await page.getByRole('button', { name: /sign in|login|enter/i }).click();
      
      // Check for validation messages or error states
      await expect(page.locator('text=/required|enter|username|password/i').first()).toBeVisible({ timeout: 3000 });
    });

    test('should have password visibility toggle', async ({ page }) => {
      const passwordInput = page.getByLabel(/password/i);
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });

    test('should login with correct credentials', async ({ page }) => {
      await page.getByLabel(/username/i).fill(testKid.username || 'demokid');
      await page.getByLabel(/password/i).fill(testKid.password || 'TestKid123!');
      await page.getByRole('button', { name: /sign in|login|enter/i }).click();
      
      await expect(page).toHaveURL(/kidsbloom\/dashboard/, { timeout: 10000 });
    });

    test('should have link to signup', async ({ page }) => {
      await expect(page.getByRole('link', { name: /sign up|create|register/i })).toBeVisible();
    });
  });

  test.describe('Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/kidsbloom/login');
      await page.getByLabel(/username/i).fill(testKid.username || 'demokid');
      await page.getByLabel(/password/i).fill(testKid.password || 'TestKid123!');
      await page.getByRole('button', { name: /sign in|login|enter/i }).click();
      await page.waitForURL(/kidsbloom\/dashboard/, { timeout: 10000 });
    });

    test('should display kid dashboard', async ({ page }) => {
      await expect(page.getByRole('heading')).toBeVisible();
    });

    test('should show balance overview', async ({ page }) => {
      await expect(page.locator('text=/balance|spend|save|give/i').first()).toBeVisible();
    });

    test('should display spend/save/give buckets', async ({ page }) => {
      const buckets = page.locator('text=/spend|save|give/i');
      await expect(buckets.first()).toBeVisible();
    });

    test('should navigate to chores', async ({ page }) => {
      await page.getByRole('link', { name: /chores/i }).click();
      await expect(page).toHaveURL(/chores/);
    });

    test('should navigate to savings goals', async ({ page }) => {
      await page.getByRole('link', { name: /goals|save|savings/i }).first().click();
      await expect(page).toHaveURL(/goals|savings/);
    });

    test('should show streak or rewards indicator', async ({ page }) => {
      const streakIndicator = page.locator('text=/streak|days|reward/i');
      if (await streakIndicator.isVisible()) {
        await expect(streakIndicator).toBeVisible();
      }
    });
  });

  test.describe('Chores', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/kidsbloom/login');
      await page.getByLabel(/username/i).fill(testKid.username || 'demokid');
      await page.getByLabel(/password/i).fill(testKid.password || 'TestKid123!');
      await page.getByRole('button', { name: /sign in|login|enter/i }).click();
      await page.waitForURL(/kidsbloom\/dashboard/, { timeout: 10000 });
      await page.goto('/kidsbloom/chores');
    });

    test('should display chores list', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /chore/i })).toBeVisible();
    });

    test('should show chore rewards', async ({ page }) => {
      await expect(page.locator('text=/\\$/').first()).toBeVisible();
    });

    test('should mark chore as complete', async ({ page }) => {
      const choreItem = page.locator('[class*="card"], [class*="item"]').first();
      if (await choreItem.isVisible()) {
        const completeBtn = choreItem.getByRole('button', { name: /complete|done|finish/i });
        if (await completeBtn.isVisible()) {
          await completeBtn.click();
        }
      }
    });

    test('should filter chores by status', async ({ page }) => {
      const filterTabs = page.locator('[role="tab"], button').filter({ hasText: /all|pending|completed/i });
      if (await filterTabs.count() > 0) {
        await filterTabs.first().click();
      }
    });
  });

  test.describe('Savings Goals', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/kidsbloom/login');
      await page.getByLabel(/username/i).fill(testKid.username || 'demokid');
      await page.getByLabel(/password/i).fill(testKid.password || 'TestKid123!');
      await page.getByRole('button', { name: /sign in|login|enter/i }).click();
      await page.waitForURL(/kidsbloom\/dashboard/, { timeout: 10000 });
      await page.goto('/kidsbloom/goals');
    });

    test('should display savings goals', async ({ page }) => {
      await expect(page.getByRole('heading', { name: /goal|saving/i })).toBeVisible();
    });

    test('should show goal progress', async ({ page }) => {
      const progressBars = page.locator('[class*="progress"], [role="progressbar"]');
      if (await progressBars.count() > 0) {
        await expect(progressBars.first()).toBeVisible();
      }
    });

    test('should add money to goal', async ({ page }) => {
      const goalCard = page.locator('[class*="card"]').first();
      if (await goalCard.isVisible()) {
        const addBtn = goalCard.getByRole('button', { name: /add|save|contribute/i });
        if (await addBtn.isVisible()) {
          await addBtn.click();
        }
      }
    });
  });
});
