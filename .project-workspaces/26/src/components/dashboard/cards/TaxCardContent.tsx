import { useState, useEffect } from "react";
import { FileText, ChevronRight, TrendingUp, TrendingDown, Info, PiggyBank, Heart, Clock, CheckCircle2, Target, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaxDeduction {
  gross_income: number;
  retirement_contributions: number;
  hsa_contributions: number;
  medical_expenses: number;
  mortgage_interest: number;
  state_local_taxes: number;
  education_expenses: number;
  other_deductions: number;
}

interface ScoreItem {
  label: string;
  score: number;
  maxScore: number;
  icon: React.ReactNode;
  status: "complete" | "partial" | "none";
}

// Hook to fetch tax data - shared between collapsed and expanded views
export const useTaxData = () => {
  const { user } = useAuth();
  const [deductions, setDeductions] = useState<TaxDeduction | null>(null);
  const [businessExpenses, setBusinessExpenses] = useState(0);
  const [donations, setDonations] = useState(0);
  const [billTaxDeductions, setBillTaxDeductions] = useState({
    mortgageInterest: 0,
    propertyTax: 0,
    studentLoanInterest: 0,
    medicalExpenses: 0,
  });
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; amount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const currentYear = new Date().getFullYear();
    
    const [deductionsRes, expensesRes, donationsRes, monthlyExpensesRes, billTaxRes] = await Promise.all([
      supabase
        .from("tax_deductions")
        .select("*")
        .eq("user_id", user?.id)
        .eq("tax_year", currentYear)
        .single(),
      supabase
        .from("business_expenses")
        .select("amount")
        .eq("user_id", user?.id)
        .eq("is_deductible", true),
      supabase
        .from("charitable_donations")
        .select("amount")
        .eq("user_id", user?.id)
        .eq("is_tax_eligible", true),
      supabase
        .from("business_expenses")
        .select("amount, expense_date")
        .eq("user_id", user?.id)
        .gte("expense_date", `${currentYear}-01-01`)
        .order("expense_date", { ascending: true }),
      // NEW: Fetch tax details from bills (PITI breakdown, student loan interest, etc.)
      supabase
        .from("bill_tax_details")
        .select("*, bills!inner(frequency)")
        .eq("user_id", user?.id)
        .eq("tax_year", currentYear)
        .eq("is_tax_deductible", true),
    ]);

    setDeductions(deductionsRes.data);
    setBusinessExpenses(
      expensesRes.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0
    );
    setDonations(
      donationsRes.data?.reduce((sum, d) => sum + Number(d.amount), 0) || 0
    );
    
    // Process bill tax details - annualize based on frequency
    if (billTaxRes.data) {
      const annualized = billTaxRes.data.reduce((acc, item) => {
        const multiplier = getAnnualMultiplier(item.bills?.frequency || 'monthly');
        return {
          mortgageInterest: acc.mortgageInterest + (Number(item.interest_amount) || 0) * multiplier,
          propertyTax: acc.propertyTax + (Number(item.property_tax_amount) || 0) * multiplier,
          studentLoanInterest: acc.studentLoanInterest + (Number(item.student_loan_interest) || 0) * multiplier,
          medicalExpenses: acc.medicalExpenses + (item.deduction_category === 'medical_expenses' ? (Number(item.deductible_amount) || 0) * multiplier : 0),
        };
      }, { mortgageInterest: 0, propertyTax: 0, studentLoanInterest: 0, medicalExpenses: 0 });
      
      setBillTaxDeductions(annualized);
    }
    
    // Calculate monthly amounts from real expense data
    if (monthlyExpensesRes.data) {
      const monthlyTotals: Record<string, number> = {};
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      
      monthlyExpensesRes.data.forEach((expense) => {
        const month = new Date(expense.expense_date).getMonth();
        const monthName = monthNames[month];
        monthlyTotals[monthName] = (monthlyTotals[monthName] || 0) + Number(expense.amount);
      });
      
      // Create array with all 12 months, amounts are 0 if no data
      const trend = monthNames.map((month) => ({
        month,
        amount: monthlyTotals[month] || 0,
      }));
      
      setMonthlyTrend(trend);
    }
    
    setLoading(false);
  };

  // Helper to convert bill frequency to annual multiplier
  const getAnnualMultiplier = (frequency: string) => {
    switch (frequency) {
      case 'weekly': return 52;
      case 'biweekly': return 26;
      case 'monthly': return 12;
      case 'quarterly': return 4;
      case 'semi_annual': return 2;
      case 'annual': return 1;
      case 'one_time': return 1;
      default: return 12;
    }
  };

  // Combine deductions from tax_deductions table + bill_tax_details
  const safeNum = (v: unknown) => { const n = Number(v); return isNaN(n) ? 0 : n; };

  const totalDeductions = 
    (deductions
      ? safeNum(deductions.retirement_contributions) +
        safeNum(deductions.hsa_contributions) +
        safeNum(deductions.medical_expenses) +
        safeNum(deductions.mortgage_interest) +
        safeNum(deductions.state_local_taxes) +
        safeNum(deductions.education_expenses) +
        safeNum(deductions.other_deductions)
      : 0) +
    businessExpenses +
    donations +
    // Add bill-based tax deductions (annualized from PITI, student loans, etc.)
    billTaxDeductions.mortgageInterest +
    billTaxDeductions.propertyTax +
    billTaxDeductions.studentLoanInterest +
    billTaxDeductions.medicalExpenses;

  const grossIncome = deductions?.gross_income || 0;

  const getTaxBracket = (income: number) => {
    if (income <= 11600) return 0.10;
    if (income <= 47150) return 0.12;
    if (income <= 100525) return 0.22;
    if (income <= 191950) return 0.24;
    if (income <= 243725) return 0.32;
    if (income <= 609350) return 0.35;
    return 0.37;
  };

  const taxBracket = getTaxBracket(grossIncome);
  const estimatedTaxSavings = Math.round(totalDeductions * taxBracket);

  const retirementContributions = deductions?.retirement_contributions || 0;
  const maxRetirement = 23000;
  const retirementScore = Math.min(25, Math.round((retirementContributions / maxRetirement) * 25));

  const hasExpenses = businessExpenses > 0 || totalDeductions > 0;
  const expenseScore = hasExpenses ? 20 : 0;
  const receiptScore = businessExpenses > 0 ? 20 : (totalDeductions > 0 ? 10 : 0);

  const hsaContributions = deductions?.hsa_contributions || 0;
  const taxAdvantageScore = Math.min(20, Math.round(((retirementContributions + hsaContributions) / 30000) * 20));

  const deductionTypes = [
    deductions?.medical_expenses,
    deductions?.mortgage_interest,
    deductions?.state_local_taxes,
    deductions?.education_expenses,
    donations,
    businessExpenses,
  ].filter(d => d && d > 0).length;
  const diversityScore = Math.min(15, deductionTypes * 2.5);

  const totalScore = retirementScore + expenseScore + receiptScore + taxAdvantageScore + diversityScore;
  const maxScore = 100;
  const scorePercentage = Math.round((totalScore / maxScore) * 100);

  const remainingRetirement = Math.max(0, maxRetirement - retirementContributions);
  const retirementPotentialSavings = Math.round(remainingRetirement * taxBracket);
  const charitablePotentialSavings = Math.round(grossIncome * 0.001 * taxBracket);
  const totalPotentialSavings = retirementPotentialSavings + charitablePotentialSavings;

  // Check if trend is increasing (compare first half avg to second half avg)
  const monthlyAmounts = monthlyTrend.map(t => t.amount);
  const firstHalf = monthlyAmounts.slice(0, 6).reduce((a, b) => a + b, 0);
  const secondHalf = monthlyAmounts.slice(6).reduce((a, b) => a + b, 0);
  const isTrendIncreasing = secondHalf >= firstHalf;

  const scoreItems: ScoreItem[] = [
    {
      label: "Retirement Contributions",
      score: retirementScore,
      maxScore: 25,
      icon: <Clock className="h-5 w-5 text-yellow-500" />,
      status: retirementScore === 25 ? "complete" : retirementScore > 0 ? "partial" : "none",
    },
    {
      label: "Expense Categorization",
      score: expenseScore,
      maxScore: 20,
      icon: expenseScore === 20 ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-yellow-500" />,
      status: expenseScore === 20 ? "complete" : expenseScore > 0 ? "partial" : "none",
    },
    {
      label: "Receipt Tracking",
      score: receiptScore,
      maxScore: 20,
      icon: receiptScore === 20 ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-yellow-500" />,
      status: receiptScore === 20 ? "complete" : receiptScore > 0 ? "partial" : "none",
    },
    {
      label: "Tax-Advantaged Accounts",
      score: taxAdvantageScore,
      maxScore: 20,
      icon: <Clock className="h-5 w-5 text-yellow-500" />,
      status: taxAdvantageScore === 20 ? "complete" : taxAdvantageScore > 0 ? "partial" : "none",
    },
    {
      label: "Deduction Diversity",
      score: Math.round(diversityScore),
      maxScore: 15,
      icon: <Clock className="h-5 w-5 text-yellow-500" />,
      status: diversityScore === 15 ? "complete" : diversityScore > 0 ? "partial" : "none",
    },
  ];

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  return {
    loading,
    scorePercentage,
    monthlyTrend,
    isTrendIncreasing,
    totalDeductions,
    estimatedTaxSavings,
    totalPotentialSavings,
    retirementPotentialSavings,
    charitablePotentialSavings,
    scoreItems,
    taxBracket,
    formatCurrency,
    remainingRetirement,
    grossIncome,
  };
};

