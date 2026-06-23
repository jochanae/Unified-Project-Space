import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTrades } from "@/hooks/useTrades";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { ReminderWidget } from "@/components/reminders/ReminderWidget";
import { FinancialHealthWidget } from "@/components/dashboard/FinancialHealthWidget";
import { ReferralWidget } from "@/components/referral/ReferralWidget";
import { LiveWatchlist } from "@/components/dashboard/LiveWatchlist";
import { PriceAlertsWidget } from "@/components/dashboard/PriceAlertsWidget";
import { EconomicCalendar } from "@/components/dashboard/EconomicCalendar";
import { TradeChecklist } from "@/components/dashboard/TradeChecklist";
import { PatternRecognition } from "@/components/dashboard/PatternRecognition";
import { MarketNews } from "@/components/dashboard/MarketNews";
import { RecentTradesWidget } from "@/components/dashboard/RecentTradesWidget";
import { QuinnInsightsWidget } from "@/components/dashboard/QuinnInsightsWidget";
import { QuinnIcon } from "@/components/icons/QuinnIcon";
import { useAuth } from "@/contexts/AuthContext";
import { FloatingElements } from "@/components/decorations/FloatingElements";
import { TimeGreeting } from "@/components/dashboard/TimeGreeting";
import { WaveTrendCard } from "@/components/dashboard/WaveTrendCard";
import { LiveLearnCarousel } from "@/components/dashboard/LiveLearnCarousel";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { FeatureGate } from "@/components/subscription/FeatureGate";
import { DashboardSearchBar } from "@/components/dashboard/DashboardSearchBar";
import { DashboardCalendarWidget } from "@/components/dashboard/DashboardCalendarWidget";
import { CalendarModal } from "@/components/calendar/CalendarModal";
import { DashboardWidgetGrid } from "@/components/dashboard/DashboardWidgetGrid";
import { ProFinanceSummary } from "@/components/dashboard/ProFinanceSummary";
import {
  BookOpen,
  Target,
  BarChart3,
  RefreshCw,
  Settings,
  Landmark,
  PiggyBank,
  Sparkles,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getGreetingName } from "@/lib/nameUtils";

const quickActions = [
  {
    title: "Ask Quinn",
    description: "Your smart money mentor",
    icon: null,
    href: "/mentor",
    color: "from-primary to-primary/60",
    isQuinn: true,
  },
  {
    title: "My Plans",
    description: "Money & trading goals",
    icon: Target,
    href: "/plan",
    color: "from-gold to-gold/60",
  },
  {
    title: "Retirement & Wealth",
    description: "Plan your future",
    icon: Landmark,
    href: "/mentor",
    color: "from-chart-3 to-chart-3/60",
  },
  {
    title: "Trade Journal",
    description: "Log your trades",
    icon: BookOpen,
    href: "/journal",
    color: "from-gain to-gain/60",
  },
  {
    title: "Youth Mode",
    description: "Learn & practice",
    icon: Sparkles,
    href: "/youth-mode",
    color: "from-chart-5 to-chart-5/60",
  },
  {
    title: "Settings",
    description: "Your profile",
    icon: null,
    href: "/settings",
    color: "from-muted-foreground/80 to-muted-foreground/40",
    isSettings: true,
  },
];

