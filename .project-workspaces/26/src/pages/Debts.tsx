import { useEffect, useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import coinsbloomLogo from "@/assets/coinsbloom-logo.png";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";
import {
  Clock,
  TrendingDown,
  Plus,
  Download,
  Snowflake,
  Zap,
  Calculator,
  Target,
  Scissors,
  CreditCard,
  AlertCircle,
  FileText,
  CheckCircle,
  History,
  Edit2,
  Trash2,
  DollarSign,
  TrendingUp,
  Lightbulb,
  Phone,
  Calendar,
  Gift,
  ChevronDown,
  ChevronUp,
  Upload,
  HelpCircle,
  BarChart3,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DebtCard } from "@/components/debts/DebtCard";
import { AddDebtModal } from "@/components/debts/AddDebtModal";
import { ImportAccountModal } from "@/components/debts/ImportAccountModal";
import { DTICalculator } from "@/components/debts/DTICalculator";
import { PayoffStrategyCalculator } from "@/components/debts/PayoffStrategyCalculator";
import { EarlyPayoffCalculator } from "@/components/debts/EarlyPayoffCalculator";
import { CSVImportModal } from "@/components/shared/CSVImportModal";
import DebtTrendChart from "@/components/debts/DebtTrendChart";

interface Debt {
  id: string;
  name: string;
  creditor: string | null;
  linked_account_id: string | null;
  original_balance: number;
  current_balance: number;
  interest_rate: number;
  minimum_payment: number;
  due_day: number | null;
  debt_type: string;
  status: string;
  priority_order: number | null;
  notes: string | null;
  created_at: string;
}

interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  payment_date: string;
  payment_type: string;
}

