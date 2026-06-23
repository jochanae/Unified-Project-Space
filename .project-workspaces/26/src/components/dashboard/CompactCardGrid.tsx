import { useState, useEffect } from "react";
import {
  BarChart3,
  Zap,
  Activity,
  Target,
  PieChart,
  Sparkles,
  Receipt,
  Lightbulb,
  TrendingUp,
  Calendar,
  Users,
  Globe,
  LucideIcon,
  Brain,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  Newspaper,
  CalendarClock,
  Bell,
} from "lucide-react";
import { CompactCard } from "./CompactCard";
import { useDashboardEdit } from "@/contexts/DashboardEditContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";

// Card content components
import { FinancialHealthAlertContent } from "./cards/FinancialHealthAlertContent";
import { BalanceCardContent } from "./cards/BalanceCardContent";
import { LiveLearnCardContent } from "./cards/LiveLearnCardContent";
import { QuickActionsCardContent, QuickActionsExpandedContent } from "./cards/QuickActionsCardContent";
import { FinancialOverviewContent } from "./cards/FinancialOverviewContent";

import { ExpensesCardContent } from "./cards/ExpensesCardContent";
import { SavingsCardContent } from "./cards/SavingsCardContent";
import { BillsCardContent } from "./cards/BillsCardContent";
import { InsightsCardContent } from "./cards/InsightsCardContent";
import { AICoachCardContent } from "./cards/AICoachCardContent";
import { BloomBurstsCardContent } from "./cards/BloomBurstsCardContent";
import { InvestmentsCardContent, InvestmentsCardExpandedContent } from "./cards/InvestmentsCardContent";
import { TaxCardContent, TaxCardExpandedContent } from "./cards/TaxCardContent";
import { SMSTrackerCardContent } from "./cards/SMSTrackerCardContent";
import { MyKidsCardContent } from "./cards/MyKidsCardContent";
import { FinancialToolsCardContent, FinancialToolsExpandedContent } from "./cards/FinancialToolsCardContent";
import { WatchlistCardContent } from "./cards/WatchlistCardContent";
import { MarketNewsCardContent } from "./cards/MarketNewsCardContent";
import { EconomicCalendarCardContent } from "./cards/EconomicCalendarCardContent";
import { PriceAlertsCardContent } from "./cards/PriceAlertsCardContent";

interface CardConfig {
  id: string;
  title: string;
  icon: LucideIcon;
  hasNavigation: boolean;
  navigationRoute?: string;
  badge?: string;
  badgeVariant?: "default" | "premium" | "critical" | "success" | "score";
  badgeIcon?: "sparkles";
  colorVariant?: "blue" | "purple" | "green" | "amber" | "pink" | "teal" | "slate" | "rose" | "indigo" | "emerald";
  content: React.ReactNode;
  expandedContent?: React.ReactNode;
  expandMode?: "height" | "sheet";
}

