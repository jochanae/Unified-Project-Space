import { useState, useEffect } from "react";
import { ChevronRight, PieChart, TrendingUp, DollarSign, Info, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Database } from "@/integrations/supabase/types";

type AccountType = Database["public"]["Enums"]["account_type"];

interface Account {
  id: string;
  name: string;
  balance: number;
  account_type: AccountType;
  institution: string | null;
  total_contributions?: number;
}

interface BalanceHistory {
  snapshot_date: string;
  balance: number;
}

interface MonthlyTrend {
  month: string;
  fullMonth: string;
  value: number;
}

type ViewType = "allocation" | "trend" | "accounts";

const INVESTMENT_TYPES: AccountType[] = [
  "investment", "brokerage", "retirement_401k", "retirement_ira", 
  "retirement_roth", "annuity", "insurance"
];

const TYPE_LABELS: Record<string, string> = {
  investment: "Investment",
  brokerage: "Brokerage",
  retirement_401k: "401(k)",
  retirement_ira: "IRA",
  retirement_roth: "Roth IRA",
  annuity: "Annuity",
  insurance: "IUL/Insurance",
};

export const InvestmentsCardContent = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [trendData, setTrendData] = useState<{ date: string; value: number }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [activeView, setActiveView] = useState<ViewType>("allocation");
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyTrend | null>(null);
  const [totalContributions, setTotalContributions] = useState(0);

  useEffect(() => {
    if (user) {
      fetchAccounts();
      fetchBalanceHistory();
    }
  }, [user]);

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user?.id)
      .in("account_type", INVESTMENT_TYPES);
    
    setAccounts(data || []);
    
    // Calculate total contributions
    const contributions = (data || []).reduce((sum, acc) => 
      sum + Number(acc.total_contributions || 0), 0
    );
    setTotalContributions(contributions);
    
    setLoading(false);
  };

  const fetchBalanceHistory = async () => {
    // Get account IDs for investment accounts
    const { data: investmentAccounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user?.id)
      .in("account_type", INVESTMENT_TYPES);

    // Always generate empty monthly trend first (so sparkline shows even with no accounts)
    if (!investmentAccounts?.length) {
      generateEmptyMonthlyTrend();
      return;
    }

    const accountIds = investmentAccounts.map(a => a.id);
    const twelveMonthsAgo = subMonths(new Date(), 12).toISOString().split('T')[0];

    // Get balance history
    const { data: history } = await supabase
      .from("account_balance_history")
      .select("snapshot_date, balance, account_id")
      .in("account_id", accountIds)
      .gte("snapshot_date", twelveMonthsAgo)
      .order("snapshot_date", { ascending: true });

    if (!history?.length) {
      // Generate empty monthly trend for sparkline
      generateEmptyMonthlyTrend();
      return;
    }

    // Aggregate by date for line chart
    const dateMap = new Map<string, number>();
    history.forEach((h) => {
      const existing = dateMap.get(h.snapshot_date) || 0;
      dateMap.set(h.snapshot_date, existing + Number(h.balance));
    });

    const chartData = Array.from(dateMap.entries())
      .map(([date, value]) => ({
        date: format(new Date(date), "MMM d"),
        value,
      }))
      .slice(-12);

    setTrendData(chartData);

    // Aggregate by month for sparkline
    generateMonthlyTrend(history);
  };

  const generateEmptyMonthlyTrend = () => {
    const months: MonthlyTrend[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push({
        month: format(date, "MMM"),
        fullMonth: format(date, "MMMM yyyy"),
        value: 0,
      });
    }
    setMonthlyTrend(months);
  };

  const generateMonthlyTrend = (history: { snapshot_date: string; balance: number; account_id: string }[]) => {
    const monthMap = new Map<string, { total: number; count: number }>();
    
    // Group by month and get the latest value per account per month
    const accountMonthValues = new Map<string, Map<string, number>>();
    
    history.forEach((h) => {
      const monthKey = format(new Date(h.snapshot_date), "yyyy-MM");
      if (!accountMonthValues.has(monthKey)) {
        accountMonthValues.set(monthKey, new Map());
      }
      // Keep the latest value for each account in each month
      accountMonthValues.get(monthKey)!.set(h.account_id, Number(h.balance));
    });

    // Sum up all account values for each month
    accountMonthValues.forEach((accountValues, monthKey) => {
      let total = 0;
      accountValues.forEach((balance) => {
        total += balance;
      });
      monthMap.set(monthKey, { total, count: accountValues.size });
    });

    // Generate 12 months of data
    const months: MonthlyTrend[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, "yyyy-MM");
      const monthData = monthMap.get(monthKey);
      
      months.push({
        month: format(date, "MMM"),
        fullMonth: format(date, "MMMM yyyy"),
        value: monthData?.total || 0,
      });
    }
    
    setMonthlyTrend(months);
  };

  const totalValue = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const gainLoss = totalContributions > 0 ? totalValue - totalContributions : 0;
  const gainLossPercent = totalContributions > 0 ? (gainLoss / totalContributions) * 100 : 0;
  
  const allocation = accounts.reduce((acc, account) => {
    const type = account.account_type;
    acc[type] = (acc[type] || 0) + Number(account.balance);
    return acc;
  }, {} as Record<string, number>);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  const formatCompact = (value: number) =>
    new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

  const handleBarClick = (item: MonthlyTrend) => {
    setSelectedMonth(selectedMonth?.month === item.month ? null : item);
  };

  if (loading) {
    return <div className="animate-pulse h-32 bg-muted rounded" />;
  }

  // Calculate max value for sparkline bar heights
  const maxValue = Math.max(...monthlyTrend.map(t => t.value), 1);
  const hasAnyData = monthlyTrend.some(t => t.value > 0);

  return (
    <div className="space-y-3">
      {/* Tab Navigation */}
      <div className="flex justify-center gap-2">
        <Button
          variant={activeView === "allocation" ? "default" : "ghost"}
          size="sm"
          className="h-8 px-3"
          onClick={() => setActiveView("allocation")}
        >
          <PieChart className="h-4 w-4" />
        </Button>
        <Button
          variant={activeView === "trend" ? "default" : "ghost"}
          size="sm"
          className="h-8 px-3"
          onClick={() => setActiveView("trend")}
        >
          <TrendingUp className="h-4 w-4" />
        </Button>
        <Button
          variant={activeView === "accounts" ? "default" : "ghost"}
          size="sm"
          className="h-8 px-3"
          onClick={() => setActiveView("accounts")}
        >
          <DollarSign className="h-4 w-4" />
        </Button>
      </div>

      {activeView === "allocation" && (
        <div className="space-y-3">
          {/* Portfolio Summary with Gain/Loss */}
          <div className="p-3 rounded-lg border border-primary/20 bg-muted/50">
            <p className="text-xs text-muted-foreground">Total Portfolio Value</p>
            <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            
            {/* Gain/Loss Display */}
            {totalContributions > 0 && (
              <div className={`flex items-center gap-1 text-sm font-medium ${gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {gainLoss >= 0 ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span>{formatCurrency(Math.abs(gainLoss))}</span>
                <span className="text-xs">({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)</span>
              </div>
            )}
            
            <p className="text-xs text-muted-foreground">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Monthly Portfolio Trend Label */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Monthly Portfolio Trend</span>
          </div>

          {/* Selected month detail */}
          {selectedMonth && (
            <div className="text-center py-1.5 px-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800">
              <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                {selectedMonth.fullMonth}: {formatCurrency(selectedMonth.value)}
              </span>
            </div>
          )}

          {/* Sparkline Bar Chart - Always visible like Tax card */}
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex gap-2 h-14 items-end min-w-max">
                {monthlyTrend.map((item) => {
                  // Always show bars at minimum height when no data (like Tax card)
                  const barHeight = hasAnyData 
                    ? Math.max(4, Math.round((item.value / maxValue) * 40))
                    : 16; // Default height when no data
                  const isSelected = selectedMonth?.month === item.month;
                  
                  return (
                    <Tooltip key={item.month}>
                      <TooltipTrigger asChild>
                        <div 
                          className="flex flex-col items-center gap-1 w-8 cursor-pointer"
                          onClick={() => handleBarClick(item)}
                        >
                          <div 
                            className={`w-6 rounded-sm transition-all duration-200 ${
                              isSelected 
                                ? 'bg-cyan-700 ring-2 ring-cyan-400' 
                                : item.value > 0 
                                  ? 'bg-cyan-500 hover:bg-cyan-600' 
                                  : 'bg-cyan-300 dark:bg-cyan-800 hover:bg-cyan-400 dark:hover:bg-cyan-700'
                            }`}
                            style={{ height: `${barHeight}px` }}
                          />
                          <span className={`text-[10px] ${isSelected ? 'text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-muted-foreground'}`}>
                            {item.month}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-cyan-600 text-white border-cyan-600">
                        <p className="font-medium">{item.fullMonth}: {formatCurrency(item.value)}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </TooltipProvider>

          {/* Allocation Breakdown */}
          {Object.entries(allocation).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(allocation)
                .sort((a, b) => b[1] - a[1])
                .map(([type, value]) => {
                  const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
                  return (
                    <div key={type} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-cyan-500 font-medium">
                          {TYPE_LABELS[type] || type}
                        </span>
                        <span>{percentage.toFixed(0)}%</span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              No investment accounts yet
            </p>
          )}
        </div>
      )}

      {activeView === "trend" && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">Portfolio Trend</p>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
          </div>
          
          {trendData.length > 1 ? (
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={formatCompact}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                  />
                  <RechartsTooltip 
                    formatter={(value: number) => [formatCurrency(value), "Value"]}
                    contentStyle={{ 
                      fontSize: 12, 
                      borderRadius: 8,
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-24 rounded-lg border-2 border-dashed border-muted flex items-center justify-center bg-muted/30">
              <div className="text-center">
                <TrendingUp className="h-6 w-6 text-muted-foreground/50 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">
                  Balance history builds over time
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeView === "accounts" && (
        <div className="space-y-2">
          {accounts.length > 0 ? (
            accounts.map((account) => {
              const percentage = totalValue > 0 ? (Number(account.balance) / totalValue) * 100 : 0;
              const accountGain = account.total_contributions ? Number(account.balance) - Number(account.total_contributions) : 0;
              
              return (
                <div key={account.id} className="p-2 rounded-lg bg-muted/50 space-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{account.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {TYPE_LABELS[account.account_type] || account.account_type}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(Number(account.balance))}</p>
                      {account.total_contributions && Number(account.total_contributions) > 0 && (
                        <p className={`text-xs ${accountGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {accountGain >= 0 ? '+' : ''}{formatCurrency(accountGain)}
                        </p>
                      )}
                    </div>
                  </div>
                  <Progress value={percentage} className="h-1" />
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(1)}% of portfolio
                  </p>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground text-center py-4">
              No investment accounts linked
            </p>
          )}
        </div>
      )}

      {/* Info Box */}
      <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground">This card tracks investment & retirement accounts only</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside">
              <li>401(k), 403(b), IRA, Roth IRA, SEP IRA, TSP, Pensions</li>
              <li>Brokerage, Stocks, Bonds, ETFs, Mutual Funds</li>
              <li>529 Plans, Annuities, IUL & Whole Life Insurance</li>
            </ul>
          </div>
        </div>
      </div>

      <Button variant="ghost" size="sm" className="w-full text-xs">
        <ChevronRight className="h-3 w-3 mr-1" />
        Manage Accounts
      </Button>
    </div>
  );
};

