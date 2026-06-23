// Category mapping between transaction categories and budget categories
// This enables auto-categorization of transactions to budget envelopes

import type { Database } from "@/integrations/supabase/types";

type BudgetCategory = Database["public"]["Enums"]["budget_category"];

// Map transaction categories (from AddTransactionModal) to budget categories (enum)
const TRANSACTION_TO_BUDGET_MAP: Record<string, BudgetCategory> = {
  // Expense categories
  "food & groceries": "food",
  "food": "food",
  "groceries": "food",
  "dining": "food",
  "food___groceries": "food",
  "housing/rent": "housing",
  "housing": "housing",
  "rent": "housing",
  "insurance": "insurance",
  "credit cards": "debt",
  "credit_cards": "debt",
  "healthcare": "healthcare",
  "transportation": "transportation",
  "utilities": "utilities",
  "entertainment": "entertainment",
  "subscriptions": "entertainment",
  "subscription": "entertainment",
  "shopping": "shopping",
  "education": "education",
  "travel": "travel",
  "personal care": "personal",
  "personal": "personal",
  "debt payments": "debt",
  "debt": "debt",
  "charity": "gifts",
  "gifts": "gifts",
  "savings": "savings",
  "other": "other",
};

// Income categories that should NOT affect budget spending
const INCOME_CATEGORIES = [
  "salary",
  "freelance",
  "investment",
  "rental",
  "gift", // Income gift, not expense gift
  "private equity returns",
  "hedge fund returns",
  "business sale proceeds",
  "capital gains",
  "trust distribution",
  "royalties & licensing",
  "bonus",
  "refund",
  "support/alimony",
];

/**
 * Maps a transaction category to the corresponding budget category
 * Returns null if the category is income or unmappable
 */
export function mapTransactionToBudgetCategory(
  transactionCategory: string | null | undefined,
  transactionType?: string
): BudgetCategory | null {
  if (!transactionCategory) return null;
  
  const normalized = transactionCategory.toLowerCase().trim();
  
  // Skip income transactions - they don't affect budget spending
  if (transactionType === "income") return null;
  if (INCOME_CATEGORIES.includes(normalized)) return null;
  
  // Direct mapping
  if (TRANSACTION_TO_BUDGET_MAP[normalized]) {
    return TRANSACTION_TO_BUDGET_MAP[normalized];
  }
  
  // Partial matching for variations
  for (const [key, value] of Object.entries(TRANSACTION_TO_BUDGET_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }
  
  // Default to "other" for unrecognized expense categories
  return "other";
}

/**
 * Get all valid budget categories for display
 */
export const BUDGET_CATEGORIES: BudgetCategory[] = [
  "housing",
  "transportation",
  "food",
  "utilities",
  "healthcare",
  "insurance",
  "savings",
  "entertainment",
  "shopping",
  "personal",
  "education",
  "debt",
  "gifts",
  "travel",
  "other",
];

/**
 * Normalize transaction category for consistent storage
 * Used when saving transactions from SMS or other sources
 */
export function normalizeTransactionCategory(category: string): string {
  const normalized = category.toLowerCase().trim();
  
  // Try to get the budget category mapping
  const budgetCategory = mapTransactionToBudgetCategory(normalized, "expense");
  
  // Return the mapped budget category or the original (normalized)
  return budgetCategory || normalized;
}
