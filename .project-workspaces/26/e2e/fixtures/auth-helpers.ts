import { Page, expect } from '@playwright/test';
import { testUser, testKid } from './test-data';

export async function signUp(page: Page, email = testUser.email, password = testUser.password) {
  await page.goto('/signin');
  await page.waitForLoadState('domcontentloaded');
  await page.getByRole('tab', { name: 'Sign Up' }).click();
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).first().fill(password);
  await page.getByRole('button', { name: 'Sign Up', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
}

export async function signIn(page: Page, email = testUser.email, password = testUser.password) {
  console.log(`Attempting sign-in with email: ${email}`);
  
  await page.goto('/signin');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  
  // Fill email field
  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
  await emailInput.fill(email);
  
  // Fill password field - use input type or placeholder
  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);
  
  // Click the Sign In submit button (type="submit", not the tab)
  const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign in/i });
  await submitButton.click();
  
  // Wait a moment for the auth to process
  await page.waitForTimeout(2000);
  
  // Check for error toast or message
  const errorToast = page.locator('[data-sonner-toast][data-type="error"], [role="alert"], .toast-error, text=/invalid|error|incorrect|failed|wrong/i');
  if (await errorToast.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    const errorText = await errorToast.first().textContent().catch(() => 'Unknown error');
    throw new Error(`Sign-in failed: ${errorText}. Email used: ${email}`);
  }
  
  // Wait for navigation to dashboard
  await expect(page).toHaveURL(/dashboard/, { timeout: 20000 });
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: /sign out|logout/i }).click();
  await expect(page).toHaveURL(/signin/, { timeout: 5000 });
}

export async function kidLogin(page: Page, username = testKid.username, password = testKid.password) {
  await page.goto('/kidsbloom/login');
  await page.waitForLoadState('domcontentloaded');
  await page.getByLabel(/username/i).fill(username);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole('button', { name: /sign in|login|enter/i }).click();
  await expect(page).toHaveURL(/kidsbloom\/dashboard/, { timeout: 10000 });
}

export async function ensureAuthenticated(page: Page) {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  
  // Wait a bit for redirect to happen
  await page.waitForTimeout(1000);
  
  // Check if redirected to login page
  if (page.url().includes('/signin') || page.url().includes('/auth')) {
    await signIn(page);
  }
  
  // Verify we're on dashboard
  await page.waitForURL(/dashboard/, { timeout: 20000 });
  
  // Close any modal overlays that might be open
  await dismissModals(page);
}

export async function navigateAuthenticated(page: Page, path: string) {
  // First ensure we're authenticated
  await ensureAuthenticated(page);
  
  // Then navigate to the requested path
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
  await dismissModals(page);
}

export async function dismissModals(page: Page) {
  // Aggressively close any open modals
  try {
    for (let i = 0; i < 5; i++) {
      // Check for open modal overlays
      const overlay = page.locator('[data-state="open"].fixed, [role="dialog"], [role="alertdialog"]');
      const hasOverlay = await overlay.first().isVisible({ timeout: 300 }).catch(() => false);
      
      if (!hasOverlay) break;
      
      // Try clicking any visible close/skip/later buttons
      const dismissButtons = page.locator('button').filter({ 
        hasText: /close|dismiss|skip|later|not now|cancel|maybe later|no thanks/i 
      });
      if (await dismissButtons.first().isVisible({ timeout: 300 }).catch(() => false)) {
        await dismissButtons.first().click({ force: true });
        await page.waitForTimeout(200);
        continue;
      }
      
      // Try X buttons
      const closeX = page.locator('button[aria-label*="close" i], button[aria-label*="dismiss" i], [data-testid*="close"]');
      if (await closeX.first().isVisible({ timeout: 300 }).catch(() => false)) {
        await closeX.first().click({ force: true });
        await page.waitForTimeout(200);
        continue;
      }
      
      // Press Escape as fallback
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    }
  } catch {
    // Ignore errors from modal dismissal
  }
}
