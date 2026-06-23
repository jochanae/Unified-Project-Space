// Test user credentials - use environment variables in CI
export const testUser = {
  email: process.env.TEST_USER_EMAIL || 'demo@coinsbloom.com',
  // Note: Secret was saved with typo as TEST_USER_PASSWROD
  password: process.env.TEST_USER_PASSWROD || process.env.TEST_USER_PASSWORD || 'TestPassword123!',
  name: 'Test User',
};

export const testKid = {
  username: process.env.TEST_KID_USERNAME || 'demokid',
  password: process.env.TEST_KID_PASSWORD || 'TestKid123!',
  displayName: 'Demo Kid',
};

export const testGoal = {
  title: 'Emergency Fund',
  targetAmount: '5000',
  description: 'Build 3-month emergency fund',
};

export const testBudget = {
  name: 'Groceries',
  amount: '500',
  category: 'food',
};

export const testBill = {
  name: 'Electric Bill',
  amount: '150',
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
};

export const testChore = {
  title: 'Clean Room',
  reward: '5',
  description: 'Make bed and tidy up',
};

export const testSavingsGoal = {
  title: 'New Bike',
  targetAmount: '200',
  description: 'Save for a new mountain bike',
};

export const testTransaction = {
  amount: '50',
  description: 'Grocery shopping',
  category: 'Food & Dining',
};