export default function Debts() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [activeTab, setActiveTab] = useState<"active" | "all" | "paid">("active");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [csvImportModalOpen, setCsvImportModalOpen] = useState(false);
  const [showDTI, setShowDTI] = useState(false);
  const [showPayoffCalc, setShowPayoffCalc] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<"snowball" | "avalanche" | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const DEBTS_PER_PAGE = 5;
  const strategyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/signin");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDebts();
      fetchPayments();
    }
  }, [user]);

  // Real-time subscription for debts and payments
  useEffect(() => {
    if (!user) return;

    const debtsChannel = supabase
      .channel('debts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'debts',
        },
        () => {
          console.log('[Debts] Real-time update received');
          fetchDebts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'debt_payments',
        },
        () => {
          console.log('[Debts] Payment update received');
          fetchPayments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(debtsChannel);
    };
  }, [user]);

  const fetchDebts = async () => {
    const { data, error } = await supabase
      .from("debts")
      .select("*, accounts:linked_account_id(payment_url)")
      .order("priority_order", { ascending: true, nullsFirst: false });

    if (error) {
      console.error("Error fetching debts:", error);
      toast.error("Failed to load debts");
    } else {
      // Merge linked account's payment_url as fallback
      const enrichedDebts = (data || []).map((debt: any) => ({
        ...debt,
        payment_url: debt.payment_url || debt.accounts?.payment_url || null,
        accounts: undefined,
      }));
      setDebts(enrichedDebts);
    }
  };

  const fetchPayments = async () => {
    const { data, error } = await supabase
      .from("debt_payments")
      .select("*")
      .order("payment_date", { ascending: false });

    if (error) {
      console.error("Error fetching payments:", error);
    } else {
      setPayments(data || []);
    }
  };

  const filteredDebts = debts.filter((debt) => {
    if (activeTab === "active") return debt.status === "active";
    if (activeTab === "paid") return debt.status === "paid_off";
    return true;
  });

  // Reset page when tab changes
  useEffect(() => { setCurrentPage(1); }, [activeTab]);

  const totalPages = Math.max(1, Math.ceil(filteredDebts.length / DEBTS_PER_PAGE));
  const paginatedDebts = useMemo(() => {
    const start = (currentPage - 1) * DEBTS_PER_PAGE;
    return filteredDebts.slice(start, start + DEBTS_PER_PAGE);
  }, [filteredDebts, currentPage]);

  const totalDebt = debts
    .filter((d) => d.status === "active")
    .reduce((sum, d) => sum + Number(d.current_balance), 0);

  const totalMinPayment = debts
    .filter((d) => d.status === "active")
    .reduce((sum, d) => sum + Number(d.minimum_payment), 0);

  // Calculate payoff timeline (simplified)
  const calculatePayoffMonths = () => {
    if (totalDebt === 0 || totalMinPayment === 0) return 0;
    const avgRate = debts.length > 0 
      ? debts.reduce((sum, d) => sum + Number(d.interest_rate), 0) / debts.length / 100 / 12
      : 0;
    
    if (avgRate === 0) return Math.ceil(totalDebt / totalMinPayment);
    
    const months = Math.log(totalMinPayment / (totalMinPayment - totalDebt * avgRate)) / Math.log(1 + avgRate);
    return Math.ceil(isFinite(months) ? months : totalDebt / totalMinPayment);
  };

  const payoffMonths = calculatePayoffMonths();
  const payoffYears = Math.floor(payoffMonths / 12);
  const remainingMonths = payoffMonths % 12;
  const payoffDate = addMonths(new Date(), payoffMonths);

  const handleStrategyClick = (strategy: "snowball" | "avalanche") => {
    setSelectedStrategy(strategy);
    // Scroll to strategy calculator
    setTimeout(() => {
      document.getElementById("payoff-strategy")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleExportDebts = () => {
    if (debts.length === 0) {
      toast.error("No debts to export");
      return;
    }
    
    const csvContent = [
      ["Name", "Creditor", "Type", "Current Balance", "Original Balance", "Interest Rate", "Min Payment", "Status"].join(","),
      ...debts.map(d => [
        `"${d.name}"`,
        `"${d.creditor || ''}"`,
        d.debt_type,
        d.current_balance,
        d.original_balance,
        d.interest_rate,
        d.minimum_payment,
        d.status
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `debts-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Debts exported successfully");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading your debts..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-gradient-to-br from-background via-background to-muted/20">
      <Helmet>
        <title>Debt Management | CoinsBloom - Pay Off Debt Faster</title>
        <meta name="description" content="Create your debt payoff strategy with CoinsBloom. Use snowball or avalanche methods, track progress, and become debt-free sooner." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <DashboardHeader />

      {/* Hero Header */}
      <PageHeroHeader
        title="Debt Management"
        subtitle="Build your debt payoff strategy and monitor progress toward becoming debt-free"
        icon={<TrendingDown className="h-6 w-6 text-[hsl(350,80%,75%)]" />}
        colorScheme="pink"
      />

      {/* Main Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-grow p-4 relative z-10"
      >
        <div className="container max-w-6xl mx-auto space-y-6">

          {/* Quick Actions */}
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-3 pb-2">
              <Button 
                onClick={() => setAddModalOpen(true)}
                className="flex-shrink-0 bg-green-500 hover:bg-green-600"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Debt
              </Button>
              <Button 
                onClick={() => setImportModalOpen(true)}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Import Account
              </Button>
              <Button 
                onClick={() => handleStrategyClick("snowball")}
                className={`flex-shrink-0 ${selectedStrategy === "snowball" ? "bg-purple-700 ring-2 ring-purple-300" : "bg-purple-500 hover:bg-purple-600"}`}
              >
                <Snowflake className="h-4 w-4 mr-2" />
                Snowball
              </Button>
              <Button 
                onClick={() => handleStrategyClick("avalanche")}
                className={`flex-shrink-0 ${selectedStrategy === "avalanche" ? "bg-purple-800 ring-2 ring-purple-300" : "bg-purple-600 hover:bg-purple-700"}`}
              >
                <Zap className="h-4 w-4 mr-2" />
                Avalanche
              </Button>
              <Button 
                onClick={() => setShowDTI(!showDTI)}
                className={`flex-shrink-0 ${showDTI ? "bg-orange-600 ring-2 ring-orange-300" : "bg-orange-500 hover:bg-orange-600"}`}
              >
                <Calculator className="h-4 w-4 mr-2" />
                <span className="whitespace-nowrap text-sm">DTI Calc</span>
              </Button>
              <Button 
                onClick={() => {
                  setShowPayoffCalc(!showPayoffCalc);
                  if (!showPayoffCalc) {
                    setTimeout(() => document.getElementById("payoff-calc")?.scrollIntoView({ behavior: "smooth" }), 100);
                  }
                }}
                className={`flex-shrink-0 ${showPayoffCalc ? "bg-teal-700 ring-2 ring-teal-300" : "bg-teal-600 hover:bg-teal-700"}`}
              >
                <Calculator className="h-4 w-4 mr-2" />
                <span className="whitespace-nowrap text-sm">Payoff Calc</span>
              </Button>
              <Button 
                onClick={() => {
                  setSelectedStrategy(null);
                  document.getElementById("payoff-strategy")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="flex-shrink-0 bg-pink-500 hover:bg-pink-600"
              >
                <Target className="h-4 w-4 mr-2" />
                Strategies
              </Button>
              <Button 
                onClick={() => setHelpModalOpen(true)}
                className="flex-shrink-0 bg-amber-500 hover:bg-amber-600"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Tips
              </Button>
              <Button 
                onClick={handleExportDebts}
                className="flex-shrink-0 bg-gray-600 hover:bg-gray-700"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button 
                onClick={() => setCsvImportModalOpen(true)}
                className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* Debt Trend Chart */}
          <DebtTrendChart debts={debts} payments={payments} />

          {/* Getting Started Help */}
          {debts.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-2">
                  Step 1: Add Your Liability Account First
                </h3>
                <div className="flex items-start gap-3">
                  <Download className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">
                      Create the actual credit card/loan in Accounts, then import it here to build your
                      payoff strategy →
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Debt Tabs & Cards - Primary Content */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3 bg-muted/50">
              <TabsTrigger 
                value="active" 
                className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white"
              >
                <AlertCircle className="h-4 w-4" />
                Active
              </TabsTrigger>
              <TabsTrigger 
                value="all" 
                className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileText className="h-4 w-4" />
                All Debts
              </TabsTrigger>
              <TabsTrigger 
                value="paid" 
                className="gap-2 data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
              >
                <CheckCircle className="h-4 w-4" />
                Paid Off
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4 space-y-3">
              {filteredDebts.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {activeTab === "active" 
                        ? "No active debts. Add your first debt to start tracking!"
                        : activeTab === "paid"
                        ? "No paid off debts yet. Keep going!"
                        : "No debts found."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Showing {(currentPage - 1) * DEBTS_PER_PAGE + 1}–{Math.min(currentPage * DEBTS_PER_PAGE, filteredDebts.length)} of {filteredDebts.length} debts
                  </p>
                  {paginatedDebts.map((debt) => (
                    <DebtCard 
                      key={debt.id} 
                      debt={debt} 
                      payments={payments.filter(p => p.debt_id === debt.id)}
                      onUpdate={fetchDebts}
                    />
                  ))}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(p => p - 1)}
                      >
                        Previous
                      </Button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          className="w-8 h-8 p-0"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(p => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Payoff Strategy Calculator - Moved up for actionability */}
          <div id="payoff-strategy" ref={strategyRef}>
            {debts.length > 0 && <PayoffStrategyCalculator debts={debts} initialStrategy={selectedStrategy} />}
          </div>

          {/* Early Payoff Calculator */}
          {showPayoffCalc && (
            <div id="payoff-calc">
              <EarlyPayoffCalculator />
            </div>
          )}

          {/* DTI Calculator */}
          {showDTI && <DTICalculator />}

          {/* Grouped Analytics - Single collapsible section */}
          {totalDebt > 0 && (
            <Collapsible>
              <Card>
                <CollapsibleTrigger className="w-full text-left">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Debt Analytics
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Payoff timeline, progress & savings</p>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-6">
                    {/* Debt Payoff Summary */}
                    <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Clock className="h-4 w-4" />
                        Debt-Free Countdown
                      </div>
                      
                      <div className="flex gap-6">
                        <div>
                          <span className="text-4xl font-bold text-primary">{payoffYears}</span>
                          <p className="text-sm text-muted-foreground">years</p>
                        </div>
                        <div>
                          <span className="text-4xl font-bold text-primary">{remainingMonths}</span>
                          <p className="text-sm text-muted-foreground">months</p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Debt</span>
                          <span className="font-semibold text-destructive">
                            ${totalDebt.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monthly Payment</span>
                          <span className="font-semibold">
                            ${totalMinPayment.toLocaleString("en-US", { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2">
                          <span className="text-muted-foreground">Debt-Free By</span>
                          <span className="font-semibold text-green-600">
                            {format(payoffDate, "MMM yyyy")}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Payoff Progress Chart */}
                    <div>
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <TrendingDown className="h-4 w-4" />
                        Payoff Progress
                      </h4>
                      <div className="flex justify-between items-end gap-2 mb-2">
                        {(() => {
                          const projections: number[] = [];
                          let runningBalance = totalDebt;
                          const activeDebts = debts.filter(d => d.status === "active");
                          const weightedRate = activeDebts.reduce((sum, d) => {
                            const weight = Number(d.current_balance) / totalDebt;
                            return sum + (Number(d.interest_rate) / 100 / 12) * weight;
                          }, 0);

                          for (let i = 0; i < 7; i++) {
                            projections.push(Math.max(0, runningBalance));
                            const interest = runningBalance * weightedRate;
                            runningBalance = runningBalance + interest - totalMinPayment;
                          }

                          const maxBalance = projections[0] || 1;
                          const maxBarHeight = 64;

                          return projections.map((bal, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center">
                              <p className="text-[10px] text-muted-foreground mb-1 font-medium">
                                ${bal >= 1000 ? `${(bal / 1000).toFixed(0)}k` : bal.toFixed(0)}
                              </p>
                              <div 
                                className="bg-destructive rounded-sm w-full min-h-[4px] transition-all"
                                style={{ height: `${Math.max(4, (bal / maxBalance) * maxBarHeight)}px` }}
                              />
                              <p className="text-xs text-center text-muted-foreground mt-1">
                                {format(addMonths(new Date(), i), "MMM")}
                              </p>
                            </div>
                          ));
                        })()}
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-2">6-month projected balance</p>
                    </div>

                    {/* Interest Savings Opportunity */}
                    <div className="border-t pt-4">
                      <h4 className="text-sm font-medium flex items-center gap-2 mb-3">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        Interest Savings Opportunity
                      </h4>
                      {(() => {
                        const activeDebts = debts.filter(d => d.status === "active" && Number(d.interest_rate) > 0);
                        const totalProjectedInterest = activeDebts.reduce((sum, d) => {
                          const bal = Number(d.current_balance);
                          const rate = Number(d.interest_rate) / 100 / 12;
                          const pmt = Number(d.minimum_payment);
                          if (pmt <= 0 || bal <= 0) return sum;
                          if (rate === 0) return sum;
                          const monthlyInterest = bal * rate;
                          if (pmt <= monthlyInterest) return sum + bal * rate * 120;
                          const months = Math.log(pmt / (pmt - bal * rate)) / Math.log(1 + rate);
                          const totalPaid = pmt * (isFinite(months) ? Math.ceil(months) : 0);
                          return sum + Math.max(0, totalPaid - bal);
                        }, 0);

                        const avalancheSavings = Math.round(totalProjectedInterest * 0.12);

                        return (
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Projected Total Interest</span>
                              <span className="font-semibold text-destructive">
                                ${Math.round(totalProjectedInterest).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-amber-500" />
                                <span className="text-muted-foreground">With Avalanche Method</span>
                              </div>
                              <span className="font-semibold text-green-600">
                                ${Math.round(totalProjectedInterest - avalancheSavings).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t">
                              <span className="font-medium">Potential Savings</span>
                              <div className="text-right">
                                <span className="text-xl font-bold text-green-600">
                                  ${avalancheSavings.toLocaleString()}
                                </span>
                                <p className="text-xs text-muted-foreground">in interest</p>
                              </div>
                            </div>
                            <Button 
                              variant="outline" 
                              className="w-full border-primary text-primary"
                              onClick={() => {
                                strategyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                setSelectedStrategy('avalanche');
                              }}
                            >
                              <Zap className="h-4 w-4 mr-2" />
                              Optimize My Strategy
                            </Button>
                          </div>
                        );
                      })()}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

        </div>
      </motion.main>

      {/* Educational Help Modal */}
      <Dialog open={helpModalOpen} onOpenChange={setHelpModalOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              Debt Payoff Guide
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            {/* Bills vs Debts */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Bills vs Debts - What's the Difference?
              </h4>
              <div className="space-y-3">
                <div className="p-3 rounded-lg border">
                  <h5 className="font-semibold text-primary mb-1 text-sm">Debts Page (You're Here!):</h5>
                  <p className="text-sm text-muted-foreground">
                    For paying down large BALANCES (credit cards, loans, student debt). 
                    Make extra payments and track your debt-free journey with Snowball/Avalanche strategies.
                  </p>
                </div>
                <div className="p-3 rounded-lg border">
                  <h5 className="font-semibold text-blue-600 mb-1 text-sm">Bills Page:</h5>
                  <p className="text-sm text-muted-foreground">
                    For recurring monthly PAYMENT DATES (Netflix, rent, credit card minimums). 
                    Set autopay to never miss a due date.{" "}
                    <Link to="/bills" className="text-primary hover:underline" onClick={() => setHelpModalOpen(false)}>
                      Visit Bills page »
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Smart Tips */}
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2 text-primary">
                <Lightbulb className="h-4 w-4" />
                Smart Debt Payoff Tips
              </h4>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <DollarSign className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Stop accumulating new debt</p>
                    <p className="text-xs text-muted-foreground">Focus on paying down existing debt before taking on more</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Increase your income</p>
                    <p className="text-xs text-muted-foreground">Side hustles and raises can accelerate debt payoff</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Scissors className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Cut unnecessary expenses</p>
                    <p className="text-xs text-muted-foreground">Redirect savings toward debt payments</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Phone className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Negotiate lower rates</p>
                    <p className="text-xs text-muted-foreground">Call creditors to request reduced interest rates</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Calendar className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Make bi-weekly payments</p>
                    <p className="text-xs text-muted-foreground">Pay half your monthly payment every two weeks</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Gift className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Use windfalls wisely</p>
                    <p className="text-xs text-muted-foreground">Apply bonuses and tax refunds to debt</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pro Tips */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 space-y-3">
              <p className="text-sm">
                <span className="mr-1">💡</span>
                <strong>Pro Tip 1:</strong> Use BOTH pages for the same credit card! Add the $50 minimum as a Bill (autopay, never late), then add the $5,000 balance here (extra payments, Snowball/Avalanche strategy).
              </p>
              <p className="text-sm">
                <span className="mr-1">💡</span>
                <strong>Pro Tip 2:</strong> Snowball pays smallest balances first (quick wins, motivation). Avalanche pays highest interest first (saves most money). Choose what keeps you motivated!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <AddDebtModal 
        open={addModalOpen} 
        onOpenChange={setAddModalOpen}
        onSuccess={fetchDebts}
      />
      <ImportAccountModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={fetchDebts}
      />
      <CSVImportModal
        open={csvImportModalOpen}
        onOpenChange={setCsvImportModalOpen}
        importType="debts"
        existingRecords={debts}
        onSuccess={fetchDebts}
      />
    </div>
  );
}
