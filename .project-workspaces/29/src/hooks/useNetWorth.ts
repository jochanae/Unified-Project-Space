import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { addMonths, addDays } from 'date-fns';

export interface NetWorthItem {
  id: string;
  user_id: string;
  type: 'asset' | 'liability';
  category: string;
  name: string;
  amount: number;
  notes: string | null;
  is_auto_synced: boolean;
  last_updated_at: string;
  review_frequency: string | null;
  next_review_at: string | null;
  created_at: string;
  updated_at: string;
}

export type NewNetWorthItem = Pick<NetWorthItem, 'type' | 'category' | 'name' | 'amount' | 'notes' | 'review_frequency'>;

export const ASSET_CATEGORIES = [
  { value: 'cash_savings', label: 'Cash & Savings', emoji: '💰' },
  { value: 'investments', label: 'Investments', emoji: '📈' },
  { value: 'retirement', label: 'Retirement (401k/IRA)', emoji: '🏦' },
  { value: 'real_estate', label: 'Real Estate', emoji: '🏠' },
  { value: 'insurance_cv', label: 'Insurance Cash Value', emoji: '🛡️' },
  { value: 'vehicles', label: 'Vehicles', emoji: '🚗' },
  { value: 'other_asset', label: 'Other', emoji: '📦' },
] as const;

export const LIABILITY_CATEGORIES = [
  { value: 'mortgage', label: 'Mortgage', emoji: '🏠' },
  { value: 'student_loans', label: 'Student Loans', emoji: '🎓' },
  { value: 'auto_loans', label: 'Auto Loans', emoji: '🚗' },
  { value: 'credit_cards', label: 'Credit Cards', emoji: '💳' },
  { value: 'personal_loans', label: 'Personal Loans', emoji: '📝' },
  { value: 'other_debt', label: 'Other Debt', emoji: '📋' },
] as const;

export const REVIEW_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Every 3 months' },
  { value: 'semi_annual', label: 'Every 6 months' },
  { value: 'annual', label: 'Annually' },
] as const;

function getNextReviewDate(frequency: string): string {
  const now = new Date();
  switch (frequency) {
    case 'monthly': return addMonths(now, 1).toISOString();
    case 'quarterly': return addMonths(now, 3).toISOString();
    case 'semi_annual': return addMonths(now, 6).toISOString();
    case 'annual': return addMonths(now, 12).toISOString();
    default: return addMonths(now, 3).toISOString();
  }
}

export function useNetWorth(autoSyncedSavings: number = 0) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['net-worth-items', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('net_worth_items')
        .select('*')
        .order('type', { ascending: true })
        .order('category', { ascending: true });
      if (error) throw error;
      return (data || []) as NetWorthItem[];
    },
    enabled: !!user?.id,
  });

  const addItem = useMutation({
    mutationFn: async (item: NewNetWorthItem) => {
      const nextReview = item.review_frequency ? getNextReviewDate(item.review_frequency) : null;
      const { error } = await supabase
        .from('net_worth_items')
        .insert({
          ...item,
          user_id: user!.id,
          next_review_at: nextReview,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['net-worth-items'] });
      toast.success('Item added to net worth!');
    },
    onError: () => toast.error('Failed to add item'),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, amount, name, notes, category, review_frequency }: { id: string; amount: number; name?: string; notes?: string; category?: string; review_frequency?: string }) => {
      const updateData: Record<string, unknown> = {
        amount,
        last_updated_at: new Date().toISOString(),
      };
      if (name !== undefined) updateData.name = name;
      if (notes !== undefined) updateData.notes = notes;
      if (category !== undefined) updateData.category = category;
      if (review_frequency !== undefined) {
        updateData.review_frequency = review_frequency;
        updateData.next_review_at = getNextReviewDate(review_frequency);
      }

      const { error } = await supabase
        .from('net_worth_items')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['net-worth-items'] });
      toast.success('Item updated!');
    },
    onError: () => toast.error('Failed to update item'),
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('net_worth_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['net-worth-items'] });
      toast.success('Item removed');
    },
    onError: () => toast.error('Failed to remove item'),
  });

  const updateReviewFrequency = useMutation({
    mutationFn: async ({ id, frequency }: { id: string; frequency: string }) => {
      const { error } = await supabase
        .from('net_worth_items')
        .update({
          review_frequency: frequency,
          next_review_at: getNextReviewDate(frequency),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['net-worth-items'] });
      toast.success('Review schedule updated');
    },
    onError: () => toast.error('Failed to update schedule'),
  });

  // Computed
  const manualAssets = items.filter(i => i.type === 'asset' && !i.is_auto_synced);
  const manualLiabilities = items.filter(i => i.type === 'liability');
  const totalManualAssets = manualAssets.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalLiabilities = manualLiabilities.reduce((sum, i) => sum + Number(i.amount), 0);
  const totalAssets = totalManualAssets + autoSyncedSavings;
  const netWorth = totalAssets - totalLiabilities;

  // Items due for review
  const itemsDueForReview = items.filter(i => {
    if (!i.next_review_at) return false;
    return new Date(i.next_review_at) <= new Date();
  });

  return {
    items,
    manualAssets,
    manualLiabilities,
    isLoading,
    summary: {
      totalAssets,
      totalManualAssets,
      autoSyncedSavings,
      totalLiabilities,
      netWorth,
    },
    itemsDueForReview,
    addItem,
    updateItem,
    deleteItem,
    updateReviewFrequency,
  };
}
