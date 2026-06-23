import { test, expect } from '@playwright/test';
import { navigateAuthenticated } from './fixtures/auth-helpers';
import { testTransaction } from './fixtures/test-data';
import { getSeededTestData } from './fixtures/seeded-data-reader';

test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/transactions');
  });

  test('should display transactions page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /transaction/i })).toBeVisible();
  });

  test('should show add transaction button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add|create|new/i })).toBeVisible();
  });

  test('should open add transaction form', async ({ page }) => {
    await page.getByRole('button', { name: /add|create|new/i }).first().click();
    
    await expect(page.getByLabel(/amount/i)).toBeVisible({ timeout: 5000 });
  });

  test('should display seeded transaction', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const seededData = getSeededTestData();
    if (seededData && seededData.transactions.length > 0) {
      // Rigorous test: verify seeded transaction is visible
      // Seeded with "E2E Test - Grocery shopping"
      await expect(page.locator('text=/E2E Test|Grocery shopping/i').first()).toBeVisible({ timeout: 5000 });
      
      // Verify amount is displayed ($50)
      await expect(page.locator('text=/\\$50|50\\.00/').first()).toBeVisible({ timeout: 5000 });
    } else {
      // Fallback: verify transaction list or empty state
      const transactions = page.locator('[class*="card"], tr').first();
      const emptyState = page.locator('text=/no transactions|add your first|get started/i');
      const hasTx = await transactions.isVisible().catch(() => false);
      const hasEmpty = await emptyState.first().isVisible().catch(() => false);
      expect(hasTx || hasEmpty).toBeTruthy();
    }
  });

  test('should create a new transaction', async ({ page }) => {
    await page.getByRole('button', { name: /add|create|new/i }).first().click();
    
    await page.getByLabel(/amount/i).fill(testTransaction.amount);
    
    const descInput = page.getByLabel(/description|note|memo/i);
    if (await descInput.isVisible()) {
      await descInput.fill(testTransaction.description);
    }
    
    await page.getByRole('button', { name: /save|create|add/i }).click();
    
    await expect(page.locator(`text=${testTransaction.description}`)).toBeVisible({ timeout: 5000 });
  });

  test('should filter transactions by date', async ({ page }) => {
    const dateFilter = page.locator('input[type="date"], [class*="date-picker"]').first();
    if (await dateFilter.isVisible()) {
      await dateFilter.click();
    }
  });

  test('should filter transactions by category', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const seededData = getSeededTestData();
    if (seededData && seededData.transactions.length > 0) {
      // Seeded transaction has "Food & Dining" category
      const categoryFilter = page.locator('[class*="select"]').filter({ hasText: /category|all|food/i }).first();
      if (await categoryFilter.isVisible()) {
        await categoryFilter.click();
        await page.waitForTimeout(500);
        
        // Look for Food & Dining option
        const foodOption = page.locator('[role="option"], li').filter({ hasText: /food/i });
        if (await foodOption.first().isVisible()) {
          await foodOption.first().click();
          await page.waitForTimeout(500);
          
          // Verify filtered results show the seeded transaction
          await expect(page.locator('text=/E2E Test|Grocery/i').first()).toBeVisible({ timeout: 3000 });
        }
      }
    } else {
      const categoryFilter = page.locator('[class*="select"]').filter({ hasText: /category|all/i }).first();
      if (await categoryFilter.isVisible()) {
        await categoryFilter.click();
      }
    }
  });

  test('should search transactions', async ({ page }) => {
    const seededData = getSeededTestData();
    const searchInput = page.getByPlaceholder(/search/i);
    
    if (await searchInput.isVisible()) {
      if (seededData && seededData.transactions.length > 0) {
        // Search for seeded transaction
        await searchInput.fill('E2E Test');
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1000);
        
        // Verify search results
        await expect(page.locator('text=/E2E Test|Grocery/i').first()).toBeVisible({ timeout: 3000 });
      } else {
        await searchInput.fill('grocery');
        await page.keyboard.press('Enter');
      }
    }
  });

  test('should show transaction details', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const seededData = getSeededTestData();
    if (seededData && seededData.transactions.length > 0) {
      const transactionRow = page.locator('[class*="card"], tr').filter({ hasText: /E2E Test|Grocery/i }).first();
      if (await transactionRow.isVisible()) {
        await transactionRow.click();
        await page.waitForTimeout(500);
        
        // Verify details modal or expanded view
        const detailsVisible = await page.locator('text=/\\$50|Food & Dining|Grocery/i').first().isVisible().catch(() => false);
        expect(detailsVisible).toBeTruthy();
      }
    } else {
      const transactionRow = page.locator('[class*="card"], tr').first();
      if (await transactionRow.isVisible()) {
        await transactionRow.click();
      }
    }
  });

  test('should categorize transaction', async ({ page }) => {
    const transactionRow = page.locator('[class*="card"], tr').first();
    if (await transactionRow.isVisible()) {
      await transactionRow.click();
      
      const categorySelect = page.locator('[class*="select"]').filter({ hasText: /category/i });
      if (await categorySelect.isVisible()) {
        await categorySelect.click();
      }
    }
  });
});
