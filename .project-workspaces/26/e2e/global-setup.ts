import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { authenticateAndSeed, SeededData } from './fixtures/test-seeder';

const STORAGE_STATE_PATH = 'e2e/.auth/user.json';
const SEEDED_DATA_PATH = 'e2e/fixtures/seeded-data.json';

async function globalSetup(config: FullConfig) {
  const authDir = path.dirname(STORAGE_STATE_PATH);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { baseURL } = config.projects[0].use;
  const email = process.env.TEST_USER_EMAIL || 'demo@coinsbloom.com';
  const password = process.env.TEST_USER_PASSWORD || '';

  // Step 1: Seed test data via API
  console.log('Global setup: Seeding test data...');
  let seededData: SeededData = { userId: '', goals: [], budgets: [], bills: [], transactions: [], seededSuccessfully: false };

  try {
    seededData = await authenticateAndSeed(email, password);
    fs.writeFileSync(SEEDED_DATA_PATH, JSON.stringify(seededData, null, 2));
    console.log('Global setup: Test data seeded successfully');
  } catch (error) {
    console.warn('Global setup: Data seeding failed:', error);
  }

  // Step 2: Launch browser and authenticate
  let browser;
  let retries = 3;
  
  while (retries > 0) {
    try {
      browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      break;
    } catch (error) {
      retries--;
      if (retries === 0) throw error;
      console.log(`Browser launch failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const context = await browser!.newContext();
  const page = await context.newPage();

  console.log(`Global setup: Logging in as ${email}...`);

  try {
    await page.goto(`${baseURL}/signin`, { timeout: 30000 });
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    await emailInput.fill(email);

    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill(password);

    const submitButton = page.locator('button[type="submit"]').filter({ hasText: /sign in/i });
    await submitButton.click();

    await page.waitForTimeout(2000);
    await page.waitForURL(/dashboard/, { timeout: 30000 });

    console.log('Global setup: Login successful, dismissing modals...');

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    console.log('Global setup: Saving authentication state...');
    await context.storageState({ path: STORAGE_STATE_PATH });
    console.log('Global setup: Complete!');
  } catch (error) {
    console.error('Global setup failed:', error);
    throw error;
  } finally {
    await browser!.close();
  }
}

export default globalSetup;
