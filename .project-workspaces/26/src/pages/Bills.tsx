import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, AlertTriangle, Calendar, Clock, CheckCircle2, TrendingUp, Bell, BarChart3, Download, Zap, RefreshCw, Settings, FileText, ChevronLeft, ChevronRight, Upload, TrendingDown, Info, ChevronDown, Pencil, Trash2, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { PageHeroHeader } from "@/components/navigation/PageHeroHeader";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { toast } from "sonner";
import { format, isAfter, isBefore, addDays, startOfToday, isToday, isTomorrow, startOfMonth, endOfMonth, subMonths, addMonths, isSameMonth } from "date-fns";
import CreateBillModal from "@/components/bills/CreateBillModal";
import BillCard from "@/components/bills/BillCard";
import PayBillModal from "@/components/bills/PayBillModal";
import BillOptimizer from "@/components/bills/BillOptimizer";
import BillsCalendar from "@/components/bills/BillsCalendar";
import BillsAnalytics from "@/components/bills/BillsAnalytics";

import BillPaymentTrendChart from "@/components/bills/BillPaymentTrendChart";
import BudgetShortfallAlert from "@/components/bills/BudgetShortfallAlert";
import BillsOverview from "@/components/bills/BillsOverview";
import SmsBillMatchBanner from "@/components/transactions/SmsBillMatchBanner";
import BillsMonthlyModal from "@/components/bills/BillsMonthlyModal";
import SmartAlertsModal from "@/components/bills/SmartAlertsModal";
import { exportBillsToCSV, exportBillsToPDF } from "@/lib/billsExport";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CSVImportModal } from "@/components/shared/CSVImportModal";
import QuickAddBillsModal from "@/components/bills/QuickAddBillsModal";
import VariableBillReviewModal from "@/components/bills/VariableBillReviewModal";
import { AutopaySettingsTab } from "@/components/bills/AutopaySettingsTab";
import { PushNotificationBanner } from "@/components/bills/PushNotificationBanner";
import { GmailBillImport } from "@/components/bills/GmailBillImport";
import { PlaidBillSuggestions } from "@/components/bills/PlaidBillSuggestions";
import { BloomCoachTip } from "@/components/shared/BloomCoachTip";
import FilteredBillsModal from "@/components/bills/FilteredBillsModal";

interface Bill {
  id: string;
  name: string;
  amount: number;
  category: string;
  due_date: string;
  frequency: string;
  is_recurring: boolean;
  is_autopay: boolean;
  is_variable_amount: boolean;
  reminder_enabled: boolean;
  reminder_days_before: number;
  status: string;
  notes: string | null;
  last_paid_date: string | null;
  autopay_source: 'internal' | 'external' | null;
  end_date: string | null;
  total_payments: number | null;
  is_projected?: boolean;
}

type BillFilter = 'all' | 'recurring' | 'one_time' | 'variable';