const CARD_CONFIGS: CardConfig[] = [
  {
    id: "quickActions",
    title: "Quick Actions",
    icon: Zap,
    hasNavigation: false,
    colorVariant: "amber",
    content: <QuickActionsCardContent />,
    expandedContent: <QuickActionsExpandedContent />,
    expandMode: "sheet",
  },
  {
    id: "financialOverview",
    title: "Financial Overview",
    icon: BarChart3,
    hasNavigation: true,
    navigationRoute: "/reports",
    colorVariant: "blue",
    content: <FinancialOverviewContent />,
    expandedContent: <FinancialOverviewContent />,
    expandMode: "sheet",
  },
  {
    id: "expenses",
    title: "Spending & Transactions",
    icon: Activity,
    hasNavigation: true,
    navigationRoute: "/transactions",
    colorVariant: "rose",
    content: <ExpensesCardContent />,
    expandedContent: <ExpensesCardContent />,
    expandMode: "sheet",
  },
  {
    id: "savings",
    title: "Goals",
    icon: Target,
    hasNavigation: true,
    navigationRoute: "/goals",
    colorVariant: "emerald",
    content: <SavingsCardContent />,
    expandedContent: <SavingsCardContent />,
    expandMode: "sheet",
  },
  {
    id: "bills",
    title: "Upcoming Bills",
    icon: Calendar,
    hasNavigation: true,
    navigationRoute: "/bills",
    colorVariant: "teal",
    content: <BillsCardContent />,
    expandedContent: <BillsCardContent />,
    expandMode: "sheet",
  },
  {
    id: "insights",
    title: "Smart Insights",
    icon: Lightbulb,
    hasNavigation: true,
    navigationRoute: "/dashboard",
    badge: "1 critical",
    badgeVariant: "critical",
    colorVariant: "amber",
    content: <InsightsCardContent />,
    expandedContent: <InsightsCardContent />,
    expandMode: "sheet",
  },
  {
    id: "aiCoach",
    title: "Bloom | Financial Architect",
    icon: Sparkles,
    hasNavigation: false,
    badge: "Premium",
    badgeVariant: "premium",
    colorVariant: "indigo",
    content: <AICoachCardContent />,
    expandedContent: <AICoachCardContent />,
    expandMode: "sheet",
  },
  {
    id: "bloomBursts",
    title: "Bloom Bursts",
    icon: Sparkles,
    hasNavigation: true,
    navigationRoute: "/budgets",
    colorVariant: "pink",
    content: <BloomBurstsCardContent />,
    expandedContent: <BloomBurstsCardContent />,
    expandMode: "sheet",
  },
  {
    id: "investments",
    title: "Investment Portfolio",
    icon: TrendingUp,
    hasNavigation: true,
    navigationRoute: "/accounts",
    colorVariant: "blue",
    content: <InvestmentsCardContent />,
    expandMode: "sheet",
    expandedContent: <InvestmentsCardExpandedContent />,
  },
  {
    id: "watchlist",
    title: "Market Watchlist",
    icon: Activity,
    hasNavigation: false,
    colorVariant: "blue",
    content: <WatchlistCardContent />,
    expandedContent: <WatchlistCardContent />,
    expandMode: "sheet",
  },
  {
    id: "marketNews",
    title: "Market News",
    icon: Newspaper,
    hasNavigation: false,
    colorVariant: "indigo",
    content: <MarketNewsCardContent />,
    expandedContent: <MarketNewsCardContent />,
    expandMode: "sheet",
  },
  {
    id: "economicCalendar",
    title: "Economic Calendar",
    icon: CalendarClock,
    hasNavigation: false,
    colorVariant: "teal",
    content: <EconomicCalendarCardContent />,
    expandedContent: <EconomicCalendarCardContent />,
    expandMode: "sheet",
  },
  {
    id: "priceAlerts",
    title: "Price Alerts",
    icon: Bell,
    hasNavigation: false,
    colorVariant: "amber",
    content: <PriceAlertsCardContent />,
    expandedContent: <PriceAlertsCardContent />,
    expandMode: "sheet",
  },
  {
    id: "tax",
    title: "Tax Optimizer",
    icon: Brain,
    hasNavigation: true,
    navigationRoute: "/advanced",
    badge: "0%",
    badgeVariant: "score",
    badgeIcon: "sparkles",
    colorVariant: "purple",
    content: <TaxCardContent />,
    expandMode: "sheet",
    expandedContent: <TaxCardExpandedContent />,
  },
  {
    id: "smsTracker",
    title: "SMS Tracker",
    icon: Receipt,
    hasNavigation: false,
    badge: "Unlimited",
    badgeVariant: "premium",
    colorVariant: "purple",
    content: <SMSTrackerCardContent />,
    expandedContent: <SMSTrackerCardContent isExpanded />,
    expandMode: "sheet",
  },
  {
    id: "myKids",
    title: "My Kids",
    icon: Users,
    hasNavigation: true,
    navigationRoute: "/kids",
    badge: "Premium",
    badgeVariant: "premium",
    colorVariant: "pink",
    content: <MyKidsCardContent />,
    expandedContent: <MyKidsCardContent />,
    expandMode: "sheet",
  },
  {
    id: "financialTools",
    title: "Financial Tools",
    icon: Globe,
    hasNavigation: false,
    colorVariant: "slate",
    content: <FinancialToolsCardContent />,
    expandedContent: <FinancialToolsExpandedContent />,
    expandMode: "sheet",
  },
];

export { CARD_CONFIGS };

const COLLAPSED_KEY = "coinsbloom_cards_collapsed";
const EXPAND_HINT_KEY = "coinsbloom_expand_hint_dismissed";

