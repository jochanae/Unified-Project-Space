import { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { format, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeatureGate } from '@/components/subscription/FeatureGate';
import { FinanceCarousel } from '@/components/finances/FinanceCarousel';
import { FinanceCalendar } from '@/components/finances/FinanceCalendar';
import { BudgetPlanner } from '@/components/finances/BudgetPlanner';
import { BudgetEntryList } from '@/components/finances/BudgetEntryList';
import { BillsTracker } from '@/components/finances/BillsTracker';
import { BillPaymentTrendChart } from '@/components/finances/BillPaymentTrendChart';
import { SavingsGoalsList } from '@/components/finances/SavingsGoalsList';
import { NetWorthTracker } from '@/components/finances/NetWorthTracker';
import { NetWorthSummaryCards } from '@/components/finances/NetWorthSummaryCards';
import { AddBudgetEntryDialog } from '@/components/finances/AddBudgetEntryDialog';
import { AddBillDialog } from '@/components/finances/AddBillDialog';
import { AddSavingsGoalDialog } from '@/components/finances/AddSavingsGoalDialog';
import { AddNetWorthItemDialog } from '@/components/finances/AddNetWorthItemDialog';
import { FinanceExportImport } from '@/components/finances/FinanceExportImport';
import { useFinances } from '@/hooks/useFinances';
import { useNetWorth } from '@/hooks/useNetWorth';
import { useReminders } from '@/hooks/useReminders';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import {
  parseBudgetEntriesCSV,
  parseBillsCSV,
  parseSavingsGoalsCSV,
  parseNetWorthCSV,
} from '@/lib/financeImportUtils';
import { toast } from 'sonner';

export default function MyFinances() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const {
    entries, bills, savingsGoals, isLoading, summary,
    addEntry, updateEntry, deleteEntry,
    addBill, updateBill, toggleBillPaid, deleteBill,
    addSavingsGoal, updateSavingsGoal, updateSavingsGoalFull, deleteSavingsGoal,
  } = useFinances(selectedMonth);

  const {
    items: netWorthItems,
    manualAssets,
    manualLiabilities,
    isLoading: netWorthLoading,
    summary: netWorthSummary,
    itemsDueForReview,
    addItem,
    updateItem,
    deleteItem,
  } = useNetWorth(summary.totalSaved);

  const { reminders } = useReminders();

  // Extended summary for carousel net worth slide
  const extendedSummary = {
    ...summary,
    netWorth: netWorthSummary.netWorth,
    totalAssets: netWorthSummary.totalAssets,
    totalLiabilities: netWorthSummary.totalLiabilities,
  };

  // Import handlers — bulk insert parsed CSV data
  const handleImportBudget = async (text: string) => {
    const { entries: parsed } = parseBudgetEntriesCSV(text);
    if (!user?.id || parsed.length === 0) return;
    const rows = parsed.map(e => ({ ...e, user_id: user.id }));
    const { error } = await supabase.from('budget_entries').insert(rows);
    if (error) { toast.error('Import failed'); return; }
    toast.success(`${rows.length} budget entries imported`);
    queryClient.invalidateQueries({ queryKey: ['budget-entries'] });
  };

  const handleImportBills = async (text: string) => {
    const { bills: parsed } = parseBillsCSV(text);
    if (!user?.id || parsed.length === 0) return;
    const rows = parsed.map(b => ({ ...b, user_id: user.id }));
    const { error } = await supabase.from('bills').insert(rows);
    if (error) { toast.error('Import failed'); return; }
    toast.success(`${rows.length} bills imported`);
    queryClient.invalidateQueries({ queryKey: ['bills'] });
  };

  const handleImportSavings = async (text: string) => {
    const { goals: parsed } = parseSavingsGoalsCSV(text);
    if (!user?.id || parsed.length === 0) return;
    const rows = parsed.map(g => ({ ...g, user_id: user.id }));
    const { error } = await supabase.from('savings_goals').insert(rows);
    if (error) { toast.error('Import failed'); return; }
    toast.success(`${rows.length} savings goals imported`);
    queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
  };

  const handleImportNetWorth = async (text: string) => {
    const { items: parsed } = parseNetWorthCSV(text);
    if (!user?.id || parsed.length === 0) return;
    const rows = parsed.map(i => ({ ...i, user_id: user.id }));
    const { error } = await supabase.from('net_worth_items').insert(rows);
    if (error) { toast.error('Import failed'); return; }
    toast.success(`${rows.length} net worth items imported`);
    queryClient.invalidateQueries({ queryKey: ['net-worth-items'] });
  };

  // Dialog state for calendar quick-add and carousel actions
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [showAddAsset, setShowAddAsset] = useState(false);
  const [showAddLiability, setShowAddLiability] = useState(false);

  return (
    <DashboardLayout>
      <FeatureGate
        requiredTier="pro"
        featureName="My Finances"
        featureDescription="Track your income, expenses, bills, and savings goals — see how much you have available to invest."
        showLockedPreview
      >
        <div className="space-y-0">
          {/* Page Header */}
          <div className="px-4 sm:px-6 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">My Finances</h1>
                <p className="text-sm text-muted-foreground">
                  Track spending, bills, and savings to know your investing power.
                </p>
              </div>
              <FinanceExportImport
                entries={entries}
                bills={bills}
                savingsGoals={savingsGoals}
                netWorthItems={netWorthItems}
                summary={extendedSummary}
                onImportBudget={handleImportBudget}
                onImportBills={handleImportBills}
                onImportSavings={handleImportSavings}
                onImportNetWorth={handleImportNetWorth}
              />
            </div>
          </div>

          {isLoading || netWorthLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <LoadingSpinner size="lg" colorScheme="gold" />
              <p className="text-base font-medium text-muted-foreground animate-pulse tracking-wide">
                Loading your financial journey…
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Month Selector */}
              <div className="px-4 sm:px-6">
                <div className="flex items-center justify-center gap-3 py-2 px-4 rounded-xl bg-muted/40 border border-border/40">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedMonth(prev => subMonths(prev, 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold tracking-wide">
                      {format(selectedMonth, 'MMMM yyyy')}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedMonth(prev => addMonths(prev, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Net Worth Summary Cards — top of page */}
              <div className="px-4 sm:px-6">
                <NetWorthSummaryCards summary={netWorthSummary} />
              </div>

              {/* Immersive Finance Carousel — edge-to-edge */}
              <FinanceCarousel
                entries={entries}
                bills={bills}
                savingsGoals={savingsGoals}
                summary={extendedSummary}
                addEntry={addEntry}
                deleteEntry={deleteEntry}
                addBill={addBill}
                toggleBillPaid={toggleBillPaid}
                deleteBill={deleteBill}
                addSavingsGoal={addSavingsGoal}
                updateSavingsGoal={updateSavingsGoal}
                deleteSavingsGoal={deleteSavingsGoal}
                onAddAsset={() => setShowAddAsset(true)}
                onAddLiability={() => setShowAddLiability(true)}
              />

              {/* All collapsible sections */}
              <div className="px-4 sm:px-6 space-y-4">
                {/* Income & Expenses */}
                <BudgetEntryList
                  entries={entries}
                  addEntry={addEntry}
                  updateEntry={updateEntry}
                  deleteEntry={deleteEntry}
                />

                {/* Bill Payment Trend Chart */}
                <BillPaymentTrendChart bills={bills} selectedMonth={selectedMonth} />

                {/* Bills */}
                <BillsTracker
                  bills={bills}
                  summary={{ paidBills: summary.paidBills, unpaidBills: summary.unpaidBills, totalBills: summary.totalBills }}
                  addBill={addBill}
                  updateBill={updateBill}
                  toggleBillPaid={toggleBillPaid}
                  deleteBill={deleteBill}
                  selectedMonth={selectedMonth}
                />

                {/* Savings Goals */}
                <SavingsGoalsList
                  goals={savingsGoals}
                  addGoal={addSavingsGoal}
                  updateGoal={updateSavingsGoal}
                  updateGoalFull={updateSavingsGoalFull}
                  deleteGoal={deleteSavingsGoal}
                />

                {/* Net Worth: Summary + Assets + Liabilities */}
                <NetWorthTracker
                  items={netWorthItems}
                  manualAssets={manualAssets}
                  manualLiabilities={manualLiabilities}
                  summary={netWorthSummary}
                  itemsDueForReview={itemsDueForReview}
                  addItem={addItem}
                  updateItem={updateItem}
                  deleteItem={deleteItem}
                />

                {/* Budget Planner (category breakdown) */}
                <BudgetPlanner
                  entries={entries}
                  totalIncome={summary.totalIncome}
                  onAddEntry={() => setShowAddEntry(true)}
                />
              </div>

              {/* Finance Calendar */}
              <div className="px-4 sm:px-6 pb-6">
                <FinanceCalendar
                  entries={entries}
                  bills={bills}
                  savingsGoals={savingsGoals}
                  reminders={reminders}
                  selectedMonth={selectedMonth}
                  onMonthChange={setSelectedMonth}
                  onAddEntry={() => setShowAddEntry(true)}
                  onAddBill={() => setShowAddBill(true)}
                  onAddGoal={() => setShowAddGoal(true)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Dialogs triggered from calendar / carousel / budget planner */}
        <AddBudgetEntryDialog
          open={showAddEntry}
          onOpenChange={setShowAddEntry}
          onSubmit={(entry) => addEntry.mutate(entry)}
        />
        <AddBillDialog
          open={showAddBill}
          onOpenChange={setShowAddBill}
          onSubmit={(bill) => addBill.mutate(bill)}
        />
        <AddSavingsGoalDialog
          open={showAddGoal}
          onOpenChange={setShowAddGoal}
          onSubmit={(goal) => addSavingsGoal.mutate(goal)}
        />
        <AddNetWorthItemDialog
          open={showAddAsset}
          onOpenChange={setShowAddAsset}
          onSubmit={(item) => addItem.mutate(item)}
          defaultType="asset"
        />
        <AddNetWorthItemDialog
          open={showAddLiability}
          onOpenChange={setShowAddLiability}
          onSubmit={(item) => addItem.mutate(item)}
          defaultType="liability"
        />
      </FeatureGate>
    </DashboardLayout>
  );
}