// Collapsed view - shows in the compact card
export const TaxCardContent = () => {
  const {
    loading,
    monthlyTrend,
    isTrendIncreasing,
    totalDeductions,
    estimatedTaxSavings,
    formatCurrency,
  } = useTaxData();

  const [selectedMonth, setSelectedMonth] = useState<{ month: string; amount: number } | null>(null);

  if (loading) {
    return <div className="animate-pulse h-24 bg-muted rounded" />;
  }

  // Find max amount to calculate relative bar heights (minimum 1 to avoid division by zero)
  const maxAmount = Math.max(...monthlyTrend.map(t => t.amount), 1);
  
  // Check if there's any data at all
  const hasAnyData = monthlyTrend.some(t => t.amount > 0);

  const handleBarClick = (item: { month: string; amount: number }) => {
    setSelectedMonth(selectedMonth?.month === item.month ? null : item);
  };

  return (
    <div className="space-y-2">
      {/* Subtitle */}
      <p className="text-sm text-muted-foreground">Real-time tax intelligence & savings</p>

      {/* Stats Row */}
      <div className="flex justify-between items-center">
        <p className="text-2xl font-bold">{formatCurrency(totalDeductions)}</p>
        <p className="text-2xl font-bold text-green-500">{formatCurrency(estimatedTaxSavings)}</p>
      </div>

      {/* Monthly Deduction Trend */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Monthly Deduction Trend</span>
          <span className={`text-sm flex items-center gap-1 ${isTrendIncreasing ? 'text-green-500' : 'text-red-500'}`}>
            {isTrendIncreasing ? (
              <>
                <TrendingUp className="h-4 w-4" />
                Increasing
              </>
            ) : (
              <>
                <TrendingDown className="h-4 w-4" />
                Decreasing
              </>
            )}
          </span>
        </div>
        
        {/* Selected month detail */}
        {selectedMonth && (
          <div className="text-center py-1.5 px-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              {selectedMonth.month}: {formatCurrency(selectedMonth.amount)}
            </span>
          </div>
        )}
        
        {/* Scrollable bar chart - dynamic heights based on actual data */}
        <TooltipProvider delayDuration={100}>
          <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            <div className="flex gap-2 h-14 items-end min-w-max">
              {monthlyTrend.map((item) => {
                // Calculate bar height: minimum 4px, maximum 40px (h-10)
                const barHeight = hasAnyData 
                  ? Math.max(4, Math.round((item.amount / maxAmount) * 40))
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
                              ? 'bg-purple-700 ring-2 ring-purple-400' 
                              : item.amount > 0 
                                ? 'bg-purple-500 hover:bg-purple-600' 
                                : 'bg-purple-300 dark:bg-purple-800 hover:bg-purple-400 dark:hover:bg-purple-700'
                          }`}
                          style={{ height: `${barHeight}px` }}
                        />
                        <span className={`text-[10px] ${isSelected ? 'text-purple-700 dark:text-purple-300 font-semibold' : 'text-muted-foreground'}`}>
                          {item.month}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-purple-600 text-white border-purple-600">
                      <p className="font-medium">{item.month}: {formatCurrency(item.amount)}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
};

// Expanded view - shows in the modal/sheet
export const TaxCardExpandedContent = () => {
  const navigate = useNavigate();
  const {
    loading,
    scorePercentage,
    monthlyTrend,
    isTrendIncreasing,
    totalDeductions,
    estimatedTaxSavings,
    totalPotentialSavings,
    retirementPotentialSavings,
    charitablePotentialSavings,
    scoreItems,
    taxBracket,
    formatCurrency,
    remainingRetirement,
    grossIncome,
  } = useTaxData();

  const [selectedMonth, setSelectedMonth] = useState<{ month: string; amount: number } | null>(null);

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded" />;
  }

  // Find max amount to calculate relative bar heights
  const maxAmount = Math.max(...monthlyTrend.map(t => t.amount), 1);
  const hasAnyData = monthlyTrend.some(t => t.amount > 0);
  const donationAmount = Math.round(grossIncome * 0.001);

  const handleBarClick = (item: { month: string; amount: number }) => {
    setSelectedMonth(selectedMonth?.month === item.month ? null : item);
  };

  return (
    <div className="space-y-6 p-2">
      {/* Enlarged Compact Card Content */}
      <div className="p-4 rounded-2xl bg-muted/30 border space-y-4">
        <p className="text-base text-muted-foreground">Real-time tax intelligence & savings</p>

        {/* Stats Row */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-muted-foreground">Total Deductions</p>
            <p className="text-3xl font-bold">{formatCurrency(totalDeductions)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Estimated Savings</p>
            <p className="text-3xl font-bold text-green-500">{formatCurrency(estimatedTaxSavings)}</p>
          </div>
        </div>

        {/* Monthly Deduction Trend */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Monthly Deduction Trend</span>
            <span className={`text-sm flex items-center gap-1 ${isTrendIncreasing ? 'text-green-500' : 'text-red-500'}`}>
              {isTrendIncreasing ? (
                <>
                  <TrendingUp className="h-4 w-4" />
                  Increasing
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4" />
                  Decreasing
                </>
              )}
            </span>
          </div>
          
          {selectedMonth && (
            <div className="text-center py-1.5 px-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                {selectedMonth.month}: {formatCurrency(selectedMonth.amount)}
              </span>
            </div>
          )}
          
          <TooltipProvider delayDuration={100}>
            <div className="overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
              <div className="flex gap-2 h-16 items-end min-w-max">
                {monthlyTrend.map((item) => {
                  const barHeight = hasAnyData 
                    ? Math.max(6, Math.round((item.amount / maxAmount) * 48))
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
                                ? 'bg-purple-700 ring-2 ring-purple-400' 
                                : item.amount > 0 
                                  ? 'bg-purple-500 hover:bg-purple-600' 
                                  : 'bg-purple-300 dark:bg-purple-800 hover:bg-purple-400 dark:hover:bg-purple-700'
                            }`}
                            style={{ height: `${barHeight}px` }}
                          />
                          <span className={`text-xs ${isSelected ? 'text-purple-700 dark:text-purple-300 font-semibold' : 'text-muted-foreground'}`}>
                            {item.month}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-purple-600 text-white border-purple-600">
                        <p className="font-medium">{item.month}: {formatCurrency(item.amount)}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* Large Score Circle */}
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
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="#eab308"
              strokeWidth="2"
              strokeDasharray={`${scorePercentage * 0.88}, 100`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-yellow-600">
              {scorePercentage}%
            </span>
            <span className="text-base text-muted-foreground">Optimization</span>
            <span className="text-base text-muted-foreground">Score</span>
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="p-5 rounded-2xl bg-muted/30 space-y-4">
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          <span className="text-lg font-bold">Score Breakdown</span>
        </div>
        {scoreItems.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            {item.icon}
            <span className="flex-1 text-base">{item.label}</span>
            <div className="w-28 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-600 rounded-full transition-all"
                style={{ width: `${(item.score / item.maxScore) * 100}%` }}
              />
            </div>
            <span className="text-base font-semibold w-14 text-right">
              {item.score}/{item.maxScore}
            </span>
          </div>
        ))}
      </div>

      {/* Potential Annual Savings */}
      {totalPotentialSavings > 0 && (
        <div className="p-5 rounded-2xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-lg font-semibold">Potential Annual Savings</span>
            </div>
            <span className="text-3xl font-bold text-green-600">{formatCurrency(totalPotentialSavings)}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Based on your {Math.round(taxBracket * 100)}% tax bracket and optimization opportunities
          </p>
        </div>
      )}

      {/* How to Improve */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-purple-500" />
          <span className="text-lg font-bold">How to Improve</span>
        </div>

        {retirementPotentialSavings > 0 && (
          <div className="p-5 rounded-2xl bg-muted/50 border">
            <div className="flex items-start gap-4 mb-3">
              <div className="p-2.5 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <PiggyBank className="h-6 w-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold">Max Out 401(k)</h4>
                <p className="text-sm text-muted-foreground">
                  Contribute {formatCurrency(remainingRetirement)} more to save {formatCurrency(retirementPotentialSavings)}
                </p>
              </div>
            </div>
            <span className="inline-block text-sm font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-1.5 rounded-full">
              Save {formatCurrency(retirementPotentialSavings)}
            </span>
          </div>
        )}

        {charitablePotentialSavings > 0 && (
          <div className="p-5 rounded-2xl bg-muted/50 border">
            <div className="flex items-start gap-4 mb-3">
              <div className="p-2.5 rounded-xl bg-pink-100 dark:bg-pink-900/30">
                <Heart className="h-6 w-6 text-pink-600" />
              </div>
              <div className="flex-1">
                <h4 className="text-lg font-semibold">Increase Charitable Giving</h4>
                <p className="text-sm text-muted-foreground">
                  Donate {formatCurrency(donationAmount)} to save {formatCurrency(charitablePotentialSavings)}
                </p>
              </div>
            </div>
            <span className="inline-block text-sm font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-4 py-1.5 rounded-full">
              Save {formatCurrency(charitablePotentialSavings)}
            </span>
          </div>
        )}
      </div>

      {/* View Full Report Button */}
      <Button 
        className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 text-white text-lg font-semibold"
        onClick={() => navigate("/advanced-tools")}
      >
        <FileText className="h-5 w-5 mr-2" />
        View Full Tax Report
      </Button>
    </div>
  );
};
