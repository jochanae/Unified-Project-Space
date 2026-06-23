import React, { useState, useEffect } from "react";
import { BloomCoachTip } from "@/components/shared/BloomCoachTip";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import AvatarStack from "@/components/goals/AvatarStack";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Home,
  Wallet,
  Plus,
  PieChart,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  Edit,
  Trash2,
  DollarSign,
  RefreshCw,
  History,
  Copy,
  Sparkles,
  BarChart3,
  Download,
  AlertCircle,
  Calendar,
  LayoutGrid,
  List,
  Users,
  Target,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Legend } from "recharts";
import CreateBudgetModal from "@/components/budgets/CreateBudgetModal";
import BudgetTemplatesModal from "@/components/budgets/BudgetTemplatesModal";
import AddExpenseModal from "@/components/budgets/AddExpenseModal";
import BudgetTransactionHistory from "@/components/budgets/BudgetTransactionHistory";
import MonthlyResetModal from "@/components/budgets/MonthlyResetModal";
import InviteBudgetCollaboratorModal from "@/components/budgets/InviteBudgetCollaboratorModal";
import BloomBurstsSection from "@/components/budgets/BloomBurstsSection";
import { EditBudgetModal } from "@/components/budgets/EditBudgetModal";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { BudgetInsightsModal } from "@/components/budgets/BudgetInsightsModal";
import { BudgetAnalyticsModal } from "@/components/budgets/BudgetAnalyticsModal";
import { BudgetAlertsModal } from "@/components/budgets/BudgetAlertsModal";
import { EnvelopeAllocationBar } from "@/components/budgets/EnvelopeAllocationBar";
import BudgetTrendChart from "@/components/budgets/BudgetTrendChart";
import { MoveMoneyModal } from "@/components/budgets/MoveMoneyModal";
import { BudgetingGuide } from "@/components/budgets/BudgetingGuide";
import { exportBudgetsToCSV, exportBudgetsToPDF } from "@/lib/budgetsExport";
import { BUDGET_CATEGORY_COLORS, BUDGET_CATEGORY_EMOJIS } from "@/lib/budgetColors";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { useBudgetBills } from "@/hooks/useBudgetBills";
import { Receipt } from "lucide-react";
import BillsBudgetMapping from "@/components/budgets/BillsBudgetMapping";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Use shared constants
const categoryColors = BUDGET_CATEGORY_COLORS;
const categoryEmojis = BUDGET_CATEGORY_EMOJIS;

interface Budget {
  id: string;
  name: string;
  category: string;
  amount: number;
  spent: number;
  period: string;
  is_active: boolean;
  start_date: string;
  linked_goal_id?: string | null;
  auto_contribute?: boolean;
  contribution_percent?: number;
}

interface Goal {
  id: string;
  title: string;
}

interface BudgetCollaborator {
  id: string;
  budget_id: string;
  user_id: string;
  role: string;
  profile?: {
    first_name: string | null;
    last_name: string | null;
    profile_image_url: string | null;
  };
}