const Bills = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { isFeatureEnabled } = useFeatureFlags();
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [filter, setFilter] = useState<BillFilter>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [showSmartAlertsModal, setShowSmartAlertsModal] = useState(false);
  const [allBillsPage, setAllBillsPage] = useState(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showPaidBills, setShowPaidBills] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showVariableReviewModal, setShowVariableReviewModal] = useState(false);
  const [variableAmountsVerified, setVariableAmountsVerified] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'due_date' | 'amount' | 'name' | 'status'>('due_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilterType, setActiveFilterType] = useState<'recurring' | 'one_time' | 'variable'>('recurring');

  const billListRef = useRef<HTMLDivElement>(null);
  const isCurrentMonth = isSameMonth(selectedMonth, new Date());
  const isFutureMonth = isAfter(startOfMonth(selectedMonth), startOfMonth(new Date()));

  // Handle ?action=create from budget mapping or other pages
  useEffect(() => {
    if (searchParams.get("action") === "create") {
      setSelectedBill(null);
      setShowCreateModal(true);
      searchParams.delete("action");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Sync variableAmountsVerified with selectedMonth
  useEffect(() => {
    const key = `variable_verified_${selectedMonth.getFullYear()}_${selectedMonth.getMonth()}`;
    setVariableAmountsVerified(localStorage.getItem(key) === 'true');
  }, [selectedMonth]);

  const handleFilterChange = useCallback((newFilter: BillFilter) => {
    if (newFilter === 'all') {
      setFilter('all');
    } else {
      // Open modal with filtered content
      setActiveFilterType(newFilter);
      setShowFilterModal(true);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchBills();
    }
  }, [user]);

  // Real-time subscription for bills
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('bills-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bills',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          console.log('[Bills] Real-time update received');
          fetchBills();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchBills = async () => {
    if (!user) return;
    
    setIsLoading(true);
    const { data, error } = await supabase
      .from('bills')
      .select('*, debts:linked_debt_id(payment_url)')
      .eq('user_id', user.id)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching bills:', error);
      toast.error('Failed to load bills');
    } else {
      // Merge linked debt's payment_url as fallback
      const enrichedBills = (data || []).map((bill: any) => ({
        ...bill,
        payment_url: bill.payment_url || bill.debts?.payment_url || null,
        debts: undefined, // clean up joined data
      }));
      setBills(enrichedBills as Bill[]);
    }
    setIsLoading(false);
  };

  const handlePayBill = (bill: Bill) => {
    setSelectedBill(bill);
    setShowPayModal(true);
  };

  const handleQuickPay = async (bill: Bill) => {
    if (!user) return;
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Your session has expired. Please sign in again.');
      return;
    }

    try {
      const paidDate = new Date().toISOString().split('T')[0];

      const { error: updateError } = await supabase
        .from('bills')
        .update({ status: 'paid', last_paid_date: paidDate })
        .eq('id', bill.id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      const { data: paymentData, error: paymentError } = await supabase
        .from('bill_payments')
        .insert({
          bill_id: bill.id,
          user_id: user.id,
          amount: bill.amount,
          paid_date: paidDate,
          payment_method: 'manual'
        })
        .select('id')
        .single();

      if (paymentError) throw paymentError;

      // Create next recurring bill if applicable
      if (bill.is_recurring) {
        const currentDueDate = new Date(bill.due_date);
        let nextDueDate: Date;
        const freq = bill.frequency || 'monthly';
        switch (freq) {
          case 'weekly': nextDueDate = addDays(currentDueDate, 7); break;
          case 'biweekly': nextDueDate = addDays(currentDueDate, 14); break;
          case 'quarterly':
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + 3);
            break;
          case 'semi_annual':
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + 6);
            break;
          case 'annual':
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
            break;
          default:
            nextDueDate = new Date(currentDueDate);
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
        }

        const billEndDate = (bill as any).end_date;
        const shouldCreateNext = !billEndDate || nextDueDate <= new Date(billEndDate + 'T23:59:59');

        if (shouldCreateNext) {
          const nextDateStr = nextDueDate.toISOString().split('T')[0];
          const { data: existingNext } = await supabase
            .from('bills')
            .select('id')
            .eq('user_id', user.id)
            .eq('name', bill.name)
            .in('status', ['pending', 'overdue'])
            .gte('due_date', nextDateStr)
            .limit(1);

          if (!existingNext || existingNext.length === 0) {
            const { data: fullBill } = await supabase
              .from('bills')
              .select('name, amount, category, frequency, is_recurring, is_autopay, is_variable_amount, reminder_enabled, reminder_days_before, autopay_source, end_date, total_payments')
              .eq('id', bill.id)
              .single();

            if (fullBill) {
              await supabase.from('bills').insert({
                user_id: user.id,
                name: fullBill.name,
                amount: fullBill.amount,
                category: fullBill.category as any,
                due_date: nextDateStr,
                frequency: fullBill.frequency as any,
                is_recurring: true,
                is_autopay: fullBill.is_autopay,
                is_variable_amount: fullBill.is_variable_amount,
                reminder_enabled: fullBill.reminder_enabled,
                reminder_days_before: fullBill.reminder_days_before,
                autopay_source: fullBill.autopay_source,
                end_date: fullBill.end_date,
                total_payments: fullBill.total_payments,
                status: 'pending',
                remaining_balance: fullBill.amount,
              });
            }
          }
        }
      }

      fetchBills();

      toast.success(`${bill.name} marked as paid!`, {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await supabase
                .from('bills')
                .update({ status: 'pending', last_paid_date: bill.last_paid_date || null })
                .eq('id', bill.id)
                .eq('user_id', user.id);
              if (paymentData?.id) {
                await supabase.from('bill_payments').delete().eq('id', paymentData.id);
              }
              toast.success(`${bill.name} restored to unpaid`);
              fetchBills();
            } catch (error) {
              console.error('Error undoing payment:', error);
              toast.error('Failed to undo payment');
            }
          },
        },
        duration: 5000,
      });
    } catch (error) {
      console.error('Error quick-paying bill:', error);
      toast.error('Failed to mark bill as paid');
    }
  };

  const handleEditBill = (bill: Bill) => {
    setSelectedBill(bill);
    setShowCreateModal(true);
  };

  const handleDeleteBill = async (billId: string) => {
    if (!user) {
      toast.error('Please sign in again to manage bills');
      return;
    }

    // Verify session is still valid
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error('Your session has expired. Please sign in again.');
      return;
    }

    const { error, count } = await supabase
      .from('bills')
      .delete()
      .eq('id', billId)
      .eq('user_id', user.id);

    if (error) {
      console.error('[Bills] Delete error:', error);
      toast.error('Failed to delete bill');
    } else {
      toast.success('Bill deleted');
      fetchBills();
    }
  };

  // Parse date string as local date to avoid UTC timezone shifting
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Project recurring bills into the selected month
  // If a recurring bill's due_date is in a different month, generate a virtual instance
  // with the due_date adjusted to the same day-of-month in the selected month
  const getMonthlyBillsWithRecurring = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const selectedYear = selectedMonth.getFullYear();
    const selectedMonthNum = selectedMonth.getMonth();

    const result: Bill[] = [];
    const seenIds = new Set<string>();
    // Track bill names that naturally fall in this month to avoid projecting duplicates
    const namesInMonth = new Set<string>();
    // Track bills by name to deduplicate paid+pending in same month
    const billsByName = new Map<string, Bill[]>();

    // First pass: collect bills that naturally fall in this month
    for (const bill of bills) {
      const dueDate = parseLocalDate(bill.due_date);
      const inSelectedMonth = dueDate >= monthStart && dueDate <= monthEnd;
      if (inSelectedMonth) {
        const key = bill.name.toLowerCase();
        if (!billsByName.has(key)) billsByName.set(key, []);
        // Mark as projected if viewing a future month
        const billEntry = isFutureMonth ? { ...bill, is_projected: true } : bill;
        billsByName.get(key)!.push(billEntry);
        seenIds.add(bill.id);
        namesInMonth.add(key);
      }
    }

    // Deduplicate: if same bill name has both paid and pending in same month,
    // only show the pending one (the paid one is historical)
    for (const [, sameBills] of billsByName) {
      if (sameBills.length > 1) {
        const hasPending = sameBills.some(b => b.status === 'pending' || b.status === 'overdue');
        if (hasPending) {
          // Only add pending/overdue bills, skip paid duplicates
          for (const b of sameBills) {
            if (b.status !== 'paid') result.push(b);
          }
        } else {
          // All paid — show all
          for (const b of sameBills) result.push(b);
        }
      } else {
        result.push(sameBills[0]);
      }
    }

    // Second pass: project recurring bills that don't already have an instance this month
    for (const bill of bills) {
      if (seenIds.has(bill.id)) continue;
      if (!bill.is_recurring) continue;
      
      // Skip if a bill with the same name already exists in this month
      if (namesInMonth.has(bill.name.toLowerCase())) continue;

      const dueDate = parseLocalDate(bill.due_date);
      
      // IMPORTANT: Only project bills whose original due date is in a PAST or CURRENT month
      // relative to the selected month. Never project a future bill backward into an earlier month.
      const billMonth = dueDate.getFullYear() * 12 + dueDate.getMonth();
      const viewMonth = selectedYear * 12 + selectedMonthNum;
      if (billMonth > viewMonth) continue;

      // IMPORTANT: If the bill has an end_date, don't project past it
      if (bill.end_date) {
        const endDate = parseLocalDate(bill.end_date);
        const projectedDate = new Date(selectedYear, selectedMonthNum, 1);
        if (projectedDate > endDate) continue;
      }

      const dayOfMonth = dueDate.getDate();
      const lastDayOfMonth = endOfMonth(new Date(selectedYear, selectedMonthNum, 1)).getDate();
      const projectedDay = Math.min(dayOfMonth, lastDayOfMonth);
      const projectedDateStr = `${selectedYear}-${String(selectedMonthNum + 1).padStart(2, '0')}-${String(projectedDay).padStart(2, '0')}`;
      
      result.push({
        ...bill,
        due_date: projectedDateStr,
        status: 'pending',
        last_paid_date: null,
        is_projected: true,
      });
      seenIds.add(bill.id);
      namesInMonth.add(bill.name.toLowerCase());
    }

    return result;
  }, [bills, selectedMonth]);

  const categorizeBills = () => {
    const today = startOfToday();
    const nextWeek = addDays(today, 7);
    
    const filteredBills = getMonthlyBillsWithRecurring;

    // If viewing current month, categorize normally
    if (isCurrentMonth) {
      const overdue = filteredBills.filter(bill => 
        bill.status !== 'paid' && isBefore(parseLocalDate(bill.due_date), today)
      );

      const dueToday = filteredBills.filter(bill => 
        bill.status !== 'paid' && isToday(parseLocalDate(bill.due_date))
      );
      
      const tomorrow = filteredBills.filter(bill => 
        bill.status !== 'paid' && isTomorrow(parseLocalDate(bill.due_date))
      );
      
      const thisWeek = filteredBills.filter(bill => {
        const dueDate = parseLocalDate(bill.due_date);
        return bill.status !== 'paid' && 
               !isToday(dueDate) &&
               !isTomorrow(dueDate) && 
               !isBefore(dueDate, today) &&
               isBefore(dueDate, nextWeek);
      });
      
      const later = filteredBills.filter(bill => {
        const dueDate = parseLocalDate(bill.due_date);
        return bill.status !== 'paid' && !isBefore(dueDate, today) && !isToday(dueDate) && !isBefore(dueDate, nextWeek);
      });
      
      const paid = filteredBills.filter(bill => bill.status === 'paid');

      return { overdue, dueToday, tomorrow, thisWeek, later, paid };
    }

    // For past/future months, show all bills grouped by status
    const unpaid = filteredBills.filter(bill => bill.status !== 'paid');
    const paid = filteredBills.filter(bill => bill.status === 'paid');
    
    return { overdue: [], dueToday: [], tomorrow: [], thisWeek: [], later: unpaid, paid };
  };

  const { overdue, dueToday, tomorrow, thisWeek, later, paid } = categorizeBills();
  const totalOverdue = overdue.reduce((sum, b) => sum + Number(b.amount), 0);

  // Use projected monthly bills for summary
  const monthlyBills = getMonthlyBillsWithRecurring;
  const monthlyTotal = monthlyBills.reduce((sum, b) => sum + Number(b.amount), 0);
  const monthlyPaid = monthlyBills.filter(b => b.status === 'paid');
  const monthlyPaidTotal = monthlyPaid.reduce((sum, b) => sum + Number(b.amount), 0);
  const monthlyUnpaid = monthlyBills.filter(b => b.status !== 'paid');
  const monthlyUnpaidTotal = monthlyUnpaid.reduce((sum, b) => sum + Number(b.amount), 0);

  const handleExportCSV = () => {
    exportBillsToCSV(bills);
    toast.success('Bills exported to CSV');
  };

  const handleExportPDF = async () => {
    toast.loading('Generating PDF...');
    try {
      await exportBillsToPDF(bills);
      toast.dismiss();
      toast.success('PDF generated');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate PDF');
    }
  };

  const quickActions = [
    { label: 'Review Variable', icon: TrendingDown, color: 'bg-orange-500', action: () => setShowVariableReviewModal(true) },
    { label: 'Smart Alerts', icon: Settings, color: 'bg-violet-500', action: () => setShowSmartAlertsModal(true) },
    { label: 'Monthly View', icon: BarChart3, color: 'bg-emerald-500', action: () => setShowMonthlyModal(true) },
  ];

  const fileMenuActions = [
    { label: 'Import CSV', icon: Upload, action: () => setShowImportModal(true) },
    { label: 'Export CSV', icon: Download, action: handleExportCSV },
    { label: 'PDF Report', icon: FileText, action: handleExportPDF },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center loading-screen-bg">
        <LoadingSpinner size="lg" text="Loading your bills..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Bills | CoinsBloom - Never Miss a Payment</title>
        <meta name="description" content="Track and manage your recurring bills with CoinsBloom. Set reminders, view payment history, and never miss a due date again." />
        <meta name="robots" content="noindex" />
      </Helmet>
      <DashboardHeader />
      {/* Hero Header */}
      <PageHeroHeader
        title="Bills"
        subtitle="Track and manage your recurring payments"
        icon={<FileText className="h-6 w-6 text-[hsl(35,80%,85%)]" />}
        colorScheme="orange"
      />

      <BloomCoachTip
        example="Add my Netflix bill for $15.99 due on the 20th"
        dismissKey="bloom_tip_bills"
      />

      {/* Action buttons below hero for consistent header height */}
      <div className="flex gap-2 px-4 pt-3 max-w-6xl mx-auto">
        <Button onClick={() => setShowQuickAddModal(true)} variant="outline" size="sm">
          <Zap className="h-4 w-4 mr-2" /> Quick Add
        </Button>
        <Button onClick={() => { setSelectedBill(null); setShowCreateModal(true); }} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Bill
        </Button>
      </div>
      <div className="px-4 pt-4 max-w-6xl mx-auto">
        <div className="rounded-2xl overflow-hidden border border-border/60 shadow-lg">
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />
          <div className="bg-card p-4">
            {/* Month & Total */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{format(selectedMonth, 'MMMM yyyy')}</p>
                <p className="text-2xl font-extrabold text-foreground">{monthlyBills.length} <span className="text-base font-medium text-muted-foreground">bill{monthlyBills.length !== 1 ? 's' : ''}</span></p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">Total Monthly</p>
                <p className="text-2xl font-extrabold text-foreground">${monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
            {/* Paid / Remaining pills */}
            <div className="flex gap-3">
              <div className="flex-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 rounded-xl px-3 py-2.5 text-center">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{monthlyPaid.length} Paid</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${monthlyPaidTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              {monthlyUnpaid.length > 0 && (
                <div className="flex-1 bg-orange-50 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/40 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-xs font-medium text-orange-600 dark:text-orange-400">{monthlyUnpaid.length} Remaining</p>
                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">${monthlyUnpaidTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Trend Chart - Page level */}
      <div className="px-4 pt-3">
        <BillPaymentTrendChart bills={getMonthlyBillsWithRecurring} selectedMonth={selectedMonth} />
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="px-4 pt-4 pb-3"
      >
        <div className="flex flex-wrap gap-2 justify-center">
          {quickActions.map((action) => (
            <button
              key={action.label}
              onClick={action.action}
              className={`${action.color} text-white rounded-xl px-3 py-2.5 flex items-center gap-1.5 hover:opacity-90 transition-opacity`}
            >
              <action.icon className="h-4 w-4" />
              <span className="text-xs font-medium whitespace-nowrap">{action.label}</span>
            </button>
          ))}
          {/* Import / Export dropdown */}
          <Popover open={showFileMenu} onOpenChange={setShowFileMenu}>
            <PopoverTrigger asChild>
              <button className="bg-blue-500 text-white rounded-xl px-3 py-2.5 flex items-center gap-1.5 hover:opacity-90 transition-opacity">
                <Download className="h-4 w-4" />
                <span className="text-xs font-medium whitespace-nowrap">Import / Export</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              {fileMenuActions.map((item) => (
                <button
                  key={item.label}
                  onClick={() => { item.action(); setShowFileMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </motion.div>

      {/* Month Navigation & Filters */}
      <div className="px-4 pb-3 flex gap-2 items-center justify-center flex-wrap max-w-6xl mx-auto">
        <div className="flex items-center gap-0.5 rounded-full px-2 py-1 shrink-0 border border-primary/30 bg-primary/5">
          <button 
            onClick={() => { setSelectedMonth(subMonths(selectedMonth, 1)); setAllBillsPage(1); }}
            className="p-1 hover:bg-primary/10 rounded-full transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-primary" />
          </button>
          <div className="flex items-center gap-1 px-1.5">
            <Calendar className="h-3.5 w-3.5 text-primary" />
            <span className="text-foreground text-xs font-medium">{format(selectedMonth, 'MMM yyyy')}</span>
          </div>
          <button 
            onClick={() => { setSelectedMonth(addMonths(selectedMonth, 1)); setAllBillsPage(1); }}
            className="p-1 hover:bg-primary/10 rounded-full transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5 text-primary" />
          </button>
        </div>
        {!isCurrentMonth && (
          <button 
            onClick={() => { setSelectedMonth(new Date()); setAllBillsPage(1); }}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground shrink-0"
          >
            Today
          </button>
        )}
        
        <button 
          onClick={() => handleFilterChange('recurring')}
          className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-colors border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
        >
          <RefreshCw className="h-3 w-3" />
          Recurring
        </button>
        <button 
          onClick={() => handleFilterChange('variable')}
          className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-colors border border-bloom-blue/40 bg-bloom-blue/5 text-bloom-blue hover:bg-bloom-blue/10"
        >
          <TrendingDown className="h-3 w-3" />
          Variable
        </button>
        <button 
          onClick={() => handleFilterChange('one_time')}
          className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-colors border border-bloom-green/40 bg-bloom-green/5 text-bloom-green hover:bg-bloom-green/10"
        >
          <Calendar className="h-3 w-3" />
          One-time
        </button>
        <Popover>
          <PopoverTrigger asChild>
            <button className="p-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex-shrink-0">
              <Info className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="bottom" align="end" className="w-72 text-xs">
            <p className="font-semibold mb-2">How bills are categorized:</p>
            <ul className="space-y-1.5 text-muted-foreground">
              <li><span className="font-medium text-foreground">Recurring:</span> Bills that repeat (monthly, weekly, etc.).</li>
              <li><span className="font-medium text-foreground">Variable:</span> Bills where the amount changes each period.</li>
              <li><span className="font-medium text-foreground">One-time:</span> Bills that only occur once.</li>
            </ul>
          </PopoverContent>
        </Popover>
      </div>

      {/* Main Content */}
      <div className="bg-background rounded-t-3xl min-h-[60vh] p-4 max-w-6xl mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto scrollbar-hide flex-nowrap mb-4 border border-border/60">
            <TabsTrigger value="overview" className="shrink-0">Overview</TabsTrigger>
            <TabsTrigger value="list" className="shrink-0">All Bills</TabsTrigger>
            <TabsTrigger value="autopay" className="shrink-0">Autopay</TabsTrigger>
            <TabsTrigger value="optimizer" className="shrink-0">Optimizer</TabsTrigger>
            <TabsTrigger value="calendar" className="shrink-0">Calendar</TabsTrigger>
            <TabsTrigger value="analytics" className="shrink-0">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* URGENT ALERTS - Always visible above bills */}
            {overdue.length > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <h3 className="font-semibold text-destructive">Payment Alert</h3>
                      <p className="text-destructive/80 text-sm">
                        You have {overdue.length} overdue bill{overdue.length > 1 ? 's' : ''} totaling ${totalOverdue.toFixed(2)}. 
                        Please make these payments as soon as possible to avoid late fees.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Due Soon Summary */}
            <Card className="border-primary/30">
              <CardContent className="p-3 space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" /> Due Soon
                </h3>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-sm">Overdue</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${overdue.length > 0 ? 'bg-destructive text-destructive-foreground' : 'bg-muted'}`}>
                    {overdue.length} bills
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">This Week</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                    {(dueToday.length + tomorrow.length + thisWeek.length)} bills
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm">Later</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-muted">
                    {later.length} bills
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Cash Flow Status */}
            <BudgetShortfallAlert bills={getMonthlyBillsWithRecurring} selectedMonth={selectedMonth} />

            {/* Payment Overview - Collapsible, default closed */}
            <Collapsible>
              <Card className="border-border/60">
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Payment Overview & History</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 px-3 pb-3">
                    <BillsOverview bills={getMonthlyBillsWithRecurring} selectedMonth={selectedMonth} />
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* ACTION ITEMS - Collapsible section for non-urgent banners */}
            {(() => {
              const variablePendingBills = getMonthlyBillsWithRecurring.filter(
                b => b.is_variable_amount && b.status === 'pending'
              );
              const hasVariableBills = variablePendingBills.length > 0 && isCurrentMonth;
              
              return (
                <Collapsible defaultOpen={!variableAmountsVerified || hasVariableBills}>
                  <Card className="border-primary/30 bg-primary/5">
                    <CollapsibleTrigger className="w-full group">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">Action Items & Notifications</span>
                          </div>
                          <ChevronDown className="h-4 w-4 text-primary/60 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                        </div>
                      </CardContent>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 px-3 pb-3 space-y-3">
                        <SmsBillMatchBanner />
                        
                        {/* Variable Bills Review Banner */}
                        {hasVariableBills && (
                          variableAmountsVerified ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
                              <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                                  Variable amounts verified ✓
                                </p>
                                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                                  {variablePendingBills.length} bill{variablePendingBills.length > 1 ? 's' : ''} · ${variablePendingBills.reduce((s, b) => s + b.amount, 0).toFixed(2)} total
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs text-emerald-600 dark:text-emerald-400"
                                onClick={(e) => { e.stopPropagation(); setShowVariableReviewModal(true); }}
                              >
                                Re-review
                              </Button>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20">
                              <div className="flex items-start gap-3">
                                <TrendingDown className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                                <div className="flex-1">
                                  <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-sm">
                                    {variablePendingBills.length} Variable Bill{variablePendingBills.length > 1 ? 's' : ''} to Review
                                  </h3>
                                  <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
                                    ~${variablePendingBills.reduce((s, b) => s + b.amount, 0).toFixed(2)} estimated. Update from your latest statements.
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-2 border-amber-400 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-xs"
                                    onClick={(e) => { e.stopPropagation(); setShowVariableReviewModal(true); }}
                                  >
                                    Review & Update
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )
                        )}

                        <PushNotificationBanner />
                        <PlaidBillSuggestions onBillAdded={fetchBills} />
                        {isFeatureEnabled('gmail_bill_detection') && <GmailBillImport />}
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })()}

            {/* Bill Sections */}
            <div ref={billListRef} className="mx-2 sm:mx-0 space-y-4 scroll-mt-4">
            {/* Overdue */}
            {overdue.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-destructive flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Overdue ({overdue.length})
                </h3>
                {overdue.map(bill => (
                  <BillCard 
                    key={bill.id} 
                    bill={bill} 
                    variant="overdue"
                    isFutureMonth={isFutureMonth}
                    onPay={() => handlePayBill(bill)}
                    onQuickPay={() => handleQuickPay(bill)}
                    onEdit={() => handleEditBill(bill)}
                    onDelete={() => handleDeleteBill(bill.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="font-semibold text-destructive/40 flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4" /> Overdue (0)
                </h3>
                <p className="text-xs text-muted-foreground pl-6">✓ Nothing overdue</p>
              </div>
            )}

            {/* Due Today */}
            {dueToday.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                  <Zap className="h-4 w-4" /> Due Today ({dueToday.length})
                </h3>
                {dueToday.map(bill => (
                  <BillCard 
                    key={bill.id} 
                    bill={bill} 
                    variant="urgent"
                    isFutureMonth={isFutureMonth}
                    onPay={() => handlePayBill(bill)}
                    onQuickPay={() => handleQuickPay(bill)}
                    onEdit={() => handleEditBill(bill)}
                    onDelete={() => handleDeleteBill(bill.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="font-semibold text-orange-600/40 dark:text-orange-400/40 flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4" /> Due Today (0)
                </h3>
                <p className="text-xs text-muted-foreground pl-6">✓ Nothing due today</p>
              </div>
            )}

            {/* Tomorrow */}
            {tomorrow.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Tomorrow ({tomorrow.length})
                </h3>
                {tomorrow.map(bill => (
                  <BillCard 
                    key={bill.id} 
                    bill={bill} 
                    variant="urgent"
                    isFutureMonth={isFutureMonth}
                    onPay={() => handlePayBill(bill)}
                    onQuickPay={() => handleQuickPay(bill)}
                    onEdit={() => handleEditBill(bill)}
                    onDelete={() => handleDeleteBill(bill.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="font-semibold text-muted-foreground/50 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" /> Tomorrow (0)
                </h3>
                <p className="text-xs text-muted-foreground pl-6">✓ Nothing due tomorrow</p>
              </div>
            )}

            {/* This Week */}
            {thisWeek.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> This Week ({thisWeek.length})
                </h3>
                {thisWeek.map(bill => (
                  <BillCard 
                    key={bill.id} 
                    bill={bill} 
                    variant="default"
                    isFutureMonth={isFutureMonth}
                    onPay={() => handlePayBill(bill)}
                    onQuickPay={() => handleQuickPay(bill)}
                    onEdit={() => handleEditBill(bill)}
                    onDelete={() => handleDeleteBill(bill.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="font-semibold text-muted-foreground/50 flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4" /> This Week (0)
                </h3>
                <p className="text-xs text-muted-foreground pl-6">✓ Nothing due this week</p>
              </div>
            )}

            {/* Later */}
            {later.length > 0 ? (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" /> Later ({later.length})
                </h3>
                {later.map(bill => (
                  <BillCard 
                    key={bill.id} 
                    bill={bill} 
                    variant="default"
                    isFutureMonth={isFutureMonth}
                    onPay={() => handlePayBill(bill)}
                    onQuickPay={() => handleQuickPay(bill)}
                    onEdit={() => handleEditBill(bill)}
                    onDelete={() => handleDeleteBill(bill.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="font-semibold text-muted-foreground/30 flex items-center gap-2 text-sm">
                  <TrendingUp className="h-4 w-4" /> Later (0)
                </h3>
                <p className="text-xs text-muted-foreground pl-6">✓ Nothing scheduled later</p>
              </div>
            )}

            {/* Paid */}
            <div className="space-y-3">
              <button 
                className="w-full py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-emerald-600 dark:text-emerald-400 font-medium flex items-center justify-center gap-2 transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                onClick={() => setShowPaidBills(!showPaidBills)}
              >
                <CheckCircle2 className="h-4 w-4" /> 
                {showPaidBills ? "Hide" : "Show"} Paid Bills ({paid.length})
              </button>
              
              {showPaidBills && paid.length > 0 && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                  {paid.map(bill => (
                    <BillCard 
                      key={bill.id} 
                      bill={bill} 
                      variant="paid"
                      isFutureMonth={isFutureMonth}
                      onPay={() => handlePayBill(bill)}
                      onQuickPay={() => handleQuickPay(bill)}
                      onEdit={() => handleEditBill(bill)}
                      onDelete={() => handleDeleteBill(bill.id)}
                    />
                  ))}
                </div>
              )}
              {showPaidBills && paid.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No paid bills this month</p>
              )}
            </div>
            </div>

            {/* Empty state for selected month */}
            {overdue.length === 0 && dueToday.length === 0 && tomorrow.length === 0 && thisWeek.length === 0 && later.length === 0 && paid.length === 0 && !isLoading && (
              <Card className="bg-card/50 border-border/50">
                <CardContent className="p-8 text-center animate-fade-in">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-primary" />
                  </div>
                  {bills.length === 0 ? (
                    <>
                      <h3 className="text-lg font-semibold text-foreground mb-2">No bills yet</h3>
                      <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
                        Start tracking your bills to never miss a payment and stay on top of your finances
                      </p>
                      <Button onClick={() => { setSelectedBill(null); setShowCreateModal(true); }} className="gradient-primary text-primary-foreground">
                        <Plus className="h-4 w-4 mr-2" /> Add Bill
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        No bills for {format(selectedMonth, 'MMMM yyyy')}
                      </h3>
                      <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
                        {isBefore(selectedMonth, new Date()) 
                          ? "No bills were due during this period"
                          : "No bills scheduled for this month yet"}
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => setSelectedMonth(new Date())}
                      >
                        Go to Current Month
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}


            {/* Bills vs Debts Info Card - Collapsible */}
            <Collapsible>
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CollapsibleTrigger className="w-full">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg">
                          <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h4 className="font-semibold">💡 Bills vs Debts - What's the Difference?</h4>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0 px-4 pb-4">
                    <div className="space-y-2 ml-12">
                      <p className="text-sm">
                        <span className="text-blue-600 dark:text-blue-400 font-medium">Bills Page:</span> For recurring monthly obligations (Netflix, rent, insurance, credit card MINIMUMS). Set autopay to never miss a payment.
                      </p>
                      <p className="text-sm">
                        <span className="text-purple-600 dark:text-purple-400 font-medium">Debts Page:</span> For paying down large BALANCES (credit cards, loans, mortgages). Make one-time payments and track your debt-free journey.
                      </p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {/* Header with Add button */}
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{monthlyBills.length} bills for {format(selectedMonth, 'MMMM yyyy')}</p>
              <button
                onClick={() => { setSelectedBill(null); setShowCreateModal(true); }}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Bill
              </button>
            </div>

            {/* Search, Filter & Sort */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setAllBillsPage(1); }}
                  placeholder="Search bills by name..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <select
                  value={categoryFilter}
                  onChange={(e) => { setCategoryFilter(e.target.value); setAllBillsPage(1); }}
                  className="px-3 py-1.5 rounded-lg border bg-background text-sm"
                >
                  <option value="all">All Categories</option>
                  <option value="mortgage">🏠 Mortgage</option>
                  <option value="rent">🏢 Rent</option>
                  <option value="utilities">💡 Utilities</option>
                  <option value="insurance">🛡️ Insurance</option>
                  <option value="subscriptions">📱 Subscriptions</option>
                  <option value="phone">📞 Phone</option>
                  <option value="internet">🌐 Internet</option>
                  <option value="streaming">📺 Streaming</option>
                  <option value="credit_card">💳 Credit Card</option>
                  <option value="loans">💳 Loans</option>
                  <option value="student_loan">🎓 Student Loan</option>
                  <option value="medical">🏥 Medical</option>
                  <option value="transportation">🚗 Transportation</option>
                  <option value="other">📁 Other</option>
                </select>
                <select
                  value={`${sortBy}_${sortDir}`}
                  onChange={(e) => {
                    const [field, dir] = e.target.value.split('_') as [typeof sortBy, typeof sortDir];
                    setSortBy(field);
                    setSortDir(dir);
                    setAllBillsPage(1);
                  }}
                  className="px-3 py-1.5 rounded-lg border bg-background text-sm"
                >
                  <option value="due_date_asc">Due Date ↑</option>
                  <option value="due_date_desc">Due Date ↓</option>
                  <option value="amount_asc">Amount ↑</option>
                  <option value="amount_desc">Amount ↓</option>
                  <option value="name_asc">Name A-Z</option>
                  <option value="name_desc">Name Z-A</option>
                  <option value="status_asc">Status</option>
                </select>
              </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-primary/10 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Total Monthly</p>
                <p className="text-lg font-bold text-primary">${monthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="rounded-xl p-3 border">
                <p className="text-xs text-muted-foreground">Paid</p>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{paid.length} bills</p>
              </div>
              <div className="rounded-xl p-3 border">
                <p className="text-xs text-muted-foreground">Unpaid</p>
                <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{monthlyUnpaid.length} bills</p>
              </div>
            </div>

            {/* Table */}
            {(() => {
              const BILLS_PER_PAGE = 15;
              // Apply search, category filter, and sort
              let filteredBills = [...monthlyBills];
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                filteredBills = filteredBills.filter(b => b.name.toLowerCase().includes(q));
              }
              if (categoryFilter !== 'all') {
                filteredBills = filteredBills.filter(b => b.category === categoryFilter);
              }
              filteredBills.sort((a, b) => {
                let cmp = 0;
                if (sortBy === 'due_date') cmp = parseLocalDate(a.due_date).getTime() - parseLocalDate(b.due_date).getTime();
                else if (sortBy === 'amount') cmp = a.amount - b.amount;
                else if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
                else if (sortBy === 'status') cmp = a.status.localeCompare(b.status);
                return sortDir === 'desc' ? -cmp : cmp;
              });
              const sortedAllBills = filteredBills;
              const totalPages = Math.max(1, Math.ceil(sortedAllBills.length / BILLS_PER_PAGE));
              const paginatedBills = sortedAllBills.slice((allBillsPage - 1) * BILLS_PER_PAGE, allBillsPage * BILLS_PER_PAGE);

              return (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-muted-foreground">
                      Showing {sortedAllBills.length === 0 ? 0 : (allBillsPage - 1) * BILLS_PER_PAGE + 1}–{Math.min(allBillsPage * BILLS_PER_PAGE, sortedAllBills.length)} of <span className="font-semibold text-foreground">{sortedAllBills.length}</span> bills
                    </p>
                  </div>
                  <div className="space-y-2">
                    {paginatedBills.map(bill => {
                      const billDate = new Date(bill.due_date);
                      const today = startOfToday();
                      let variant: 'overdue' | 'urgent' | 'default' | 'paid' = 'default';
                      if (bill.status === 'paid') variant = 'paid';
                      else if (isBefore(billDate, today)) variant = 'overdue';
                      else if (isToday(billDate) || isTomorrow(billDate)) variant = 'urgent';
                      
                      return (
                        <BillCard
                          key={bill.id}
                          bill={bill}
                          variant={variant}
                          isFutureMonth={isFutureMonth}
                          onPay={() => handlePayBill(bill)}
                          onQuickPay={() => handleQuickPay(bill)}
                          onEdit={() => handleEditBill(bill)}
                          onDelete={() => handleDeleteBill(bill.id)}
                        />
                      );
                    })}
                    {sortedAllBills.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        No bills found
                      </div>
                    )}
                  </div>
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-xs text-muted-foreground">
                        Page {allBillsPage} of {totalPages}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setAllBillsPage(p => Math.max(1, p - 1))}
                          disabled={allBillsPage === 1}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter(p => p === 1 || p === totalPages || Math.abs(p - allBillsPage) <= 1)
                          .map((p, idx, arr) => (
                            <span key={p}>
                              {idx > 0 && arr[idx - 1] !== p - 1 && <span className="text-xs text-muted-foreground px-1">…</span>}
                              <button
                                onClick={() => setAllBillsPage(p)}
                                className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                                  p === allBillsPage
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted text-muted-foreground'
                                }`}
                              >
                                {p}
                              </button>
                            </span>
                          ))}
                        <button
                          onClick={() => setAllBillsPage(p => Math.min(totalPages, p + 1))}
                          disabled={allBillsPage === totalPages}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </TabsContent>

          <TabsContent value="autopay">
            <AutopaySettingsTab bills={getMonthlyBillsWithRecurring} onBillUpdated={fetchBills} />
          </TabsContent>

          <TabsContent value="optimizer">
            <BillOptimizer bills={getMonthlyBillsWithRecurring} />
          </TabsContent>

          <TabsContent value="calendar">
            <BillsCalendar bills={bills} selectedMonth={selectedMonth} />
          </TabsContent>

          <TabsContent value="analytics">
            <BillsAnalytics bills={getMonthlyBillsWithRecurring} selectedMonth={selectedMonth} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <CreateBillModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
        bill={selectedBill}
        onSuccess={fetchBills}
      />
      <PayBillModal
        open={showPayModal}
        onOpenChange={setShowPayModal}
        bill={selectedBill}
        onSuccess={fetchBills}
      />
      <BillsMonthlyModal
        open={showMonthlyModal}
        onOpenChange={setShowMonthlyModal}
        bills={getMonthlyBillsWithRecurring}
        selectedMonth={selectedMonth}
        onPayBill={(bill) => { setSelectedBill(bill as Bill); setShowPayModal(true); }}
        onEditBill={(bill) => { setSelectedBill(bill as Bill); setShowCreateModal(true); }}
      />
      <SmartAlertsModal
        open={showSmartAlertsModal}
        onOpenChange={setShowSmartAlertsModal}
        bills={getMonthlyBillsWithRecurring}
        onRefresh={fetchBills}
      />
      <CSVImportModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        importType="bills"
        existingRecords={bills}
        onSuccess={fetchBills}
      />
      <QuickAddBillsModal
        open={showQuickAddModal}
        onOpenChange={setShowQuickAddModal}
        onSuccess={fetchBills}
      />
      <VariableBillReviewModal
        open={showVariableReviewModal}
        onOpenChange={setShowVariableReviewModal}
        selectedMonth={selectedMonth}
        bills={getMonthlyBillsWithRecurring}
        onSuccess={() => {
          fetchBills();
          const key = `variable_verified_${selectedMonth.getFullYear()}_${selectedMonth.getMonth()}`;
          localStorage.setItem(key, 'true');
          setVariableAmountsVerified(true);
        }}
      />
      <FilteredBillsModal
        open={showFilterModal}
        onOpenChange={setShowFilterModal}
        filterType={activeFilterType}
        bills={getMonthlyBillsWithRecurring}
        isFutureMonth={isFutureMonth}
        onPay={handlePayBill}
        onQuickPay={handleQuickPay}
        onEdit={handleEditBill}
        onDelete={handleDeleteBill}
      />
    </div>
  );
};

export default Bills;