// Expanded view - shows in the modal/sheet
export const InvestmentsCardExpandedContent = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [totalContributions, setTotalContributions] = useState(0);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>(() => {
    // Initialize with empty 12-month trend
    const months: MonthlyTrend[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push({
        month: format(date, "MMM"),
        fullMonth: format(date, "MMMM yyyy"),
        value: 0,
      });
    }
    return months;
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<MonthlyTrend | null>(null);
  const [activeView, setActiveView] = useState<ViewType>("allocation");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    await Promise.all([fetchAccounts(), fetchBalanceHistory()]);
    setLoading(false);
  };

  const fetchAccounts = async () => {
    const { data } = await supabase
      .from("accounts")
      .select("*")
      .eq("user_id", user?.id)
      .in("account_type", INVESTMENT_TYPES);
    
    setAccounts(data || []);
    const contributions = (data || []).reduce((sum, acc) => 
      sum + Number(acc.total_contributions || 0), 0
    );
    setTotalContributions(contributions);
  };

  const fetchBalanceHistory = async () => {
    const { data: investmentAccounts } = await supabase
      .from("accounts")
      .select("id")
      .eq("user_id", user?.id)
      .in("account_type", INVESTMENT_TYPES);

    if (!investmentAccounts?.length) {
      generateEmptyMonthlyTrend();
      return;
    }

    const accountIds = investmentAccounts.map(a => a.id);
    const twelveMonthsAgo = subMonths(new Date(), 12).toISOString().split('T')[0];

    const { data: history } = await supabase
      .from("account_balance_history")
      .select("snapshot_date, balance, account_id")
      .in("account_id", accountIds)
      .gte("snapshot_date", twelveMonthsAgo)
      .order("snapshot_date", { ascending: true });

    if (!history?.length) {
      generateEmptyMonthlyTrend();
      return;
    }

    generateMonthlyTrendFromHistory(history);
  };

  const generateEmptyMonthlyTrend = () => {
    const months: MonthlyTrend[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      months.push({
        month: format(date, "MMM"),
        fullMonth: format(date, "MMMM yyyy"),
        value: 0,
      });
    }
    setMonthlyTrend(months);
  };

  const generateMonthlyTrendFromHistory = (history: { snapshot_date: string; balance: number; account_id: string }[]) => {
    const accountMonthValues = new Map<string, Map<string, number>>();
    
    history.forEach((h) => {
      const monthKey = format(new Date(h.snapshot_date), "yyyy-MM");
      if (!accountMonthValues.has(monthKey)) {
        accountMonthValues.set(monthKey, new Map());
      }
      accountMonthValues.get(monthKey)!.set(h.account_id, Number(h.balance));
    });

    const monthMap = new Map<string, number>();
    accountMonthValues.forEach((accountValues, monthKey) => {
      let total = 0;
      accountValues.forEach((balance) => {
        total += balance;
      });
      monthMap.set(monthKey, total);
    });

    const months: MonthlyTrend[] = [];
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthKey = format(date, "yyyy-MM");
      
      months.push({
        month: format(date, "MMM"),
        fullMonth: format(date, "MMMM yyyy"),
        value: monthMap.get(monthKey) || 0,
      });
    }
    
    setMonthlyTrend(months);
  };

  const totalValue = accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  const gainLoss = totalContributions > 0 ? totalValue - totalContributions : 0;
  const gainLossPercent = totalContributions > 0 ? (gainLoss / totalContributions) * 100 : 0;

  const allocation = accounts.reduce((acc, account) => {
    const type = account.account_type;
    acc[type] = (acc[type] || 0) + Number(account.balance);
    return acc;
  }, {} as Record<string, number>);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

  const maxValue = Math.max(...monthlyTrend.map(t => t.value), 1);
  const hasAnyData = monthlyTrend.some(t => t.value > 0);

  const handleBarClick = (item: MonthlyTrend) => {
    setSelectedMonth(selectedMonth?.month === item.month ? null : item);
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded" />;
  }

  const formatCompact = (value: number) =>
    new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

  // Prepare trend data for line chart (same as compact view)
  const trendData = monthlyTrend.slice(-6).map(item => ({
    date: item.month,
    value: item.value,
  }));

  return (
    <div className="space-y-6 p-2">
      {/* Enlarged Compact Card Content */}
      <div className="p-4 rounded-2xl bg-muted/30 border space-y-4">
        {/* Tab Navigation */}
        <div className="flex justify-center gap-1.5 flex-wrap">
          <Button
            variant={activeView === "allocation" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => setActiveView("allocation")}
          >
            <PieChart className="h-3.5 w-3.5 mr-1.5" />
            Allocation
          </Button>
          <Button
            variant={activeView === "trend" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => setActiveView("trend")}
          >
            <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
            Trend
          </Button>
          <Button
            variant={activeView === "accounts" ? "default" : "ghost"}
            size="sm"
            className="h-8 px-3 text-xs"
            onClick={() => setActiveView("accounts")}
          >
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
            Accounts
          </Button>
        </div>

        {/* Allocation View */}
        {activeView === "allocation" && (
          <div className="space-y-4">
            {/* Portfolio Summary with Gain/Loss */}
            <div className="p-4 rounded-lg border border-primary/20 bg-muted/50">
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
              <p className="text-3xl font-bold">{formatCurrency(totalValue)}</p>
              
              {totalContributions > 0 && (
                <div className={`flex items-center gap-1 text-base font-medium ${gainLoss >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {gainLoss >= 0 ? (
                    <ArrowUpRight className="h-5 w-5" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5" />
                  )}
                  <span>{formatCurrency(Math.abs(gainLoss))}</span>
                  <span className="text-sm">({gainLossPercent >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%)</span>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</p>
            </div>

            {/* Monthly Portfolio Trend */}
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Monthly Portfolio Trend</span>
              
              {selectedMonth && (
                <div className="text-center py-1.5 px-3 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 border border-cyan-200 dark:border-cyan-800">
                  <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">
                    {selectedMonth.fullMonth}: {formatCurrency(selectedMonth.value)}
                  </span>
                </div>
              )}

              <TooltipProvider delayDuration={100}>
                <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
                  <div className="flex gap-2 h-16 items-end min-w-max">
                    {monthlyTrend.map((item) => {
                      const barHeight = hasAnyData 
                        ? Math.max(6, Math.round((item.value / maxValue) * 48))
                        : 20;
                      const isSelected = selectedMonth?.month === item.month;
                      
                      return (
                        <Tooltip key={item.month}>
                          <TooltipTrigger asChild>
                            <div 
                              className="flex flex-col items-center gap-1 w-10 cursor-pointer"
                              onClick={() => handleBarClick(item)}
                            >
                              <div 
                                className={`w-7 rounded-sm transition-all duration-200 ${
                                  isSelected 
                                    ? 'bg-cyan-700 ring-2 ring-cyan-400' 
                                    : item.value > 0 
                                      ? 'bg-cyan-500 hover:bg-cyan-600' 
                                      : 'bg-cyan-300 dark:bg-cyan-800 hover:bg-cyan-400 dark:hover:bg-cyan-700'
                                }`}
                                style={{ height: `${barHeight}px` }}
                              />
                              <span className={`text-xs ${isSelected ? 'text-cyan-700 dark:text-cyan-300 font-semibold' : 'text-muted-foreground'}`}>
                                {item.month}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="bg-cyan-600 text-white border-cyan-600">
                            <p className="font-medium">{item.fullMonth}: {formatCurrency(item.value)}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              </TooltipProvider>
            </div>

            {/* Allocation Breakdown */}
            {Object.entries(allocation).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(allocation)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, value]) => {
                    const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-cyan-500 font-medium">
                            {TYPE_LABELS[type] || type}
                          </span>
                          <span>{percentage.toFixed(0)}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                No investment accounts yet
              </p>
            )}
          </div>
        )}

        {/* Trend View */}
        {activeView === "trend" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-base font-medium">Portfolio Trend</p>
              <p className="text-sm text-muted-foreground">Last 6 months</p>
            </div>
            
            {trendData.some(d => d.value > 0) ? (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData}>
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }} 
                      tickFormatter={formatCompact}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                    />
                    <RechartsTooltip 
                      formatter={(value: number) => [formatCurrency(value), "Value"]}
                      contentStyle={{ 
                        fontSize: 12, 
                        borderRadius: 8,
                        background: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-36 rounded-lg border-2 border-dashed border-muted flex items-center justify-center bg-muted/30">
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Balance history builds over time
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accounts View */}
        {activeView === "accounts" && (
          <div className="space-y-3">
            {accounts.length > 0 ? (
              accounts.map((account) => {
                const percentage = totalValue > 0 ? (Number(account.balance) / totalValue) * 100 : 0;
                const accountGain = account.total_contributions ? Number(account.balance) - Number(account.total_contributions) : 0;
                
                return (
                  <div key={account.id} className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-base">{account.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {TYPE_LABELS[account.account_type] || account.account_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{formatCurrency(Number(account.balance))}</p>
                        {account.total_contributions && Number(account.total_contributions) > 0 && (
                          <p className={`text-sm ${accountGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {accountGain >= 0 ? '+' : ''}{formatCurrency(accountGain)}
                          </p>
                        )}
                      </div>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                    <p className="text-sm text-muted-foreground">
                      {percentage.toFixed(1)}% of portfolio
                    </p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No investment accounts linked
              </p>
            )}
          </div>
        )}
      </div>

      {/* Large Portfolio Circle */}
      <div className="flex justify-center py-4">
        <div className="relative h-44 w-44">
          <svg className="h-44 w-44 -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="2"
            />
            {Object.entries(allocation).map(([type, value], index, arr) => {
              const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
              const offset = arr.slice(0, index).reduce((sum, [, v]) => 
                sum + (totalValue > 0 ? (v / totalValue) * 88 : 0), 0
              );
              const colors = ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'];
              return (
                <circle
                  key={type}
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke={colors[index % colors.length]}
                  strokeWidth="2"
                  strokeDasharray={`${percentage * 0.88}, 100`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center px-2">
            <span className="text-xl font-bold text-cyan-600 text-center leading-tight">
              {formatCurrency(totalValue)}
            </span>
            <span className="text-xs text-muted-foreground">Portfolio</span>
            {totalContributions > 0 && (
              <span className={`text-sm font-medium ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {gainLoss >= 0 ? '+' : ''}{gainLossPercent.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Asset Allocation Summary */}
      <div className="p-5 rounded-2xl bg-muted/30 space-y-4">
        <div className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-cyan-500" />
          <span className="text-lg font-bold">Asset Allocation</span>
        </div>
        {Object.entries(allocation)
          .sort((a, b) => b[1] - a[1])
          .map(([type, value]) => {
            const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;
            return (
              <div key={type} className="flex items-center gap-3">
                <span className="flex-1 text-base">{TYPE_LABELS[type] || type}</span>
                <div className="w-28 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-600 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-base font-semibold w-14 text-right">
                  {percentage.toFixed(0)}%
                </span>
              </div>
            );
          })}
        {Object.keys(allocation).length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            No investment accounts linked yet
          </p>
        )}
      </div>

      {/* Account Details */}
      <div className="p-5 rounded-2xl bg-muted/30 space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-cyan-500" />
          <span className="text-lg font-bold">Account Details</span>
        </div>
        {accounts.length > 0 ? (
          accounts.map((account) => {
            const accountGain = account.total_contributions ? Number(account.balance) - Number(account.total_contributions) : 0;
            return (
              <div key={account.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-sm text-muted-foreground">{TYPE_LABELS[account.account_type] || account.account_type}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(Number(account.balance))}</p>
                  {account.total_contributions && Number(account.total_contributions) > 0 && (
                    <p className={`text-xs ${accountGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {accountGain >= 0 ? '+' : ''}{formatCurrency(accountGain)}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            Link investment accounts to see details
          </p>
        )}
      </div>
    </div>
  );
};
