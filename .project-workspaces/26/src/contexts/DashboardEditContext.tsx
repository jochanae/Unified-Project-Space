import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface CardInfo {
  id: string;
  title: string;
  description: string;
}

// Card descriptions for the info modal
export const CARD_DESCRIPTIONS: Record<string, string> = {
  professionals: "Connect with financial advisors, tax professionals, and other experts to get personalized guidance.",
  quickActions: "Quick access to common actions like adding transactions, paying bills, and transferring money.",
  financialOverview: "A comprehensive view of your financial health including income, expenses, and net worth trends.",
  budgets: "Track your spending against budgets you've set for different categories.",
  expenses: "View and categorize your recent transactions and spending patterns.",
  savings: "Monitor your progress towards savings goals and milestones.",
  bills: "Stay on top of upcoming bills and never miss a payment.",
  insights: "AI-powered insights and recommendations to improve your finances.",
  aiCoach: "Chat with Bloom for personalized financial advice and guidance.",
  bloomBursts: "Quick tips and educational content to boost your financial knowledge.",
  investments: "Track your investment portfolio performance and allocations.",
  tax: "Optimize your tax situation and track deductions throughout the year.",
  smsTracker: "Automatically track expenses from SMS notifications from your bank.",
  myKids: "Manage allowances and teach kids about money management.",
  news: "Stay informed with the latest financial news and market updates.",
  currency: "Track and convert between different currencies.",
};

interface DashboardEditContextType {
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  hiddenCards: string[];
  hideCard: (cardId: string) => void;
  showCard: (cardId: string) => void;
  showAllCards: () => void;
  getCardDescription: (cardId: string) => string;
}

const DashboardEditContext = createContext<DashboardEditContextType | undefined>(undefined);

const HIDDEN_CARDS_KEY = "coinsbloom_hidden_cards";

export function DashboardEditProvider({ children }: { children: ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [hiddenCards, setHiddenCards] = useState<string[]>([]);

  // Load hidden cards from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(HIDDEN_CARDS_KEY);
    if (saved) {
      try {
        setHiddenCards(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse hidden cards", e);
      }
    }
  }, []);

  // Listen for enable edit mode event from welcome checklist
  useEffect(() => {
    const handleEnableEditMode = () => {
      setIsEditMode(true);
    };
    
    window.addEventListener('coinsbloom_enable_edit_mode', handleEnableEditMode);
    return () => window.removeEventListener('coinsbloom_enable_edit_mode', handleEnableEditMode);
  }, []);

  // Save to localStorage whenever hiddenCards changes
  useEffect(() => {
    localStorage.setItem(HIDDEN_CARDS_KEY, JSON.stringify(hiddenCards));
  }, [hiddenCards]);

  const hideCard = (cardId: string) => {
    setHiddenCards((prev) => [...prev, cardId]);
  };

  const showCard = (cardId: string) => {
    setHiddenCards((prev) => prev.filter((id) => id !== cardId));
  };

  const showAllCards = () => {
    setHiddenCards([]);
  };

  const getCardDescription = (cardId: string) => {
    return CARD_DESCRIPTIONS[cardId] || "This card provides useful information for your dashboard.";
  };

  return (
    <DashboardEditContext.Provider
      value={{
        isEditMode,
        setIsEditMode,
        hiddenCards,
        hideCard,
        showCard,
        showAllCards,
        getCardDescription,
      }}
    >
      {children}
    </DashboardEditContext.Provider>
  );
}

export function useDashboardEdit() {
  const context = useContext(DashboardEditContext);
  if (context === undefined) {
    throw new Error("useDashboardEdit must be used within a DashboardEditProvider");
  }
  return context;
}