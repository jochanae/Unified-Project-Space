import * as fs from 'fs';
import * as path from 'path';
import { SeededData } from './test-seeder';

const SEEDED_DATA_PATH = path.join(__dirname, 'seeded-data.json');

/**
 * Get the seeded test data that was created during global setup.
 * Returns null if seeding was skipped or failed.
 */
export function getSeededTestData(): SeededData | null {
  try {
    if (!fs.existsSync(SEEDED_DATA_PATH)) {
      return null;
    }
    const data = fs.readFileSync(SEEDED_DATA_PATH, 'utf-8');
    const parsed = JSON.parse(data) as SeededData;
    
    // Check if data was actually seeded (userId should be set)
    if (!parsed.userId) {
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.warn('Could not read seeded data:', error);
    return null;
  }
}

/**
 * Check if seeded data is available for rigorous testing
 */
export function hasSeededData(): boolean {
  const data = getSeededTestData();
  return data !== null && data.userId !== '';
}

/**
 * Get a specific seeded goal by title
 */
export function getSeededGoal(title: string) {
  const data = getSeededTestData();
  return data?.goals.find(g => g.title === title) || null;
}

/**
 * Get a specific seeded budget by name
 */
export function getSeededBudget(name: string) {
  const data = getSeededTestData();
  return data?.budgets.find(b => b.name === name) || null;
}

/**
 * Get a specific seeded bill by name
 */
export function getSeededBill(name: string) {
  const data = getSeededTestData();
  return data?.bills.find(b => b.name === name) || null;
}
