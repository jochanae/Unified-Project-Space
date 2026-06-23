import React, { useState, useEffect, useRef } from "react";
import { BloomCoachTip } from "@/components/shared/BloomCoachTip";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useBudgetAutoUpdate } from "@/hooks/useBudgetAutoUpdate";
import SmsBillMatchBanner from "@/components/transactions/SmsBillMatchBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  TrendingUp,
  TrendingDown,
  Plus,
  Repeat,
  Calendar,
  DollarSign,
  ShoppingCart,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Mic,
  Receipt,
  Loader2,
  ArrowLeftRight,
  Upload,
  Archive,
  Paperclip,
  X,
} from "lucide-react";
import { EditTransactionModal } from "@/components/transactions/EditTransactionModal";
import { AddTransactionModal } from "@/components/transactions/AddTransactionModal";
import { TransactionDetailModal } from "@/components/transactions/TransactionDetailModal";
import { CSVImportModal } from "@/components/shared/CSVImportModal";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, startOfMonth, endOfMonth, subDays, isSameMonth, isBefore } from "date-fns";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface Transaction {
  id: string;
  title: string;
  category: string;
  transaction_date: string;
  amount: number;
  type: "income" | "expense";
  is_recurring: boolean;
  is_pending: boolean;
  is_tax_deductible: boolean;
  linked_bill_id: string | null;
  notes: string | null;
  merchant: string | null;
  account_id: string | null;
  bloom_burst_id: string | null;
  receipt_url?: string | null;
  is_archived?: boolean;
  is_projected?: boolean;
  source_recurring_id?: string | null;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold mb-1">{payload[0]?.payload?.date}</p>
        <p className="text-green-600">Income: ${payload[0]?.value?.toLocaleString() || 0}</p>
        <p className="text-red-500">Spending: ${payload[1]?.value?.toLocaleString() || 0}</p>
      </div>
    );
  }
  return null;
};

const ACTION_THRESHOLD = 100;

