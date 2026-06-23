import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { PieChart as PieIcon, TrendingUp, BarChart3, ChevronRight, ChevronDown, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useIsMobile } from "@/hooks/use-mobile";

interface FinancialSnapshotChartProps {
  spendingByCategory: { name: string; value: number; color: string }[];
  monthlyTrend: { month: string; income: number; expenses: number }[];
  budgetVsActual: { category: string; budgeted: number; spent: number }[];
}

// Professional color palette
const CHART_COLORS = {
  income: "hsl(150, 60%, 45%)", // Emerald (Bloom green)
  expenses: "hsl(0, 65%, 55%)", // Coral
  categories: [
    "hsl(150, 55%, 42%)", // Emerald Green (primary)
    "hsl(270, 50%, 50%)", // Deep Violet (Bloom)
    "hsl(180, 55%, 42%)", // Teal
    "hsl(200, 65%, 50%)", // Sky
    "hsl(45, 75%, 50%)",  // Amber
    "hsl(320, 50%, 50%)", // Muted Pink
    "hsl(220, 55%, 52%)", // Slate Blue
    "hsl(25, 70%, 50%)",  // Warm Orange
  ],
};

type ChartView = "pie" | "trend" | "bar";

export function FinancialSnapshotChart({ 
  spendingByCategory, 
  monthlyTrend, 
  budgetVsActual 
}: FinancialSnapshotChartProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const pieInnerRadius = isMobile ? 50 : 90;
  const pieOuterRadius = isMobile ? 80 : 140;
  const [activeView, setActiveView] = useState<ChartView>("pie");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<{ title: string; amount: number; transaction_date: string }[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const getCategoryMappings = (category: string): string[] => {
    // Must mirror DB function map_transaction_to_budget_category exactly
    const map: Record<string, string[]> = {
      utilities: ['utilities', 'internet', 'phone'],
      housing: ['housing', 'rent', 'mortgage', 'property_tax'],
      insurance: ['insurance'],
      transportation: ['transportation', 'car_payment'],
      entertainment: ['entertainment', 'subscriptions', 'subscription', 'streaming', 'gym'],
      food: ['food', 'groceries', 'dining', 'food & groceries', 'food___groceries'],
      healthcare: ['healthcare', 'medical'],
      shopping: ['shopping'],
      education: ['education'],
      travel: ['travel'],
      personal: ['personal', 'personal care'],
      debt: ['debt', 'debt payments', 'credit_card', 'credit_cards', 'credit cards', 'student_loan', 'loans'],
      gifts: ['charity', 'gifts'],
      savings: ['savings'],
      // Must mirror DB map_transaction_to_budget_category: credit_card, medical, healthcare, debt all map to 'other'
      other: ['other', 'miscellaneous', 'credit_card', 'credit_cards', 'credit cards', 'debt', 'debt payments', 'student_loan', 'loans', 'healthcare', 'medical'],
    };
    return map[category.toLowerCase()] || [category.toLowerCase()];
  };

  // Mirrors DB recalculate_budget_spent rollup: if no dedicated budget exists
  // for a sub-category, its transactions roll up into the parent budget.
  const getRollupCategories = (category: string): string[] => {
    const base = getCategoryMappings(category);
    const lowerCat = category.toLowerCase();
    const activeBudgetNames = budgetVsActual.map(b => b.category.toLowerCase());

    // Housing rolls up utilities & insurance when no dedicated budget
    if (lowerCat === 'housing') {
      if (!activeBudgetNames.includes('utilities')) {
        base.push(...getCategoryMappings('utilities'));
      }
      if (!activeBudgetNames.includes('insurance')) {
        base.push(...getCategoryMappings('insurance'));
      }
    }
    // Entertainment rolls up personal when no dedicated budget
    if (lowerCat === 'entertainment') {
      if (!activeBudgetNames.includes('personal')) {
        base.push(...getCategoryMappings('personal'));
      }
    }
    // Other: remove sub-categories that have their own dedicated budget
    if (lowerCat === 'other') {
      const debtCats = ['debt', 'debt payments', 'credit_card', 'credit_cards', 'credit cards', 'student_loan', 'loans'];
      const healthCats = ['healthcare', 'medical'];
      if (activeBudgetNames.includes('debt')) {
        return base.filter(c => !debtCats.includes(c));
      }
      if (activeBudgetNames.includes('healthcare')) {
        return base.filter(c => !healthCats.includes(c));
      }
    }
    return [...new Set(base)];
  };

  const fetchCategoryTransactions = async (category: string) => {
    if (!user) return;
    if (expandedCategory === category) {
      setExpandedCategory(null);
      return;
    }
    setExpandedCategory(category);
    setLoadingTransactions(true);
    const now = new Date();
    const monthStart = format(startOfMonth(now), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(now), "yyyy-MM-dd");
    const categories = getRollupCategories(category);
    try {
      const { data } = await supabase
        .from("transactions")
        .select("title, amount, transaction_date")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .in("category", categories)
        .gte("transaction_date", monthStart)
        .lte("transaction_date", monthEnd)
        .order("transaction_date", { ascending: false })
        .limit(20);
      setCategoryTransactions(data || []);
    } catch (err) {
      console.error("Error fetching category transactions:", err);
      setCategoryTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const views: { id: ChartView; label: string; icon: typeof PieIcon }[] = [
    { id: "pie", label: "Spending", icon: PieIcon },
    { id: "trend", label: "Trend", icon: TrendingUp },
    { id: "bar", label: "Budget", icon: BarChart3 },
  ];

  const renderChart = () => {
    switch (activeView) {
      case "pie":
        return (
           <div className="h-full w-full flex flex-col">
            {spendingByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" className={`flex-1 ${isMobile ? 'min-h-[180px]' : 'min-h-[320px]'}`}>
                <PieChart>
                  <Pie
                    data={spendingByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={pieInnerRadius}
                    outerRadius={pieOuterRadius}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {spendingByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || CHART_COLORS.categories[index % CHART_COLORS.categories.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#0f1419'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <div className="w-20 h-20 rounded-full border-4 border-dashed border-white/30 flex items-center justify-center">
                  <PieIcon className="h-8 w-8 text-white/40" />
                </div>
                <p className="text-white/80 text-sm font-medium">No spending data yet</p>
                <p className="text-white/50 text-xs">Add budgets to see your breakdown</p>
              </div>
            )}
          </div>
        );

      case "trend":
        return (
          <div className="h-[200px] w-full">
            {monthlyTrend.length > 0 && monthlyTrend.some(m => m.income > 0 || m.expenses > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: 'rgba(255,255,255,0.9)', fontSize: 11 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px',
                      color: '#0f1419'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="income" 
                    stroke={CHART_COLORS.income} 
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.income, strokeWidth: 0, r: 4 }}
                    name="Income"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke={CHART_COLORS.expenses} 
                    strokeWidth={3}
                    dot={{ fill: CHART_COLORS.expenses, strokeWidth: 0, r: 4 }}
                    name="Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2">
                <div className="w-20 h-20 rounded-xl border-4 border-dashed border-white/30 flex items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-white/40" />
                </div>
                <p className="text-white/80 text-sm font-medium">No trend data yet</p>
                <p className="text-white/50 text-xs">Add transactions to see your trends</p>
              </div>
            )}
            {/* Legend */}
            <div className="flex justify-center gap-6 mt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: CHART_COLORS.income }} />
                <span className="text-xs text-white/90">Income</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: CHART_COLORS.expenses }} />
                <span className="text-xs text-white/90">Expenses</span>
              </div>
            </div>
          </div>
        );

      case "bar":
        // Get color based on percentage spent
        const getProgressColor = (percent: number) => {
          if (percent >= 100) return "bg-red-500";
          if (percent >= 90) return "bg-red-400";
          if (percent >= 75) return "bg-yellow-500";
          return "bg-emerald-500";
        };

        const getProgressBgColor = (percent: number) => {
          if (percent >= 100) return "bg-red-500/20";
          if (percent >= 90) return "bg-red-400/20";
          if (percent >= 75) return "bg-yellow-500/20";
          return "bg-emerald-500/20";
        };

        // Sort by percentage spent (highest first) and take top 5
        const sortedBudgets = [...budgetVsActual]
          .map(b => ({
            ...b,
            percent: b.budgeted > 0 ? Math.round((b.spent / b.budgeted) * 100) : 0
          }))
          .sort((a, b) => b.percent - a.percent)
          .slice(0, 5);

        return (
          <div className="w-full">
            {sortedBudgets.length > 0 ? (
              <div className="space-y-3">
                {sortedBudgets.map((budget) => (
                  <div key={budget.category}>
                    {/* Tappable Label row */}
                    <button
                      onClick={() => fetchCategoryTransactions(budget.category)}
                      className="w-full space-y-1"
                    >
                      <div className="flex items-center justify-between gap-1 text-xs sm:text-sm">
                        <div className="flex items-center gap-1">
                          {expandedCategory === budget.category ? (
                            <ChevronDown className="h-3 w-3 text-white/60" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-white/60" />
                          )}
                          <span className="text-white/90 font-medium capitalize">
                            {budget.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <span className={cn(
                            "text-[10px] font-semibold px-1 py-0.5 rounded",
                            budget.percent >= 100 ? "bg-red-500/30 text-red-300" :
                            budget.percent >= 75 ? "bg-yellow-500/30 text-yellow-300" :
                            "bg-emerald-500/30 text-emerald-300"
                          )}>
                            {budget.percent}%
                          </span>
                          <span className="text-white/70 text-[10px]">
                            ${budget.spent.toLocaleString()} / ${budget.budgeted.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className={cn("h-2.5 rounded-full overflow-hidden", getProgressBgColor(budget.percent))}>
                        <div 
                          className={cn("h-full rounded-full transition-all duration-500", getProgressColor(budget.percent))}
                          style={{ width: `${Math.min(100, budget.percent)}%` }}
                        />
                      </div>
                    </button>
                    {/* Expanded transaction list */}
                    {expandedCategory === budget.category && (
                      <div className="mt-1.5 ml-4 space-y-1 border-l-2 border-white/10 pl-2">
                        {loadingTransactions ? (
                          <div className="py-2 flex justify-center">
                            <LoadingSpinner size="sm" />
                          </div>
                        ) : categoryTransactions.length > 0 ? (
                          categoryTransactions.map((tx, i) => (
                            <div key={i} className="flex items-center justify-between text-[10px] py-0.5">
                              <div className="flex items-center gap-1 text-white/80 truncate max-w-[60%]">
                                <ShoppingCart className="h-2.5 w-2.5 flex-shrink-0 text-white/50" />
                                <span className="truncate">{tx.title}</span>
                              </div>
                              <span className="text-white/70 font-medium">${Number(tx.amount).toLocaleString()}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] text-white/50 py-1">No transactions this month</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* View All Link */}
                <button 
                  onClick={() => navigate('/budgets')}
                  className="flex items-center justify-center gap-1 w-full mt-3 py-2 text-white/70 hover:text-white text-xs font-medium transition-colors"
                >
                  View all budgets
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center gap-2">
                <div className="w-20 h-20 rounded-xl border-4 border-dashed border-white/30 flex items-center justify-center">
                  <BarChart3 className="h-8 w-8 text-white/40" />
                </div>
                <p className="text-white/80 text-sm font-medium">No budget data yet</p>
                <p className="text-white/50 text-xs">Create budgets to track spending</p>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Chart Toggle */}
      <div className="flex justify-center gap-1.5 sm:gap-2 px-2">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={(e) => { e.stopPropagation(); setActiveView(view.id); }}
            className={cn(
              "flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap",
              activeView === view.id
                ? "bg-white/25 text-white shadow-lg border border-cyan-400/50"
                : "bg-white/10 text-white/80 hover:bg-white/15 hover:text-white border border-cyan-400/20"
            )}
          >
            <view.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{view.label}</span>
          </button>
        ))}
      </div>

      {/* Chart Content */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-4 pb-5 backdrop-blur-sm flex-1 min-h-[20rem] lg:min-h-[28rem] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex-1 min-h-0">
          {renderChart()}
        </div>
        {/* Pie Legend - inside the glass container */}
        {activeView === "pie" && spendingByCategory.length > 0 && (
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3 px-2">
            {spendingByCategory.slice(0, 8).map((item, index) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <span 
                  className="w-2 h-2 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: item.color || CHART_COLORS.categories[index] }}
                />
                <span className="text-[11px] text-white/90 capitalize">{item.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
