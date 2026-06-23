import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import { BarChart3 } from "lucide-react";
import ReportsDatePicker from "@/components/reports/ReportsDatePicker";
import ReportsSummaryCards from "@/components/reports/ReportsSummaryCards";
import QuickStatsGrid from "@/components/reports/QuickStatsGrid";
import FinancialOverviewCharts from "@/components/reports/FinancialOverviewCharts";
import BudgetPerformance from "@/components/reports/BudgetPerformance";
import SavingsGoalsProgress from "@/components/reports/SavingsGoalsProgress";
import WhatIfSimulator from "@/components/reports/WhatIfSimulator";
import ReportsInfoCard from "@/components/reports/ReportsInfoCard";
import FinancialDetailsModal from "@/components/reports/FinancialDetailsModal";
import AIInsightsModal from "@/components/reports/AIInsightsModal";
import ComparePeriodsModal from "@/components/reports/ComparePeriodsModal";
import ScheduleReportModal from "@/components/reports/ScheduleReportModal";
import CustomDateRangeModal from "@/components/reports/CustomDateRangeModal";
import ShareableSummaryCard from "@/components/reports/ShareableSummaryCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { exportToCSV, exportToPDF } from "@/lib/exportReports";
import { toast } from "sonner";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

const Reports = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showFinancialDetails, setShowFinancialDetails] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);
  
  // Financial data state
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [billsDue, setBillsDue] = useState(0);
  const [unpaidBills, setUnpaidBills] = useState(0);
  const [savings, setSavings] = useState(0);
  const [trendData, setTrendData] = useState<{ month: string; income: number; expenses: number }[]>([]);
  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [budgetStats, setBudgetStats] = useState({ onTrack: 0, warning: 0, overBudget: 0, totalBudget: 0, totalSpent: 0 });
  const [goalsData, setGoalsData] = useState({ current: 0, target: 0, monthly: 0, monthsLeft: 0 });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchFinancialData();
    }
  }, [user, selectedDate, customDateRange]);

  const fetchFinancialData = async () => {
    if (!user) return;

    const startDate = customDateRange ? customDateRange.start : startOfMonth(selectedDate);
    const endDate = customDateRange ? customDateRange.end : endOfMonth(selectedDate);

    try {
      // Fetch transactions for the selected month
      const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .gte("transaction_date", format(startDate, "yyyy-MM-dd"))
        .lte("transaction_date", format(endDate, "yyyy-MM-dd"));

      if (transactions) {
        const incomeTotal = transactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const expenseTotal = transactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);
        
        setIncome(incomeTotal);
        setExpenses(expenseTotal);

        // Category breakdown
        const categoryMap = new Map<string, number>();
        transactions
          .filter((t) => t.type === "expense")
          .forEach((t) => {
            const current = categoryMap.get(t.category) || 0;
            categoryMap.set(t.category, current + Number(t.amount));
          });

        const colors = [
          "#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
          "#ec4899", "#6366f1", "#14b8a6", "#f97316", "#84cc16"
        ];
        
        const categories = Array.from(categoryMap.entries())
          .map(([name, value], i) => ({
            name: name.charAt(0).toUpperCase() + name.slice(1),
            value,
            color: colors[i % colors.length],
          }))
          .sort((a, b) => b.value - a.value);
        
        setCategoryData(categories);
      }

      // Fetch bills
      const { data: bills } = await supabase
        .from("bills")
        .select("*")
        .eq("user_id", user.id)
        .gte("due_date", format(startDate, "yyyy-MM-dd"))
        .lte("due_date", format(endDate, "yyyy-MM-dd"));

      if (bills) {
        const totalBillsDue = bills.reduce((sum, b) => sum + Number(b.amount), 0);
        const unpaid = bills.filter((b) => b.status !== "paid").length;
        setBillsDue(totalBillsDue);
        setUnpaidBills(unpaid);
      }

      // Fetch budgets for performance
      const { data: budgets } = await supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true);

      if (budgets) {
        let onTrack = 0, warning = 0, overBudget = 0;
        const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
        const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent), 0);
        budgets.forEach((b) => {
          const percentUsed = (Number(b.spent) / Number(b.amount)) * 100;
          if (percentUsed > 100) overBudget++;
          else if (percentUsed > 80) warning++;
          else onTrack++;
        });
        setBudgetStats({ onTrack, warning, overBudget, totalBudget, totalSpent });
      }

      // Fetch goals
      const { data: goals } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_archived", false);

      if (goals && goals.length > 0) {
        const totalCurrent = goals.reduce((sum, g) => sum + Number(g.current_amount), 0);
        const totalTarget = goals.reduce((sum, g) => sum + Number(g.target_amount), 0);
        setGoalsData({
          current: totalCurrent,
          target: totalTarget,
          monthly: 500, // Default monthly contribution
          monthsLeft: Math.ceil((totalTarget - totalCurrent) / 500),
        });
        setSavings(totalCurrent);
      }

      // Fetch trend data (last 6 months)
      const trends: { month: string; income: number; expenses: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(selectedDate, i);
        const monthStart = startOfMonth(monthDate);
        const monthEnd = endOfMonth(monthDate);

        const { data: monthTx } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", user.id)
          .gte("transaction_date", format(monthStart, "yyyy-MM-dd"))
          .lte("transaction_date", format(monthEnd, "yyyy-MM-dd"));

        if (monthTx) {
          const monthIncome = monthTx
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + Number(t.amount), 0);
          const monthExpense = monthTx
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + Number(t.amount), 0);

          trends.push({
            month: format(monthDate, "MMM"),
            income: monthIncome,
            expenses: monthExpense,
          });
        }
      }
      setTrendData(trends);

    } catch (error) {
      console.error("Error fetching financial data:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading your reports..." />
      </div>
    );
  }

  const netCashFlow = income - expenses;
  const savingsRate = income > 0 ? Math.round(((income - expenses) / income) * 100) : 0;
  // Budget health = % of total budget remaining (consistent across all pages)
  const totalBudgetAmount = budgetStats.totalBudget || 0;
  const totalBudgetSpent = budgetStats.totalSpent || 0;
  const budgetHealth = totalBudgetAmount > 0
    ? Math.max(0, Math.round(((totalBudgetAmount - totalBudgetSpent) / totalBudgetAmount) * 100))
    : 100;
  const goalsProgress = goalsData.target > 0 
    ? Math.round((goalsData.current / goalsData.target) * 100) 
    : 0;

  const handleExportPDF = () => {
    exportToPDF({
      selectedDate,
      income,
      expenses,
      netCashFlow,
      savingsRate,
      budgetHealth,
      categories: categoryData,
      budgetStats,
      trendData,
      goalsData,
    });
    toast.success("PDF report generated");
  };

  const handleExportCSV = () => {
    exportToCSV({
      selectedDate,
      income,
      expenses,
      netCashFlow,
      savingsRate,
      budgetHealth,
      categories: categoryData,
      budgetStats,
      trendData,
      goalsData,
    });
    toast.success("CSV report downloaded");
  };

  const handleCustomDateApply = (start: Date, end: Date) => {
    setCustomDateRange({ start, end });
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setCustomDateRange(null); // Clear custom range when using month navigation
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Financial Reports | CoinsBloom - Insights & Analytics</title>
        <meta name="description" content="View detailed financial reports and analytics with CoinsBloom. Track spending trends, budget performance, and savings progress." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <DashboardHeader />
      
      <PageHeroHeader
        title="Reports & Analytics"
        subtitle="Track your financial progress and trends"
        icon={<BarChart3 className="h-7 w-7" />}
        colorScheme="teal"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl mx-auto"
      >
      <ReportsSummaryCards
        netCashFlow={netCashFlow}
        savingsRate={savingsRate}
        budgetHealth={budgetHealth}
      />

      <ReportsDatePicker 
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
        onAIInsights={() => setShowAIInsights(true)}
        onCompare={() => setShowCompare(true)}
        onSchedule={() => setShowSchedule(true)}
        onCustomDate={() => setShowCustomDate(true)}
        onShare={() => setShowShare(true)}
        customDateRange={customDateRange}
      />

      {/* Floating Financial Details Button */}
      <div className="fixed bottom-[3.75rem] right-4 z-50">
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          onClick={() => setShowFinancialDetails(true)}
        >
          <Calendar className="w-5 h-5 mr-2" />
          Details
        </Button>
      </div>

      <QuickStatsGrid 
        income={income}
        expenses={expenses}
        savingsRate={savingsRate}
        goalsProgress={goalsProgress}
      />

      <FinancialOverviewCharts 
        trendData={trendData}
        categoryData={categoryData}
      />

      <BudgetPerformance 
        onTrack={budgetStats.onTrack}
        warning={budgetStats.warning}
        overBudget={budgetStats.overBudget}
      />

      <SavingsGoalsProgress 
        currentSavings={goalsData.current}
        targetSavings={goalsData.target}
        monthlyContribution={goalsData.monthly}
        monthsToGoal={goalsData.monthsLeft}
      />

      <WhatIfSimulator 
        baseIncome={income}
        baseSavings={savings}
        baseMonthlyNet={netCashFlow}
      />

      <ReportsInfoCard />

      <FinancialDetailsModal
        open={showFinancialDetails}
        onOpenChange={setShowFinancialDetails}
        income={income}
        expenses={expenses}
        billsDue={billsDue}
        unpaidBills={unpaidBills}
        savings={savings}
      />

      <AIInsightsModal
        open={showAIInsights}
        onOpenChange={setShowAIInsights}
        financialData={{
          income,
          expenses,
          netCashFlow,
          savingsRate,
          budgetHealth,
          categories: categoryData,
          budgetStats,
          trendData,
          goalsData: { current: goalsData.current, target: goalsData.target },
          goalsProgress,
        }}
      />

      <ComparePeriodsModal
        open={showCompare}
        onOpenChange={setShowCompare}
        currentDate={selectedDate}
      />

      <ScheduleReportModal
        open={showSchedule}
        onOpenChange={setShowSchedule}
      />

      <CustomDateRangeModal
        open={showCustomDate}
        onOpenChange={setShowCustomDate}
        onApply={handleCustomDateApply}
      />

      <ShareableSummaryCard
        open={showShare}
        onOpenChange={setShowShare}
        data={{
          selectedDate,
          income,
          expenses,
          netCashFlow,
          savingsRate,
          budgetHealth,
          goalsProgress,
        }}
      />

      {/* Bottom padding for mobile nav */}
      <div className="h-24" />
      </motion.div>
    </div>
  );
};

export default Reports;