const Transactions = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { reverseBudgetFromTransaction } = useBudgetAutoUpdate();
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));

  const goToPrevMonth = () => {
    const m = parseInt(selectedMonth);
    const y = parseInt(selectedYear);
    if (m === 1) { setSelectedMonth("12"); setSelectedYear(String(y - 1)); }
    else { setSelectedMonth(String(m - 1)); }
  };

  const goToNextMonth = () => {
    const m = parseInt(selectedMonth);
    const y = parseInt(selectedYear);
    if (m === 12) { setSelectedMonth("1"); setSelectedYear(String(y + 1)); }
    else { setSelectedMonth(String(m + 1)); }
  };
  const [activeFilter, setActiveFilter] = useState("all");
  const [showInsights, setShowInsights] = useState(true);
  const [swipeStates, setSwipeStates] = useState<Record<string, number>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [hasAnyTransactions, setHasAnyTransactions] = useState(true); // Track if user has any transactions at all
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 15;
  const startXRef = useRef(0);

  // Form state
  const [newTransaction, setNewTransaction] = useState({
    title: '',
    amount: '',
    type: 'expense' as 'income' | 'expense',
    category: 'other',
    is_recurring: false,
    is_pending: false,
  });

  useEffect(() => {
    if (user) {
      fetchTransactions();
    }
  }, [user, selectedMonth, selectedYear]);

  // Real-time subscription for transactions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[Transactions] Real-time update received');
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchTransactions = async () => {
    if (!user) return;
    setLoading(true);

    const viewDate = new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1);
    const startDate = startOfMonth(viewDate);
    const endDate = endOfMonth(startDate);
    const now = new Date();
    const isFutureMonth = !isSameMonth(viewDate, now) && viewDate > now;

    // Fetch transactions for selected month
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', format(startDate, 'yyyy-MM-dd'))
      .lte('transaction_date', format(endDate, 'yyyy-MM-dd'))
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    } else {
      let allTransactions = data as Transaction[];

      // For future months, project recurring transactions as "Projected"
      if (isFutureMonth) {
        const { data: recurringTx } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_recurring', true)
          .eq('is_archived', false);

        if (recurringTx && recurringTx.length > 0) {
          // Dedup by source_recurring_id — skip templates already confirmed in this month
          const existingSourceIds = new Set(
            allTransactions
              .filter(t => t.source_recurring_id)
              .map(t => t.source_recurring_id)
          );
          const existingTitles = new Set(allTransactions.map(t => t.title.toLowerCase()));
          const projectedTransactions: Transaction[] = [];

          for (const tx of recurringTx) {
            if (existingSourceIds.has(tx.id)) continue;
            if (existingTitles.has(tx.title.toLowerCase())) continue;

            const originalDate = new Date(tx.transaction_date + 'T00:00:00');
            const dayOfMonth = originalDate.getDate();
            const lastDay = endDate.getDate();
            const projectedDay = Math.min(dayOfMonth, lastDay);
            const projectedDateStr = `${selectedYear}-${String(parseInt(selectedMonth)).padStart(2, '0')}-${String(projectedDay).padStart(2, '0')}`;

            projectedTransactions.push({
              ...tx,
              id: `projected-${tx.id}`,
              transaction_date: projectedDateStr,
              is_pending: false,
              is_projected: true,
              is_recurring: true,
            } as Transaction);
          }

          allTransactions = [...allTransactions, ...projectedTransactions]
            .sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
        }
      }

      // For current month, auto-confirm recurring transactions whose due date has passed
      if (isSameMonth(viewDate, now)) {
        const { data: recurringTx } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_recurring', true)
          .eq('is_archived', false);

        if (recurringTx && recurringTx.length > 0) {
          // Build dedup sets: by source_recurring_id (DB-level) and title (fallback)
          const existingSourceIds = new Set(
            allTransactions
              .filter(t => t.source_recurring_id)
              .map(t => t.source_recurring_id)
          );
          const existingTitles = new Set(allTransactions.map(t => t.title.toLowerCase()));
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          for (const tx of recurringTx) {
            // Skip if already auto-confirmed this month (by source ID or title)
            if (existingSourceIds.has(tx.id)) continue;
            if (existingTitles.has(tx.title.toLowerCase())) continue;

            const originalDate = new Date(tx.transaction_date + 'T00:00:00');
            const dayOfMonth = originalDate.getDate();
            const lastDay = endDate.getDate();
            const projectedDay = Math.min(dayOfMonth, lastDay);
            const projectedDateStr = `${selectedYear}-${String(parseInt(selectedMonth)).padStart(2, '0')}-${String(projectedDay).padStart(2, '0')}`;
            const dueDate = new Date(projectedDateStr + 'T00:00:00');

            if (dueDate <= today) {
              // Auto-confirm: create actual transaction in DB with source_recurring_id for idempotency
              const { data: created, error: createErr } = await supabase
                .from('transactions')
                .insert({
                  user_id: user.id,
                  title: tx.title,
                  amount: tx.amount,
                  type: tx.type,
                  category: tx.category,
                  transaction_date: projectedDateStr,
                  is_recurring: false,
                  is_pending: false,
                  is_tax_deductible: tx.is_tax_deductible || false,
                  linked_bill_id: tx.linked_bill_id,
                  merchant: tx.merchant,
                  account_id: tx.account_id,
                  source_recurring_id: tx.id,
                  notes: `Auto-confirmed from recurring: ${tx.title}`,
                })
                .select()
                .single();

              if (createErr) {
                // Unique constraint violation = already confirmed, not an error
                if (createErr.code === '23505') {
                  console.log(`[Transactions] Skipped duplicate auto-confirm for: ${tx.title}`);
                } else {
                  console.error('[Transactions] Auto-confirm error:', createErr);
                }
              } else if (created) {
                allTransactions.push(created as Transaction);
                existingSourceIds.add(tx.id);
                existingTitles.add(tx.title.toLowerCase());
              }
            } else {
              // Due date hasn't arrived yet — show as Pending
              allTransactions.push({
                ...tx,
                id: `pending-${tx.id}`,
                transaction_date: projectedDateStr,
                is_pending: true,
                is_projected: false,
                is_recurring: true,
              } as Transaction);
            }
          }

          allTransactions.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date));
        }
      }

      setTransactions(allTransactions);
      
      // Check if user has any transactions at all (for empty state messaging)
      if (allTransactions.length === 0) {
        const { count } = await supabase
          .from('transactions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        setHasAnyTransactions((count ?? 0) > 0);
      } else {
        setHasAnyTransactions(true);
      }
    }
    setLoading(false);
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const { error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        title: newTransaction.title,
        amount: parseFloat(newTransaction.amount),
        type: newTransaction.type,
        category: newTransaction.category,
        is_recurring: newTransaction.is_recurring,
        is_pending: newTransaction.is_pending,
        transaction_date: format(new Date(), 'yyyy-MM-dd'),
      });

    if (error) {
      console.error('Error adding transaction:', error);
      toast.error('Failed to add transaction');
    } else {
      toast.success('Transaction added!');
      setShowAddModal(false);
      setNewTransaction({
        title: '',
        amount: '',
        type: 'expense',
        category: 'other',
        is_recurring: false,
        is_pending: false,
      });
      fetchTransactions();
    }
  };

  const handleDelete = async (transaction: Transaction) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', transaction.id);

    if (error) {
      console.error('Error deleting transaction:', error);
      toast.error('Failed to delete transaction');
    } else {
      // Reverse the budget update if this was an expense
      if (transaction.type === 'expense') {
        await reverseBudgetFromTransaction({
          amount: transaction.amount,
          category: transaction.category,
          type: transaction.type,
          title: transaction.title,
        });
      }
      
      setTransactions(prev => prev.filter(t => t.id !== transaction.id));
      toast.success(`Deleted: ${transaction.title}`);
    }
  };

  const handleTouchStart = (id: string, e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setDraggingId(id);
    setSwipeStates(prev => ({ ...prev, [id]: 0 }));
  };

  const handleTouchMove = (id: string, e: React.TouchEvent) => {
    if (draggingId !== id) return;
    const diff = startXRef.current - e.touches[0].clientX;
    const clampedDiff = Math.max(-ACTION_THRESHOLD - 20, Math.min(ACTION_THRESHOLD + 20, diff));
    setSwipeStates(prev => ({ ...prev, [id]: clampedDiff }));
  };

  const handleTouchEnd = (id: string, transaction: Transaction) => {
    const currentSwipe = swipeStates[id] || 0;
    
    if (currentSwipe > ACTION_THRESHOLD) {
      handleDelete(transaction);
    } else if (currentSwipe < -ACTION_THRESHOLD) {
      setEditingTransaction(transaction);
      setShowEditModal(true);
    }
    
    setSwipeStates(prev => ({ ...prev, [id]: 0 }));
    setDraggingId(null);
  };

  const isToday = (dateStr: string) => {
    return format(new Date(), 'yyyy-MM-dd') === dateStr;
  };

  const formatDate = (dateStr: string) => {
    if (isToday(dateStr)) return "Today";
    return format(new Date(dateStr), 'MMM d');
  };

  // Filter transactions
  const filteredTransactions = transactions.filter(t => {
    // Filter by archive status first
    if (showArchived) {
      if (t.is_archived !== true) return false;
    } else {
      if (t.is_archived === true) return false;
    }
    
    if (activeFilter === 'all') return true;
    if (activeFilter === 'income') return t.type === 'income';
    if (activeFilter === 'expenses') return t.type === 'expense';
    if (activeFilter === 'recurring') return t.is_recurring === true;
    return true;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTransactions = filteredTransactions.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, showArchived, selectedMonth, selectedYear]);

  const handleArchive = async (transaction: Transaction) => {
    const newArchivedState = !transaction.is_archived;
    const { error } = await supabase
      .from('transactions')
      .update({ is_archived: newArchivedState })
      .eq('id', transaction.id);
    
    if (error) {
      toast.error('Failed to update transaction');
    } else {
      toast.success(newArchivedState ? 'Transaction archived' : 'Transaction restored');
      fetchTransactions();
    }
  };

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailModal(true);
  };

  // Calculate totals
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const totalSpending = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

  // Generate chart data
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(new Date(), 29 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayTransactions = transactions.filter(t => t.transaction_date === dateStr);
    return {
      date: format(date, 'MMM d'),
      income: dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
      spending: dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0),
    };
  });

  // Spending by category
  const categorySpending = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
      return acc;
    }, {} as Record<string, number>);

  const sortedCategories = Object.entries(categorySpending)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const filters = ["All", "Income", "Expenses", "Recurring"];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading your transactions..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Helmet>
        <title>Transactions | CoinsBloom - Track Your Money Flow</title>
        <meta name="description" content="Track all your income and expenses with CoinsBloom. Categorize transactions, analyze spending patterns, and understand your cash flow." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <DashboardHeader />
      {/* Hero Header */}
      <PageHeroHeader
        title="Transactions"
        subtitle="Track money flow, categorize transactions, and analyze spending patterns"
        icon={<ArrowLeftRight className="h-6 w-6 text-[hsl(180,80%,70%)]" />}
        colorScheme="teal"
      />

      <BloomCoachTip
        example="Add a $45 grocery expense at Walmart"
        dismissKey="bloom_tip_transactions"
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 mt-4 space-y-4 max-w-6xl mx-auto"
      >
        <SmsBillMatchBanner />
        {/* Money Flow Section */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-primary">Money Flow</h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="h-6 w-6 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                  aria-label="Add transaction"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={goToPrevMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month, i) => (
                      <SelectItem key={month} value={String(i + 1)}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-24 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["2024", "2025", "2026"].map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={goToNextMonth}
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Income/Spending Summary */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <Card className="border-0 shadow-sm bg-bloom-green/10 dark:bg-bloom-green/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Total Income</span>
                    <TrendingUp className="h-4 w-4 text-bloom-green" />
                  </div>
                  <p className="text-2xl font-bold text-bloom-green">${totalIncome.toLocaleString()}</p>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm bg-destructive/10 dark:bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Total Spending</span>
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  </div>
                  <p className="text-2xl font-bold text-destructive">${totalSpending.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Chart - Full Bleed on Desktop */}
      <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen px-4 overflow-hidden mt-4">
        <div className="rounded-2xl overflow-hidden border border-border/40 bg-card shadow-sm max-w-6xl mx-auto lg:max-w-none">
          <div className="px-4 pt-4 pb-1 flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Last 30 Days</span>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Income
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Spending
              </span>
            </div>
          </div>
          <div className="h-[130px] px-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
                <defs>
                  <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="spendingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} dy={4} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="income" stroke="#22c55e" strokeWidth={2} fill="url(#incomeGradient)" dot={false} />
                <Area type="monotone" dataKey="spending" stroke="#ef4444" strokeWidth={2} fill="url(#spendingGradient)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 mt-4 space-y-4 max-w-6xl mx-auto"
      >

        {/* Quick Add Buttons */}
        <div className="flex gap-2">
          <Button onClick={() => setShowAddModal(true)} className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Add Transaction
          </Button>
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {filters.map((filter) => (
            <Button
              key={filter}
              variant={activeFilter === filter.toLowerCase() ? "default" : "outline"}
              onClick={() => setActiveFilter(filter.toLowerCase())}
              size="sm"
            >
              {filter}
            </Button>
          ))}
          <Button
            variant={showArchived ? "default" : "outline"}
            onClick={() => setShowArchived(!showArchived)}
            size="sm"
            className="gap-1"
          >
            <Archive className="h-3 w-3" />
            Archived
          </Button>
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" text="Loading transactions..." />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <Card className="bg-card/50 border-border/50">
            <CardContent className="p-8 text-center animate-fade-in">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                {showArchived ? (
                  <Archive className="h-8 w-8 text-primary" />
                ) : activeFilter === 'recurring' ? (
                  <Repeat className="h-8 w-8 text-primary" />
                ) : (
                  <Receipt className="h-8 w-8 text-primary" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {showArchived 
                  ? "No archived transactions" 
                  : activeFilter === 'recurring' 
                    ? "No recurring transactions" 
                    : hasAnyTransactions
                      ? `No transactions for ${format(new Date(parseInt(selectedYear), parseInt(selectedMonth) - 1), 'MMMM yyyy')}`
                      : "No transactions yet"}
              </h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
                {showArchived
                  ? "Tap any transaction to view details, then archive it to move it here"
                  : activeFilter === 'recurring'
                    ? "Toggle 'Recurring' when adding transactions to track regular income or expenses"
                    : hasAnyTransactions
                      ? "No income or expenses were recorded during this period"
                      : "Start tracking your money by adding your first transaction"}
              </p>
              {!showArchived && activeFilter !== 'recurring' && (
                hasAnyTransactions ? (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSelectedMonth(String(new Date().getMonth() + 1));
                      setSelectedYear(String(new Date().getFullYear()));
                    }}
                  >
                    Go to Current Month
                  </Button>
                ) : (
                  <Button onClick={() => setShowAddModal(true)} className="gradient-primary text-primary-foreground">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transaction
                  </Button>
                )
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Swipe tip - dismissible */}
            {!localStorage.getItem('dismissSwipeTip') && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-100 dark:border-blue-900/50 mb-3">
                <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/50 flex-shrink-0">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-300 flex-1">
                  <span className="font-medium">Swipe today's transactions</span> — left to delete, right to edit. Tap older ones to view or archive.
                </p>
                <button 
                  onClick={() => {
                    localStorage.setItem('dismissSwipeTip', 'true');
                    window.dispatchEvent(new Event('storage'));
                  }}
                  className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-500 dark:text-blue-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <Card>
              <CardContent className="p-0 divide-y">
              {paginatedTransactions.map((transaction) => {
                const editable = isToday(transaction.transaction_date) || transaction.is_pending;
                const swipeX = swipeStates[transaction.id] || 0;
                const isSwipingLeft = swipeX > 0;
                const isSwipingRight = swipeX < 0;
                const swipeProgress = Math.min(Math.abs(swipeX) / ACTION_THRESHOLD, 1);
                
                return (
                  <div key={transaction.id} className="relative overflow-hidden">
                    {editable && (
                      <>
                        <div 
                          className="absolute inset-0 bg-red-500 flex items-center justify-end pr-6"
                          style={{ opacity: isSwipingLeft ? swipeProgress : 0 }}
                        >
                          <Trash2 className="h-6 w-6 text-white" />
                        </div>
                        <div 
                          className="absolute inset-0 bg-blue-500 flex items-center justify-start pl-6"
                          style={{ opacity: isSwipingRight ? swipeProgress : 0 }}
                        >
                          <Pencil className="h-6 w-6 text-white" />
                        </div>
                      </>
                    )}
                    
                    <div 
                      className={`flex items-center gap-3 p-4 cursor-pointer ${draggingId === transaction.id ? '' : 'transition-all duration-200'} ${
                        transaction.is_projected
                          ? 'bg-blue-50/50 hover:bg-blue-50 dark:bg-blue-950/20 dark:hover:bg-blue-950/30 border-l-2 border-l-blue-400 border-dashed'
                          : transaction.is_pending && !transaction.is_projected
                            ? 'bg-yellow-50/50 hover:bg-yellow-50 dark:bg-yellow-950/20 dark:hover:bg-yellow-950/30 border-l-2 border-l-yellow-400'
                            : isToday(transaction.transaction_date) 
                              ? 'bg-primary/5 hover:bg-primary/10 border-l-2 border-l-primary' 
                              : 'bg-card hover:bg-muted/50'
                      }`}
                      style={{ transform: `translateX(${-swipeX}px)` }}
                      data-allow-swipe={editable ? "true" : undefined}
                      onClick={() => !draggingId && handleTransactionClick(transaction)}
                      onTouchStart={(e) => editable && handleTouchStart(transaction.id, e)}
                      onTouchMove={(e) => editable && handleTouchMove(transaction.id, e)}
                      onTouchEnd={() => editable && handleTouchEnd(transaction.id, transaction)}
                    >
                      <div className={`p-2.5 rounded-full ${transaction.type === "income" ? "bg-green-100" : "bg-red-100"}`}>
                        {transaction.type === "income" ? (
                          <DollarSign className="h-5 w-5 text-green-600" />
                        ) : (
                          <ShoppingCart className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{transaction.title}</p>
                          {transaction.receipt_url && (
                            <Paperclip className="h-3 w-3 text-muted-foreground" />
                          )}
                          {transaction.is_projected && (
                            <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              Projected
                            </Badge>
                          )}
                          {transaction.is_pending && !transaction.is_projected && (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Pending</Badge>
                          )}
                          {transaction.linked_bill_id && (
                            <Badge variant="outline" className="text-xs">Bill</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="capitalize">{transaction.category}</span>
                          {transaction.is_recurring && (
                            <Badge variant="secondary" className="text-xs py-0 bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400">
                              <Repeat className="h-3 w-3 mr-1" />
                              Recurring
                            </Badge>
                          )}
                          <span>• {formatDate(transaction.transaction_date)}</span>
                        </div>
                      </div>
                      <span className={`font-semibold ${transaction.type === "income" ? "text-green-600" : "text-red-500"}`}>
                        {transaction.type === "income" ? "+" : "-"}${Number(transaction.amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
           </Card>

           {/* Pagination Controls */}
           {totalPages > 1 && (
             <div className="flex items-center justify-between px-1">
               <p className="text-sm text-muted-foreground">
                 {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredTransactions.length)} of {filteredTransactions.length}
               </p>
               <div className="flex items-center gap-2">
                 <Button
                   variant="outline"
                   size="icon"
                   className="h-8 w-8"
                   disabled={safeCurrentPage <= 1}
                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 >
                   <ChevronLeft className="h-4 w-4" />
                 </Button>
                 <span className="text-sm font-medium min-w-[3rem] text-center">
                   {safeCurrentPage} / {totalPages}
                 </span>
                 <Button
                   variant="outline"
                   size="icon"
                   className="h-8 w-8"
                   disabled={safeCurrentPage >= totalPages}
                   onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 >
                   <ChevronRight className="h-4 w-4" />
                 </Button>
               </div>
             </div>
           )}
           </>
        )}

        {/* Spending Insights */}
        {sortedCategories.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <button 
                className="w-full flex items-center justify-between"
                onClick={() => setShowInsights(!showInsights)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-purple-100">
                    <TrendingDown className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-bold">Spending Insights</h3>
                    <p className="text-sm text-muted-foreground">
                      {sortedCategories[0]?.[0]} is your largest expense
                    </p>
                  </div>
                </div>
                {showInsights ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </button>
              
              {showInsights && (
                <div className="mt-4 space-y-4">
                  {sortedCategories.map(([category, amount], index) => {
                    const percentage = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;
                    const colors = ["bg-red-500", "bg-orange-500", "bg-yellow-500"];
                    return (
                      <div key={category}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <Badge className={`${colors[index]} text-white w-6 h-6 p-0 flex items-center justify-center`}>
                              {index + 1}
                            </Badge>
                            <span className="font-medium capitalize">{category}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold">${amount.toLocaleString()}</span>
                            <span className="text-sm text-muted-foreground ml-2">{percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${colors[index]} rounded-full`} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Balance Card */}
        <Card className="bg-green-50 border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Wallet className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                  <p className={`text-2xl font-bold ${totalIncome - totalSpending >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${(totalIncome - totalSpending).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </motion.div>

      {/* Add Transaction Modal */}
      <AddTransactionModal
        open={showAddModal}
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) fetchTransactions();
        }}
        defaultType="expense"
      />

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <EditTransactionModal
          open={showEditModal}
          onOpenChange={(open) => {
            setShowEditModal(open);
            if (!open) setEditingTransaction(null);
          }}
          transaction={editingTransaction}
          onSuccess={fetchTransactions}
        />
      )}

      <CSVImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        importType="transactions"
        existingRecords={transactions}
        onSuccess={fetchTransactions}
      />

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        open={showDetailModal}
        onOpenChange={(open) => {
          setShowDetailModal(open);
          if (!open) setSelectedTransaction(null);
        }}
        onEdit={(t) => {
          setEditingTransaction(t);
          setShowEditModal(true);
        }}
        onArchive={handleArchive}
        onDelete={handleDelete}
      />

    </div>
  );
};

export default Transactions;
