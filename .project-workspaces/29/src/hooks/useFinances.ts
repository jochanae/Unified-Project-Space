import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, format } from 'date-fns';

// Types
export interface BudgetEntry {
  id: string;
  user_id: string;
  type: 'income' | 'expense';
  category: string;
  description: string | null;
  amount: number;
  entry_date: string;
  is_recurring: boolean;
  recurring_interval: string | null;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  due_day: number;
  category: string;
  is_autopay: boolean;
  is_paid_this_month: boolean;
  last_paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  title: string;
  emoji: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export type NewBudgetEntry = Pick<BudgetEntry, 'type' | 'category' | 'description' | 'amount' | 'entry_date' | 'is_recurring' | 'recurring_interval'>;
export type UpdateBudgetEntry = Partial<NewBudgetEntry> & { id: string };
export type NewBill = Pick<Bill, 'name' | 'amount' | 'due_day' | 'category' | 'is_autopay'>;
export type UpdateBill = Partial<NewBill> & { id: string };
export type NewSavingsGoal = Pick<SavingsGoal, 'title' | 'emoji' | 'target_amount' | 'current_amount' | 'deadline'>;
export type UpdateSavingsGoal = Partial<NewSavingsGoal> & { id: string };

export const EXPENSE_CATEGORIES = [
  'housing', 'food', 'transport', 'utilities', 'insurance',
  'entertainment', 'healthcare', 'education', 'subscriptions', 'other',
] as const;

export const INCOME_CATEGORIES = [
  'salary', 'freelance', 'investments', 'side_hustle', 'gifts', 'other',
] as const;

export const BILL_CATEGORIES = [
  'rent', 'mortgage', 'utilities', 'insurance', 'subscriptions',
  'phone', 'internet', 'car', 'loan', 'credit_card', 'other',
] as const;

export function useFinances(selectedMonth?: Date) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const month = selectedMonth || new Date();
  const monthStart = format(startOfMonth(month), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(month), 'yyyy-MM-dd');

  // Fetch budget entries for the selected month
  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['budget-entries', user?.id, monthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_entries')
        .select('*')
        .gte('entry_date', monthStart)
        .lte('entry_date', monthEnd)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return (data || []) as BudgetEntry[];
    },
    enabled: !!user?.id,
  });

  // Fetch bills
  const { data: bills = [], isLoading: billsLoading } = useQuery({
    queryKey: ['bills', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bills')
        .select('*')
        .order('due_day', { ascending: true });
      if (error) throw error;
      return (data || []) as Bill[];
    },
    enabled: !!user?.id,
  });

  // Fetch savings goals
  const { data: savingsGoals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ['savings-goals', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SavingsGoal[];
    },
    enabled: !!user?.id,
  });

  // Mutations - Budget Entries
  const addEntry = useMutation({
    mutationFn: async (entry: NewBudgetEntry) => {
      const { error } = await supabase
        .from('budget_entries')
        .insert({ ...entry, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-entries'] });
      toast.success('Entry added!');
    },
    onError: () => toast.error('Failed to add entry'),
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateBudgetEntry) => {
      const { error } = await supabase.from('budget_entries').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-entries'] });
      toast.success('Entry updated!');
    },
    onError: () => toast.error('Failed to update entry'),
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budget_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-entries'] });
    },
    onError: () => toast.error('Failed to delete entry'),
  });

  // Mutations - Bills
  const addBill = useMutation({
    mutationFn: async (bill: NewBill) => {
      const { error } = await supabase
        .from('bills')
        .insert({ ...bill, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Bill added!');
    },
    onError: () => toast.error('Failed to add bill'),
  });

  const toggleBillPaid = useMutation({
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
      const { error } = await supabase
        .from('bills')
        .update({
          is_paid_this_month: isPaid,
          last_paid_at: isPaid ? new Date().toISOString() : null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
    onError: () => toast.error('Failed to update bill'),
  });

  const updateBill = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateBill) => {
      const { error } = await supabase.from('bills').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      toast.success('Bill updated!');
    },
    onError: () => toast.error('Failed to update bill'),
  });

  const deleteBill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bills').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
    onError: () => toast.error('Failed to delete bill'),
  });

  // Mutations - Savings Goals
  const addSavingsGoal = useMutation({
    mutationFn: async (goal: NewSavingsGoal) => {
      const { error } = await supabase
        .from('savings_goals')
        .insert({ ...goal, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Goal created!');
    },
    onError: () => toast.error('Failed to create goal'),
  });

  const updateSavingsGoal = useMutation({
    mutationFn: async ({ id, current_amount }: { id: string; current_amount: number }) => {
      const { error } = await supabase
        .from('savings_goals')
        .update({ current_amount })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Goal updated!');
    },
    onError: () => toast.error('Failed to update goal'),
  });

  const updateSavingsGoalFull = useMutation({
    mutationFn: async ({ id, ...updates }: UpdateSavingsGoal) => {
      const { error } = await supabase.from('savings_goals').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Goal updated!');
    },
    onError: () => toast.error('Failed to update goal'),
  });

  const deleteSavingsGoal = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('savings_goals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-goals'] });
      toast.success('Goal removed');
    },
    onError: () => toast.error('Failed to delete goal'),
  });

  // Computed summary
  const totalIncome = entries.filter(e => e.type === 'income').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpenses = entries.filter(e => e.type === 'expense').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalBills = bills.reduce((sum, b) => sum + Number(b.amount), 0);
  const paidBills = bills.filter(b => b.is_paid_this_month).reduce((sum, b) => sum + Number(b.amount), 0);
  const unpaidBills = totalBills - paidBills;
  const netCashFlow = totalIncome - totalExpenses - totalBills;
  const totalSavingsTarget = savingsGoals.filter(g => g.status === 'active').reduce((sum, g) => sum + Number(g.target_amount), 0);
  const totalSaved = savingsGoals.filter(g => g.status === 'active').reduce((sum, g) => sum + Number(g.current_amount), 0);

  return {
    // Data
    entries,
    bills,
    savingsGoals,
    // Loading
    isLoading: entriesLoading || billsLoading || goalsLoading,
    // Summary
    summary: {
      totalIncome,
      totalExpenses,
      totalBills,
      paidBills,
      unpaidBills,
      netCashFlow,
      totalSavingsTarget,
      totalSaved,
      availableToInvest: Math.max(0, netCashFlow),
    },
    // Actions
    addEntry,
    updateEntry,
    deleteEntry,
    addBill,
    updateBill,
    toggleBillPaid,
    deleteBill,
    addSavingsGoal,
    updateSavingsGoal,
    updateSavingsGoalFull,
    deleteSavingsGoal,
  };
}
