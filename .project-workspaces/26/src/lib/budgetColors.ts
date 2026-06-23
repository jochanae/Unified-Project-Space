// Shared budget category colors - used across all budget-related components
// Each category has a distinct color for clear visual differentiation

export const BUDGET_CATEGORY_COLORS: Record<string, string> = {
  housing: "#8B5CF6",        // Purple
  transportation: "#3B82F6", // Blue
  food: "#10B981",           // Emerald
  utilities: "#F59E0B",      // Amber
  healthcare: "#F43F5E",     // Rose (changed from red to distinguish from debt)
  insurance: "#6366F1",      // Indigo
  savings: "#22C55E",        // Green
  entertainment: "#EC4899",  // Pink
  shopping: "#F97316",       // Orange
  personal: "#14B8A6",       // Teal
  education: "#A855F7",      // Violet (fixed - was same as housing)
  debt: "#DC2626",           // Dark Red
  gifts: "#D946EF",          // Fuchsia
  travel: "#06B6D4",         // Cyan
  business: "#0EA5E9",       // Sky Blue
  other: "#6B7280",          // Gray
};

export const BUDGET_CATEGORY_EMOJIS: Record<string, string> = {
  housing: "🏠",
  transportation: "🚗",
  food: "🍔",
  utilities: "💡",
  healthcare: "🏥",
  insurance: "🛡️",
  savings: "💰",
  entertainment: "🎬",
  shopping: "🛍️",
  personal: "💅",
  education: "📚",
  debt: "💳",
  gifts: "🎁",
  travel: "✈️",
  business: "💼",
  other: "📦",
};

// Helper function to get color with fallback
export const getBudgetCategoryColor = (category: string): string => {
  return BUDGET_CATEGORY_COLORS[category] || BUDGET_CATEGORY_COLORS.other;
};

// Helper function to get emoji with fallback
export const getBudgetCategoryEmoji = (category: string): string => {
  return BUDGET_CATEGORY_EMOJIS[category] || BUDGET_CATEGORY_EMOJIS.other;
};
