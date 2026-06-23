export interface BetaTestStep {
  name: string;
  description: string;
  category: string;
  tier: 'free' | 'pro';
}

export const betaTestSteps: BetaTestStep[] = [
  // ── Navigation & UI ───────────────────────────
  { category: 'Navigation & UI', tier: 'free', name: 'Landing Page', description: 'Verify the landing page loads correctly with all sections visible' },
  { category: 'Navigation & UI', tier: 'free', name: 'Login / Signup', description: 'Test creating an account and logging in/out' },
  { category: 'Navigation & UI', tier: 'free', name: 'Sidebar Navigation', description: 'Open the sidebar and navigate to each page' },
  { category: 'Navigation & UI', tier: 'free', name: 'Header Toolbar', description: 'Expand the header toolbar and verify all shortcuts work' },
  { category: 'Navigation & UI', tier: 'free', name: 'Theme Toggle', description: 'Switch between light and dark mode' },
  { category: 'Navigation & UI', tier: 'free', name: 'Mobile Responsiveness', description: 'Test the app on a mobile device or narrow browser window' },
  { category: 'Navigation & UI', tier: 'free', name: 'Footer Shortcuts', description: 'Verify footer shortcuts are visible and functional' },

  // ── Dashboard ─────────────────────────────────
  { category: 'Dashboard', tier: 'free', name: 'Dashboard Load', description: 'Verify the dashboard loads with greeting, widgets, and cards' },
  { category: 'Dashboard', tier: 'free', name: 'Widget Reordering', description: 'Drag and reorder dashboard widgets' },
  { category: 'Dashboard', tier: 'free', name: 'Search Bar', description: 'Use the dashboard search bar to find content' },
  { category: 'Dashboard', tier: 'free', name: 'Economic Calendar', description: 'Check if the economic calendar widget displays events' },

  // ── Quinn AI Mentor ───────────────────────────
  { category: 'Quinn AI Mentor', tier: 'free', name: 'Quinn Chat', description: 'Open Quinn and send a message, verify a response is received' },
  { category: 'Quinn AI Mentor', tier: 'free', name: 'Quinn Topics Menu', description: 'Open the topics menu and select a topic' },
  { category: 'Quinn AI Mentor', tier: 'free', name: 'Quinn History', description: 'Check conversation history loads previous chats' },
  { category: 'Quinn AI Mentor', tier: 'free', name: 'Quinn FAB', description: 'Verify the floating action button appears on other pages' },
  { category: 'Quinn AI Mentor', tier: 'pro', name: 'Quinn Voice Input', description: 'Test voice input for sending messages to Quinn' },
  { category: 'Quinn AI Mentor', tier: 'pro', name: 'Quinn Text-to-Speech', description: 'Test TTS playback of Quinn responses' },

  // ── Trade Journal ─────────────────────────────
  { category: 'Trade Journal', tier: 'free', name: 'Add Trade Manually', description: 'Add a new trade entry with all fields filled' },
  { category: 'Trade Journal', tier: 'free', name: 'Edit / Delete Trade', description: 'Edit an existing trade and delete one' },
  { category: 'Trade Journal', tier: 'free', name: 'Trade Statistics', description: 'Verify trade stats (win rate, P&L) update correctly' },
  { category: 'Trade Journal', tier: 'free', name: 'Import Trades (CSV)', description: 'Import trades using a CSV file' },
  { category: 'Trade Journal', tier: 'free', name: 'Trade Table Sorting', description: 'Sort the trade table by different columns' },
  { category: 'Trade Journal', tier: 'pro', name: 'Quinn Journal Sidebar', description: 'Open Quinn sidebar from journal for trade analysis' },
  { category: 'Trade Journal', tier: 'pro', name: 'Screenshot Upload', description: 'Upload a chart screenshot to a trade entry' },

  // ── Paper Trading ─────────────────────────────
  { category: 'Paper Trading', tier: 'free', name: 'Paper Portfolio', description: 'Verify paper trading portfolio loads with balance' },
  { category: 'Paper Trading', tier: 'free', name: 'Place Paper Trade', description: 'Open a new paper trade position' },
  { category: 'Paper Trading', tier: 'free', name: 'Close Paper Trade', description: 'Close an open paper trade and verify P&L' },
  { category: 'Paper Trading', tier: 'free', name: 'Symbol Search', description: 'Search for a stock symbol in paper trading' },
  { category: 'Paper Trading', tier: 'pro', name: 'Strategy Backtester', description: 'Run a strategy backtest and view results' },
  { category: 'Paper Trading', tier: 'pro', name: 'Options Chain', description: 'View and interact with the options chain' },

  // ── Financial Plan ────────────────────────────
  { category: 'Financial Plan', tier: 'free', name: 'View Plans', description: 'Verify plan page loads with default plans and sections' },
  { category: 'Financial Plan', tier: 'free', name: 'Add Plan Item', description: 'Add a new item to a plan section' },
  { category: 'Financial Plan', tier: 'free', name: 'Edit Plan Item', description: 'Edit an existing plan item status/priority' },
  { category: 'Financial Plan', tier: 'free', name: 'Import Plan CSV', description: 'Import plan items from a CSV template' },
  { category: 'Financial Plan', tier: 'free', name: 'Plan Statistics', description: 'Verify plan stats card shows correct progress' },

  // ── My Finances ───────────────────────────────
  { category: 'My Finances', tier: 'free', name: 'Budget Planner', description: 'Add income and expense entries to the budget' },
  { category: 'My Finances', tier: 'free', name: 'Bills Tracker', description: 'Add a bill and mark it as paid' },
  { category: 'My Finances', tier: 'free', name: 'Savings Goals', description: 'Create a savings goal and update progress' },
  { category: 'My Finances', tier: 'free', name: 'Net Worth Tracker', description: 'Add assets and liabilities to net worth' },
  { category: 'My Finances', tier: 'free', name: 'Finance Import/Export', description: 'Test importing and exporting finance data' },

  // ── Learning Hub ──────────────────────────────
  { category: 'Learning Hub', tier: 'free', name: 'Lessons Page', description: 'Browse and open a lesson' },
  { category: 'Learning Hub', tier: 'free', name: 'Videos Page', description: 'Watch an educational video' },
  { category: 'Learning Hub', tier: 'free', name: 'Resources Page', description: 'Browse educational resources' },
  { category: 'Learning Hub', tier: 'free', name: 'Glossary', description: 'Search and browse trading glossary terms' },
  { category: 'Learning Hub', tier: 'free', name: 'Strategies', description: 'View strategy cards and payoff charts' },
  { category: 'Learning Hub', tier: 'free', name: 'Interactive Learning', description: 'Try an interactive learning exercise' },

  // ── Community ─────────────────────────────────
  { category: 'Community', tier: 'free', name: 'Discussion Threads', description: 'View and create a discussion thread' },
  { category: 'Community', tier: 'free', name: 'Reply to Thread', description: 'Post a reply to a discussion' },
  { category: 'Community', tier: 'free', name: 'Trade Ideas', description: 'View and create a trade idea' },
  { category: 'Community', tier: 'free', name: 'Live Chat', description: 'Send a message in live chat' },

  // ── Trading Tools ─────────────────────────────
  { category: 'Trading Tools', tier: 'free', name: 'Calculator', description: 'Open and use the simple calculator' },
  { category: 'Trading Tools', tier: 'free', name: 'Position Size Calculator', description: 'Calculate a position size' },
  { category: 'Trading Tools', tier: 'free', name: 'Risk/Reward Calculator', description: 'Calculate risk/reward ratio' },
  { category: 'Trading Tools', tier: 'free', name: 'Margin Calculator', description: 'Calculate margin requirements' },
  { category: 'Trading Tools', tier: 'free', name: 'Compound Calculator', description: 'Calculate compound interest' },
  { category: 'Trading Tools', tier: 'free', name: 'Options Calculator', description: 'Use the options pricing calculator' },
  { category: 'Trading Tools', tier: 'free', name: 'Notepad', description: 'Create and save a note' },

  // ── Import / Export ───────────────────────────
  { category: 'Import / Export', tier: 'free', name: 'Import Modal', description: 'Open the import modal from the header toolbar' },
  { category: 'Import / Export', tier: 'free', name: 'Download Templates', description: 'Download CSV templates from the import modal' },
  { category: 'Import / Export', tier: 'free', name: 'Export Data', description: 'Export journal or analytics data' },

  // ── Settings & Account ────────────────────────
  { category: 'Settings & Account', tier: 'free', name: 'Settings Page', description: 'Navigate to settings and verify all sections load' },
  { category: 'Settings & Account', tier: 'free', name: 'Profile Edit', description: 'Update display name or avatar' },
  { category: 'Settings & Account', tier: 'free', name: 'Notifications', description: 'Check notification bell and notification list' },
  { category: 'Settings & Account', tier: 'free', name: 'Reminders', description: 'Create and manage a reminder' },

  // ── Pro Features ──────────────────────────────
  { category: 'Pro Features', tier: 'pro', name: 'Analytics Dashboard', description: 'View advanced analytics and charts' },
  { category: 'Pro Features', tier: 'pro', name: 'Youth Mode', description: 'Enter Youth Mode and test the youth-friendly interface' },
  { category: 'Pro Features', tier: 'pro', name: 'Price Alerts', description: 'Set up a price alert for a symbol' },
];

export const betaTestCategories = [...new Set(betaTestSteps.map(s => s.category))];