export default function Dashboard() {
  const { trades, stats, isLoading: tradesLoading } = useTrades();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { planTotal, planCompleted, lessonsCompleted, isLoading: universalStatsLoading } = useDashboardStats();

  const isLoading = tradesLoading || universalStatsLoading;

  // Auto-open Quinn chat if URL has ?quinn=open (from PWA shortcut)
  useEffect(() => {
    if (searchParams.get('quinn') === 'open') {
      // Dispatch event to open Quinn chat in footer
      window.dispatchEvent(new CustomEvent('open-quinn-chat'));
      // Remove the param from URL to prevent re-opening on refresh
      searchParams.delete('quinn');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  
  const firstName = getGreetingName(profile);

  const openSearch = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate all dashboard-related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['trades'] }),
        queryClient.invalidateQueries({ queryKey: ['reminders'] }),
        queryClient.invalidateQueries({ queryKey: ['price-alerts'] }),
        queryClient.invalidateQueries({ queryKey: ['watchlist'] }),
        queryClient.invalidateQueries({ queryKey: ['market-news'] }),
        queryClient.invalidateQueries({ queryKey: ['economic-calendar'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-universal-stats'] }),
      ]);
      toast.success('Dashboard refreshed!', { duration: 1500 });
    } catch (error) {
      toast.error('Failed to refresh');
    } finally {
      setIsRefreshing(false);
    }
  };
  
  const planProgressPct = planTotal > 0 ? Math.round((planCompleted / planTotal) * 100) : 0;

  const portfolioStats = [
    {
      label: "Total P&L",
      value: `${stats.totalProfitLoss >= 0 ? '+' : ''}$${Math.abs(stats.totalProfitLoss).toFixed(2)}`,
      change: null,
      isPositive: stats.totalProfitLoss >= 0,
      gradient: stats.totalProfitLoss >= 0 
        ? "from-gain/90 to-gain/70" 
        : "from-loss/90 to-loss/70",
      waveColor: "text-white",
    },
    {
      label: "Total Trades",
      value: stats.totalTrades.toString(),
      change: null,
      isPositive: null,
      gradient: "from-gold/90 to-chart-4/70",
      waveColor: "text-white",
    },
    {
      label: "Plan Progress",
      value: planTotal > 0 ? `${planCompleted}/${planTotal}` : "0",
      change: planProgressPct > 0 ? `${planProgressPct}%` : null,
      isPositive: planProgressPct > 50,
      gradient: "from-primary/90 to-primary/70",
      waveColor: "text-white",
    },
    {
      label: "Lessons Done",
      value: lessonsCompleted.toString(),
      change: lessonsCompleted > 0 ? "Keep going!" : null,
      isPositive: lessonsCompleted > 0,
      gradient: "from-chart-3/90 to-chart-3/70",
      waveColor: "text-white",
    },
  ];

  // Define all dashboard widgets for the reorderable grid
  const dashboardWidgets = useMemo(() => [
    {
      id: 'financial-health',
      component: <FinancialHealthWidget />,
    },
    {
      id: 'quinn-insights',
      component: <QuinnInsightsWidget stats={stats} />,
    },
    {
      id: 'watchlist',
      component: <LiveWatchlist />,
    },
    {
      id: 'price-alerts',
      component: <PriceAlertsWidget />,
    },
    {
      id: 'economic-calendar',
      component: <EconomicCalendar />,
    },
    {
      id: 'reminders',
      component: <ReminderWidget />,
    },
    {
      id: 'referral',
      component: <ReferralWidget />,
    },
    {
      id: 'recent-trades',
      component: <RecentTradesWidget trades={trades} isLoading={isLoading} winRate={stats.winRate} openPositions={stats.openTrades} />,
    },
    {
      id: 'trade-checklist',
      component: (
        <FeatureGate
          requiredTier="pro"
          featureName="Trade Checklist"
          featureDescription="Pre-trade checklist to ensure discipline and consistency"
        >
          <TradeChecklist />
        </FeatureGate>
      ),
    },
    {
      id: 'pattern-recognition',
      component: (
        <FeatureGate
          requiredTier="pro"
          featureName="Pattern Recognition"
          featureDescription="AI-powered analysis of your trading patterns and habits"
        >
          <PatternRecognition />
        </FeatureGate>
      ),
    },
    {
      id: 'market-news',
      component: <MarketNews />,
    },
  ], [trades, isLoading, stats]);

  return (
    <DashboardLayout>
      {/* Floating decorative background */}
      <FloatingElements variant="subtle" />
      
      <div className="relative p-4 sm:p-6 space-y-4 sm:space-y-6 z-10">
        {/* Time-based Greeting */}
        <TimeGreeting firstName={firstName} />

        {/* Calendar Widget + Refresh Button - centered */}
        <div className="flex items-center justify-center gap-3">
          <DashboardCalendarWidget onOpenCalendar={() => setIsCalendarOpen(true)} />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-12 w-12 rounded-full border-2 border-primary/30 bg-card/60 backdrop-blur-sm shadow-[0_0_20px_-5px_hsl(var(--primary)/0.3)] hover:border-primary/50 hover:shadow-[0_0_25px_-5px_hsl(var(--primary)/0.4)] transition-all"
          >
            <RefreshCw className={`h-5 w-5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Search Bar - below calendar */}
        <div className="max-w-xl mx-auto">
          <DashboardSearchBar onOpenSearch={openSearch} />
        </div>

        {/* Pro Finance Summary — only visible to Pro members, shown first */}
        <div>
          <h2 className="text-lg font-semibold mb-1">My Finances</h2>
          <p className="text-sm text-muted-foreground mb-4">Your financial foundation</p>
          <FeatureGate
            requiredTier="pro"
            featureName="My Finances Snapshot"
            featureDescription="See your budget, savings, and net worth at a glance — upgrade to Pro to unlock."
          >
            <ProFinanceSummary />
          </FeatureGate>
        </div>

        {/* My Activity Snapshot */}
        <div>
          <h2 className="text-lg font-semibold mb-1">My Activity Snapshot</h2>
          <p className="text-sm text-muted-foreground mb-4">Your key stats at a glance</p>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" text="Loading stats..." />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {portfolioStats.map((stat) => (
              <WaveTrendCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                change={stat.change}
                isPositive={stat.isPositive}
                gradient={stat.gradient}
                waveColor={stat.waveColor}
              />
            ))}
          </div>
        )}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-1">Quick Actions</h2>
          <p className="text-sm text-muted-foreground mb-4">Jump to your most-used features</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.href}
                className="group block"
              >
                <Card className="cursor-pointer border-border/50 bg-card/50 backdrop-blur-sm hover-elevate overflow-hidden h-full">
                  <CardContent className="p-4 relative">
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div
                        className={`absolute -top-10 -right-10 w-24 h-24 bg-gradient-to-br ${action.color} rounded-full blur-2xl opacity-30`}
                      />
                    </div>

                    <div
                      className={`relative mb-3 inline-flex items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${action.isQuinn || action.isSettings ? 'h-12 w-12' : 'h-12 w-12 bg-gradient-to-br ' + action.color}`}
                    >
                      {action.isQuinn ? (
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                          <QuinnIcon variant="chat-q" size={28} />
                        </div>
                      ) : action.isSettings ? (
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-muted-foreground/80 to-muted-foreground/40 flex items-center justify-center">
                          <Settings className="h-6 w-6 text-white" />
                        </div>
                      ) : (
                        action.icon && <action.icon className="h-6 w-6 text-white" />
                      )}
                    </div>
                    <h3 className="font-semibold mb-0.5 group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* Live & Learn — prominent position right after Quick Actions */}
        <LiveLearnCarousel />

        {/* Reorderable Dashboard Widgets */}
        <div>
          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <span className="opacity-60">💡</span> Drag cards to reorder your dashboard
          </p>
          <DashboardWidgetGrid widgets={dashboardWidgets} />
        </div>
      </div>

      {/* Calendar Modal */}
      <CalendarModal open={isCalendarOpen} onOpenChange={setIsCalendarOpen} />
    </DashboardLayout>
  );
}
