import { test, expect } from '@playwright/test';
import { navigateAuthenticated } from './fixtures/auth-helpers';

test.describe('Debt Management', () => {
  test.beforeEach(async ({ page }) => {
    await navigateAuthenticated(page, '/debts');
  });

  test('should display debts page', async ({ page }) => {
    await expect(page.getByText('Debt Management').first()).toBeVisible();
  });

  test('should show add debt button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /add debt/i })).toBeVisible();
  });

  test('should show import account button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /import account/i })).toBeVisible();
  });

  test('should show snowball strategy button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /snowball/i })).toBeVisible();
  });

  test('should show avalanche strategy button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /avalanche/i })).toBeVisible();
  });

  test('should show debt tabs', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /active/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /all debts/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /paid off/i })).toBeVisible();
  });

  test('should show debt payoff section', async ({ page }) => {
    await expect(page.getByText('Debt Payoff').first()).toBeVisible();
  });

  test('should show payoff progress section', async ({ page }) => {
    await expect(page.getByText('Payoff Progress').first()).toBeVisible();
  });

  test('should show interest savings section', async ({ page }) => {
    await expect(page.getByText('Interest Savings Opportunity').first()).toBeVisible();
  });

  test('should show DTI calculator button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /dti calc/i })).toBeVisible();
  });

  test('should click snowball strategy', async ({ page }) => {
    await page.getByRole('button', { name: /snowball/i }).click();
    await page.waitForTimeout(500);
  });

  test('should click avalanche strategy', async ({ page }) => {
    await page.getByRole('button', { name: /avalanche/i }).click();
    await page.waitForTimeout(500);
  });
});