export const CompactCardGrid = () => {
  const { hiddenCards, isEditMode } = useDashboardEdit();
  const { isFeatureEnabled } = useFeatureFlags();
  
  // Default to collapsed (true) for ALL users - cards should be collapsed by default
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(COLLAPSED_KEY);
    // Default to collapsed (true) unless explicitly set to "false"
    return saved !== "false";
  });
  
  // First-time hint state
  const [showExpandHint, setShowExpandHint] = useState(() => {
    return !localStorage.getItem(EXPAND_HINT_KEY);
  });

  // Persist collapse state
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(isCollapsed));
  }, [isCollapsed]);

  // Track if we auto-expanded for edit mode
  const [autoExpandedForEdit, setAutoExpandedForEdit] = useState(false);

  // Auto-expand when edit mode is enabled, collapse when exiting
  useEffect(() => {
    if (isEditMode && isCollapsed) {
      setIsCollapsed(false);
      setAutoExpandedForEdit(true);
    } else if (!isEditMode && autoExpandedForEdit) {
      setIsCollapsed(true);
      setAutoExpandedForEdit(false);
    }
  }, [isEditMode]);

  // Show hint after a brief delay on first visit
  const [hintVisible, setHintVisible] = useState(false);
  useEffect(() => {
    if (showExpandHint && isCollapsed) {
      const timer = setTimeout(() => setHintVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [showExpandHint, isCollapsed]);

  const dismissHint = () => {
    setHintVisible(false);
    setShowExpandHint(false);
    localStorage.setItem(EXPAND_HINT_KEY, "true");
  };

  const handleToggle = () => {
    if (showExpandHint) {
      dismissHint();
    }
    setIsCollapsed(!isCollapsed);
  };

  // Filter out hidden cards and feature-flagged cards (but show all in edit mode)
  const visibleCards = isEditMode
    ? CARD_CONFIGS
    : CARD_CONFIGS.filter((card) => {
        if (hiddenCards.includes(card.id)) return false;
        if (card.id === "bloomBursts" && !isFeatureEnabled("bloom_bursts")) return false;
        return true;
      });

  return (
    <div className="pb-6">
      {/* Toggle Header */}
      <div className="relative">
        <Button
          variant="ghost"
          onClick={handleToggle}
          className="w-full flex items-center justify-between py-3 px-4 mb-3 bg-card/50 backdrop-blur-sm border border-border/50 rounded-lg hover:bg-card/80 transition-all"
        >
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <LayoutGrid className="h-4 w-4 text-primary" />
            <span>Dashboard Cards</span>
            <span className="text-muted-foreground text-xs">({visibleCards.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-primary/70 font-medium">
              {isCollapsed ? "Tap to expand" : "Tap to collapse"}
            </span>
            <div className="h-7 w-7 rounded-full border-2 border-primary/40 flex items-center justify-center bg-primary/10">
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4 text-primary" />
              ) : (
                <ChevronUp className="h-4 w-4 text-primary" />
              )}
            </div>
          </div>
        </Button>
        
        {/* First-time tooltip hint */}
        {hintVisible && (
          <div 
            className="absolute right-2 top-full -mt-1 z-50 animate-fade-in"
            onClick={(e) => {
              e.stopPropagation();
              dismissHint();
            }}
          >
            <div className="relative bg-primary text-primary-foreground text-xs px-3 py-2 rounded-lg shadow-lg max-w-[200px]">
              <div className="absolute -top-1.5 right-6 w-3 h-3 bg-primary rotate-45" />
              <p className="font-medium mb-0.5">More cards available!</p>
              <p className="text-primary-foreground/80 text-[10px]">Tap here to see all your dashboard cards</p>
              <button 
                className="absolute top-1 right-1 p-0.5 hover:bg-primary-foreground/20 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissHint();
                }}
              >
                <span className="sr-only">Dismiss</span>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Grid */}
      <div
        className={cn(
          "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 lg:gap-3 auto-rows-[180px] transition-all duration-300 overflow-hidden",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-[5000px] opacity-100"
        )}
      >
        {visibleCards.map((card) => (
          <CompactCard
            key={card.id}
            id={card.id}
            title={card.title}
            icon={card.icon}
            hasNavigation={card.hasNavigation}
            navigationRoute={card.navigationRoute}
            badge={card.badge}
            badgeVariant={card.badgeVariant}
            badgeIcon={card.badgeIcon}
            colorVariant={card.colorVariant}
            expandedContent={card.expandedContent}
            expandMode={card.expandMode}
          >
            {card.content}
          </CompactCard>
        ))}
      </div>
    </div>
  );
};