const Budgets = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetCollaborators, setBudgetCollaborators] = useState<Record<string, BudgetCollaborator[]>>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showMoveMoneyModal, setShowMoveMoneyModal] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">("grid");
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [ownerProfile, setOwnerProfile] = useState<{ first_name: string | null; last_name: string | null; profile_image_url: string | null } | null>(null);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [isIncomeFromTransactions, setIsIncomeFromTransactions] = useState(false);

  const months = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  const years = ["2024", "2025", "2026"];

  const numMonth = Number(selectedMonth);
  const numYear = Number(selectedYear);
  const { bills, getCommittedAmount, totalCommitted, loading: billsLoading } = useBudgetBills(numMonth, numYear);

  useEffect(() => {
    if (user) {
      fetchBudgets();
      fetchGoals();
      fetchOwnerProfile();
    }
  }, [user]);

  // Refetch income when month/year selectors change
  useEffect(() => {
    if (user) {
      fetchMonthlyIncome();
    }
  }, [user, selectedMonth, selectedYear]);

  const fetchOwnerProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name, profile_image_url")
        .eq("id", user.id)
        .single();
      
      if (!error && data) {
        setOwnerProfile(data);
      }
    } catch (error) {
      console.error("Error fetching owner profile:", error);
    }
  };

  const fetchMonthlyIncome = async () => {
    if (!user) return;
    const m = Number(selectedMonth);
    const y = Number(selectedYear);
    const monthStart = `${y}-${String(m).padStart(2, '0')}-01`;
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    const monthEnd = `${nextY}-${String(nextM).padStart(2, '0')}-01`;
    
    try {
      // Check for manual override first
      const { data: manualData, error: manualError } = await supabase
        .from("monthly_income")
        .select("total_income")
        .eq("user_id", user.id)
        .eq("month", m)
        .eq("year", y)
        .maybeSingle();
      
      if (!manualError && manualData) {
        setMonthlyIncome(Number(manualData.total_income));
        setIsIncomeFromTransactions(false);
        return;
      }

      // Fall back to actual income transactions for this month
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("type", "income")
        .gte("transaction_date", monthStart)
        .lt("transaction_date", monthEnd);
      
      if (!txError && txData && txData.length > 0) {
        const totalFromTx = txData.reduce((sum, t) => sum + Number(t.amount), 0);
        setMonthlyIncome(totalFromTx);
        setIsIncomeFromTransactions(true);
      } else {
        setMonthlyIncome(0);
        setIsIncomeFromTransactions(false);
      }
    } catch (error) {
      console.error("Error fetching monthly income:", error);
    }
  };

  const handleIncomeChange = async (newIncome: number) => {
    if (!user) return;
    setIncomeLoading(true);
    const currentMonth = Number(selectedMonth);
    const currentYear = Number(selectedYear);
    
    try {
      const { error } = await supabase
        .from("monthly_income")
        .upsert({
          user_id: user.id,
          month: currentMonth,
          year: currentYear,
          total_income: newIncome,
        }, {
          onConflict: "user_id,month,year"
        });
      
      if (error) throw error;
      setMonthlyIncome(newIncome);
      setIsIncomeFromTransactions(false);
      toast.success("Monthly income updated");
    } catch (error) {
      console.error("Error updating monthly income:", error);
      toast.error("Failed to update income");
    } finally {
      setIncomeLoading(false);
    }
  };

  const handleMoveMoney = async (fromId: string, toId: string, amount: number) => {
    // Move money by adjusting budget amounts
    const fromBudget = budgets.find(b => b.id === fromId);
    const toBudget = budgets.find(b => b.id === toId);
    
    if (!fromBudget || !toBudget) {
      throw new Error("Budget not found");
    }

    // Update from budget (reduce amount)
    const { error: fromError } = await supabase
      .from("budgets")
      .update({ amount: fromBudget.amount - amount })
      .eq("id", fromId);
    
    if (fromError) throw fromError;

    // Update to budget (increase amount)
    const { error: toError } = await supabase
      .from("budgets")
      .update({ amount: toBudget.amount + amount })
      .eq("id", toId);
    
    if (toError) throw toError;

    // Refresh budgets
    fetchBudgets();
  };

  const fetchBudgets = async () => {
    try {
      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBudgets(data || []);
      
      // Fetch collaborators for all budgets
      if (data && data.length > 0) {
        fetchCollaborators(data.map(b => b.id));
      }
    } catch (error) {
      console.error("Error fetching budgets:", error);
      toast.error("Failed to load budgets");
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaborators = async (budgetIds: string[]) => {
    try {
      const { data: collabData, error } = await supabase
        .from("budget_collaborators")
        .select("id, budget_id, user_id, role")
        .in("budget_id", budgetIds);

      if (error) throw error;
      
      // Fetch profiles for collaborators
      const collaboratorMap: Record<string, BudgetCollaborator[]> = {};
      
      for (const collab of collabData || []) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("first_name, last_name, profile_image_url")
          .eq("id", collab.user_id)
          .single();

        const collaborator: BudgetCollaborator = {
          ...collab,
          profile: profileData || undefined,
        };

        if (!collaboratorMap[collab.budget_id]) {
          collaboratorMap[collab.budget_id] = [];
        }
        collaboratorMap[collab.budget_id].push(collaborator);
      }
      
      setBudgetCollaborators(collaboratorMap);
    } catch (error) {
      console.error("Error fetching collaborators:", error);
    }
  };

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("id, title")
        .eq("is_archived", false);
      
      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Error fetching goals:", error);
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, userId: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) {
      // Single name - just use first letter
      return firstName[0].toUpperCase();
    }
    return "U";
  };

  const getLinkedGoalName = (goalId: string | null | undefined) => {
    if (!goalId) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal?.title || null;
  };

  const handleDeleteBudget = async (budgetId: string) => {
    try {
      const { error } = await supabase
        .from("budgets")
        .delete()
        .eq("id", budgetId);

      if (error) throw error;
      toast.success("Budget deleted");
      fetchBudgets();
    } catch (error) {
      console.error("Error deleting budget:", error);
      toast.error("Failed to delete budget");
    }
  };

  const totalBudget = budgets.reduce((sum, b) => sum + Number(b.amount), 0);
  const totalSpent = budgets.reduce((sum, b) => sum + Number(b.spent), 0);
  const totalRemaining = totalBudget - totalSpent;
  const overallProgress = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Pie chart data
  const chartData = budgets.map((b) => ({
    name: b.name,
    value: Number(b.spent),
    color: categoryColors[b.category] || categoryColors.other,
  }));

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading your budgets..." />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Wallet className="h-16 w-16 text-primary mb-4" />
        <h2 className="text-xl font-bold mb-2">Sign in to manage budgets</h2>
        <Button onClick={() => navigate("/auth")}>Sign In</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>Budgets | CoinsBloom - Manage Your Monthly Spending</title>
        <meta name="description" content="Create and manage monthly budgets with CoinsBloom. Track spending by category, set limits, and stay on top of your finances." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <DashboardHeader />
      {/* Hero Header */}
      <PageHeroHeader
        title="Budgets"
        subtitle="Track spending and stay on top of your budget"
        icon={<PieChart className="h-6 w-6 text-[hsl(320,80%,75%)]" />}
        colorScheme="purple"
      />

      <BloomCoachTip
        example="Create a $500 food budget for this month"
        dismissKey="bloom_tip_budgets"
      />

      {/* Budget Trend Chart - full bleed */}
      <BudgetTrendChart />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 mt-4 space-y-4 max-w-6xl mx-auto"
      >
        {/* Envelope Allocation Bar */}
        <EnvelopeAllocationBar
          totalIncome={monthlyIncome}
          totalAllocated={totalBudget}
          onIncomeChange={handleIncomeChange}
          isLoading={incomeLoading}
          onAssignClick={() => setShowCreateModal(true)}
          isFromTransactions={isIncomeFromTransactions}
        />

        {/* Header with New Button */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-primary">Budget by Category</h2>
              {(Number(selectedYear) > new Date().getFullYear() || 
                (Number(selectedYear) === new Date().getFullYear() && Number(selectedMonth) > new Date().getMonth() + 1)) && (
                <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-dashed border-purple-300 text-[10px] px-1.5 py-0">
                  Projected
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(Number(selectedYear), Number(selectedMonth) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowMoveMoneyModal(true)}
              title="Move money between envelopes"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className={showHistory ? "bg-primary/10" : ""}
            >
              <History className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowResetModal(true)}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4 text-center">
              <DollarSign className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
              <p className="text-lg font-bold">${totalBudget.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Budget</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <TrendingDown className="h-5 w-5 mx-auto text-red-500 mb-1" />
                    <p className="text-lg font-bold text-red-500">${totalSpent.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Actual Spending
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs">Only confirmed transactions recorded this month. Does not include upcoming bills.</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Receipt className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                    <p className="text-lg font-bold text-amber-500">${totalCommitted.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Upcoming Bills
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-amber-300 text-amber-600 dark:text-amber-400">Projected</Badge>
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="text-xs">Unpaid bills due this month that haven't been paid yet. These are projected obligations, not yet spent.</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <TrendingUp className={`h-5 w-5 mx-auto mb-1 ${(totalRemaining - totalCommitted) < 0 ? "text-red-500" : "text-green-500"}`} />
                    <p className={`text-lg font-bold ${(totalRemaining - totalCommitted) < 0 ? "text-red-500" : "text-green-500"}`}>
                      ${Math.abs(totalRemaining - totalCommitted).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(totalRemaining - totalCommitted) < 0 ? "Over-committed" : "Truly Available"}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[220px]">
                  <p className="text-xs">Budget minus actual spending minus upcoming bills. This is what you can freely spend this month.</p>
                </TooltipContent>
              </Tooltip>
            </CardContent>
          </Card>
        </div>

        {/* Bills → Budget Category Mapping */}
        <BillsBudgetMapping bills={bills} budgets={budgets} />

        {/* Spending Chart */}
        {budgets.length > 0 && totalSpent > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Spending Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="40%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend
                      wrapperStyle={{ fontSize: '12px', lineHeight: '20px' }}
                      formatter={(value) => (
                        <span className="text-xs text-foreground">{value}</span>
                      )}
                    />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overall Progress */}
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Overall Spending</span>
              <span className="text-sm font-bold">{overallProgress.toFixed(0)}%</span>
            </div>
            <Progress 
              value={overallProgress} 
              className={`h-3 ${overallProgress > 90 ? "[&>div]:bg-red-500" : overallProgress > 75 ? "[&>div]:bg-yellow-500" : ""}`}
            />
            <p className="text-xs text-muted-foreground mt-2">
              ${totalSpent.toLocaleString()} of ${totalBudget.toLocaleString()} spent
            </p>
          </CardContent>
        </Card>

        {/* Quick Action Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="flex-shrink-0 bg-green-500 hover:bg-green-600 rounded-xl h-16 w-20 flex-col gap-1"
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs">Add Budget</span>
          </Button>
          <Button 
            onClick={() => setShowTemplatesModal(true)}
            className="flex-shrink-0 bg-green-600 hover:bg-green-700 rounded-xl h-16 w-20 flex-col gap-1"
          >
            <Copy className="h-5 w-5" />
            <span className="text-xs">Templates</span>
          </Button>
          <Button 
            onClick={() => setShowMoveMoneyModal(true)}
            className="flex-shrink-0 bg-indigo-500 hover:bg-indigo-600 rounded-xl h-16 w-20 flex-col gap-1"
          >
            <ArrowLeftRight className="h-5 w-5" />
            <span className="text-xs">Move $</span>
          </Button>
          <Button 
            onClick={() => setShowInsightsModal(true)}
            className="flex-shrink-0 bg-teal-500 hover:bg-teal-600 rounded-xl h-16 w-20 flex-col gap-1"
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-xs">Insights</span>
          </Button>
          <Button 
            onClick={() => setShowAnalyticsModal(true)}
            className="flex-shrink-0 bg-orange-500 hover:bg-orange-600 rounded-xl h-16 w-20 flex-col gap-1"
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Analytics</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex-shrink-0 bg-orange-600 hover:bg-orange-700 rounded-xl h-16 w-20 flex-col gap-1">
                <Download className="h-5 w-5" />
                <span className="text-xs">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => {
                exportBudgetsToCSV(budgets);
                toast.success("Budgets exported to CSV");
              }}>
                📊 Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                exportBudgetsToPDF(budgets);
                toast.success("Generating PDF report...");
              }}>
                📄 Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button 
            onClick={() => setShowAlertsModal(true)}
            className="flex-shrink-0 bg-red-500 hover:bg-red-600 rounded-xl h-16 w-20 flex-col gap-1"
          >
            <AlertCircle className="h-5 w-5" />
            <span className="text-xs">Alerts</span>
          </Button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="border-purple-300 text-purple-600">
            Today
          </Button>
        </div>

        {/* View Tabs */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="grid" className="flex-1 gap-1">
              <LayoutGrid className="h-4 w-4" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="list" className="flex-1 gap-1">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 gap-1">
              <Calendar className="h-4 w-4" />
              Calendar
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Budget List */}
        <div className="space-y-3">
          {budgets.length === 0 ? (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-8 text-center animate-fade-in">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">No Budgets Yet</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
                  Create your first budget to start tracking spending and reach your financial goals
                </p>
                <Button onClick={() => setShowCreateModal(true)} className="gradient-primary text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Budget
                </Button>
              </CardContent>
            </Card>
          ) : (
            budgets.map((budget) => {
              const progress = budget.amount > 0 ? (Number(budget.spent) / Number(budget.amount)) * 100 : 0;
              const isOverBudget = progress > 100;
              const isWarning = progress > 75 && progress <= 100;

              return (
                <Card 
                  key={budget.id} 
                  className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/budgets/${budget.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${categoryColors[budget.category]}20` }}
                        >
                          {categoryEmojis[budget.category]}
                        </div>
                        <div>
                          <h3 className="font-semibold">{budget.name}</h3>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="secondary" className="text-xs capitalize">
                              {budget.category}
                            </Badge>
                            {budget.linked_goal_id && (
                              <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                <Target className="h-3 w-3 mr-1" />
                                {getLinkedGoalName(budget.linked_goal_id) || "Goal"}
                              </Badge>
                            )}
                            {budgetCollaborators[budget.id]?.length > 0 && (
                              <Badge className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                <Users className="h-3 w-3 mr-1" />
                                Shared
                              </Badge>
                            )}
                          </div>
                          {/* Collaborator Avatars with Add Button */}
                          <div 
                            className="flex items-center gap-1 mt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <AvatarStack
                              avatars={[
                                { 
                                  id: "owner", 
                                  name: ownerProfile?.first_name && ownerProfile?.last_name 
                                    ? `${ownerProfile.first_name} ${ownerProfile.last_name}`
                                    : ownerProfile?.first_name || "You", 
                                  imageUrl: ownerProfile?.profile_image_url || null 
                                },
                                ...(budgetCollaborators[budget.id]?.map((collab) => ({
                                  id: collab.id,
                                  name: collab.profile?.first_name && collab.profile?.last_name
                                    ? `${collab.profile.first_name} ${collab.profile.last_name}`
                                    : collab.profile?.first_name || "User",
                                  imageUrl: collab.profile?.profile_image_url || null,
                                })) || []),
                              ]}
                              size="sm"
                              maxDisplay={4}
                              showAddButton={true}
                              onAddClick={() => {
                                setSelectedBudget(budget);
                                setShowCollaboratorModal(true);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBudget(budget);
                              setShowExpenseModal(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Expense
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedBudget(budget);
                              setShowCollaboratorModal(true);
                            }}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Manage Collaborators
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            setSelectedBudget(budget);
                            setShowEditModal(true);
                          }}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Budget
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDeleteBudget(budget.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className={isOverBudget ? "text-red-500 font-medium" : "text-muted-foreground"}>
                          ${Number(budget.spent).toLocaleString()} spent
                        </span>
                        <span className="font-semibold">
                          ${Number(budget.amount).toLocaleString()}
                        </span>
                      </div>
                      <Progress
                        value={Math.min(progress, 100)}
                        className={`h-2 ${isOverBudget ? "[&>div]:bg-red-500" : isWarning ? "[&>div]:bg-yellow-500" : ""}`}
                      />
                      <div className="flex justify-between text-xs">
                        <span className={isOverBudget ? "text-red-500" : "text-muted-foreground"}>
                          {progress.toFixed(0)}%
                        </span>
                        <span className={isOverBudget ? "text-red-500" : "text-green-500"}>
                          {isOverBudget
                            ? `$${(Number(budget.spent) - Number(budget.amount)).toLocaleString()} over`
                            : `$${(Number(budget.amount) - Number(budget.spent)).toLocaleString()} left`}
                        </span>
                      </div>
                      {/* Upcoming bills for this category */}
                      {(() => {
                        const committed = getCommittedAmount(budget.category);
                        if (committed <= 0) return null;
                        const remaining = Number(budget.amount) - Number(budget.spent);
                        const afterBills = remaining - committed;
                        return (
                          <div className={`flex items-center justify-between text-xs mt-1 px-2 py-1 rounded ${
                            afterBills < 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-amber-50 dark:bg-amber-950/20"
                          }`}>
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Receipt className="h-3 w-3" />
                              ${committed.toLocaleString()} in bills
                            </span>
                            <span className={afterBills < 0 ? "text-red-500 font-medium" : "text-amber-600 dark:text-amber-400 font-medium"}>
                              {afterBills < 0 ? `-$${Math.abs(afterBills).toLocaleString()} over` : `$${afterBills.toLocaleString()} after`}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    <Button
                      className="w-full mt-3"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBudget(budget);
                        setShowExpenseModal(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Log Expense
                    </Button>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Bloom Bursts Section */}
        {isFeatureEnabled("bloom_bursts") && <BloomBurstsSection />}

        {/* How to Use Budgets Guide */}
        <BudgetingGuide />

        {/* Transaction History */}
        {showHistory && (
          <BudgetTransactionHistory />
        )}
      </motion.div>

      {/* Modals */}
      <CreateBudgetModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={fetchBudgets}
      />

      <BudgetTemplatesModal
        open={showTemplatesModal}
        onOpenChange={setShowTemplatesModal}
        onSuccess={fetchBudgets}
      />

      {selectedBudget && (
        <AddExpenseModal
          open={showExpenseModal}
          onOpenChange={setShowExpenseModal}
          budget={selectedBudget}
          onSuccess={fetchBudgets}
        />
      )}

      <MonthlyResetModal
        open={showResetModal}
        onOpenChange={setShowResetModal}
        onSuccess={fetchBudgets}
      />

      {selectedBudget && (
        <InviteBudgetCollaboratorModal
          open={showCollaboratorModal}
          onOpenChange={setShowCollaboratorModal}
          budgetId={selectedBudget.id}
          budgetName={selectedBudget.name}
        />
      )}

      {selectedBudget && (
        <EditBudgetModal
          open={showEditModal}
          onOpenChange={(open) => {
            setShowEditModal(open);
            if (!open) setSelectedBudget(null);
          }}
          budget={selectedBudget}
          onSuccess={fetchBudgets}
        />
      )}

      {/* Insights Modal */}
      <BudgetInsightsModal
        open={showInsightsModal}
        onOpenChange={setShowInsightsModal}
        budgets={budgets}
      />

      {/* Analytics Modal */}
      <BudgetAnalyticsModal
        open={showAnalyticsModal}
        onOpenChange={setShowAnalyticsModal}
        budgets={budgets}
      />

      {/* Alerts Modal */}
      <BudgetAlertsModal
        open={showAlertsModal}
        onOpenChange={setShowAlertsModal}
        budgets={budgets}
      />

      {/* Move Money Modal */}
      <MoveMoneyModal
        open={showMoveMoneyModal}
        onOpenChange={setShowMoveMoneyModal}
        budgets={budgets}
        onMoveMoney={handleMoveMoney}
      />
    </div>
  );
};

export default Budgets;
