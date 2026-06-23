import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RiskProfile {
  stable: number;
  growth: number;
  active: number;
}

export interface QuinnContext {
  id?: string;
  user_id?: string;

  // The Basics
  preferred_name: string | null;
  primary_goal: string | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | null;

  // Financial Foundation
  emergency_fund_status: 'none' | 'building' | 'partial' | 'complete' | null;
  debt_situation: 'none' | 'low_interest' | 'high_interest' | 'mixed' | null;
  income_type: 'stable' | 'variable' | 'mixed' | null;

  // My Accounts
  brokerages: string[];
  account_types: string[];

  // Investment Approach
  risk_profile: RiskProfile;
  interested_assets: string[];

  // Learning Preferences
  communication_style: 'detailed' | 'concise' | 'balanced';
  learning_topics: string[];

  // Meta
  last_reviewed_at: string | null;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_CONTEXT: Omit<QuinnContext, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  preferred_name: null,
  primary_goal: null,
  experience_level: null,
  emergency_fund_status: null,
  debt_situation: null,
  income_type: null,
  brokerages: [],
  account_types: [],
  risk_profile: { stable: 0, growth: 0, active: 0 },
  interested_assets: [],
  communication_style: 'balanced',
  learning_topics: [],
  last_reviewed_at: null,
};

// ─────────────────────────────────────────────────────────────────────────────
// Parsing helper
// ─────────────────────────────────────────────────────────────────────────────

function parseRow(data: Record<string, unknown> | null, userId: string): QuinnContext {
  if (!data) {
    return { ...DEFAULT_CONTEXT, user_id: userId } as QuinnContext;
  }

  let riskProfile: RiskProfile = DEFAULT_CONTEXT.risk_profile;
  const rp = data.risk_profile as Record<string, unknown> | null;
  if (rp && typeof rp === 'object' && !Array.isArray(rp)) {
    riskProfile = {
      stable: typeof rp.stable === 'number' ? rp.stable : 0,
      growth: typeof rp.growth === 'number' ? rp.growth : 0,
      active: typeof rp.active === 'number' ? rp.active : 0,
    };
  }

  const asStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? (v as string[]).filter((x) => typeof x === 'string') : [];

  const pickEnum = <T extends string>(v: unknown, allowed: T[]): T | null =>
    typeof v === 'string' && allowed.includes(v as T) ? (v as T) : null;

  return {
    id: data.id as string | undefined,
    user_id: (data.user_id as string) ?? userId,

    preferred_name: (data.preferred_name as string) ?? null,
    primary_goal: (data.primary_goal as string) ?? null,
    experience_level: pickEnum(data.experience_level, ['beginner', 'intermediate', 'advanced']),

    emergency_fund_status: pickEnum(data.emergency_fund_status, ['none', 'building', 'partial', 'complete']),
    debt_situation: pickEnum(data.debt_situation, ['none', 'low_interest', 'high_interest', 'mixed']),
    income_type: pickEnum(data.income_type, ['stable', 'variable', 'mixed']),

    brokerages: asStringArray(data.brokerages ?? data.brokerage_names),
    account_types: asStringArray(data.account_types),

    risk_profile: riskProfile,
    interested_assets: asStringArray(data.interested_assets),

    communication_style: pickEnum(data.communication_style, ['detailed', 'concise', 'balanced']) ?? 'balanced',
    learning_topics: asStringArray(data.learning_topics),

    last_reviewed_at: (data.last_reviewed_at as string) ?? null,
    created_at: data.created_at as string | undefined,
    updated_at: data.updated_at as string | undefined,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useQuinnContext() {
  const { user } = useAuth();
  const [context, setContext] = useState<QuinnContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // ───────────────────────────────────────────────────────────────────────────
  // Fetch
  // ───────────────────────────────────────────────────────────────────────────

  const fetchContext = useCallback(async () => {
    if (!user?.id) {
      setContext(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_quinn_context')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      setContext(parseRow(data as Record<string, unknown> | null, user.id));
    } catch (err) {
      console.error('Error fetching Quinn context:', err);
      toast.error('Could not load your Quinn profile');
      setContext({ ...DEFAULT_CONTEXT, user_id: user.id } as QuinnContext);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  // ───────────────────────────────────────────────────────────────────────────
  // Save (upsert)
  // ───────────────────────────────────────────────────────────────────────────

  const updateContext = useCallback(
    async (updates: Partial<QuinnContext>): Promise<boolean> => {
      if (!user?.id) {
        toast.error('Please sign in to save your profile');
        return false;
      }

      setIsSaving(true);

      // Remove undefined values and internal fields that shouldn't be written
      const payload: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && key !== 'id' && key !== 'created_at') {
          payload[key] = value;
        }
      }
      payload.user_id = user.id;
      payload.updated_at = new Date().toISOString();

      try {
        const { data, error } = await supabase
          .from('user_quinn_context')
          .upsert(payload as any, { onConflict: 'user_id' })
          .select('*')
          .single();

        if (error) throw error;

        setContext(parseRow(data as unknown as Record<string, unknown>, user.id));
        toast.success('Profile saved');
        return true;
      } catch (err) {
        console.error('Error saving Quinn context:', err);
        toast.error('Failed to save profile');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [user?.id],
  );

  // ───────────────────────────────────────────────────────────────────────────
  // Helpers
  // ───────────────────────────────────────────────────────────────────────────

  const markAsReviewed = useCallback(
    () => updateContext({ last_reviewed_at: new Date().toISOString() }),
    [updateContext],
  );

  const getProfileCompleteness = useCallback((ctx: QuinnContext | null | undefined = context): number => {
    if (!ctx) return 0;
    const isNonEmpty = (v: unknown) => typeof v === 'string' && v.trim().length > 0;
    const coreFields = [isNonEmpty(ctx.preferred_name), isNonEmpty(ctx.primary_goal), !!ctx.experience_level];
    return Math.round((coreFields.filter(Boolean).length / coreFields.length) * 100);
  }, [context]);

  const getDetailsCompleteness = useCallback((ctx: QuinnContext | null | undefined = context): number => {
    if (!ctx) return 0;
    const details = [
      !!ctx.emergency_fund_status,
      !!ctx.debt_situation,
      !!ctx.income_type,
      ctx.brokerages.length > 0,
      ctx.account_types.length > 0,
      ctx.risk_profile.stable > 0 || ctx.risk_profile.growth > 0 || ctx.risk_profile.active > 0,
      ctx.interested_assets.length > 0,
      !!ctx.communication_style,
      ctx.learning_topics.length > 0,
    ];
    return Math.round((details.filter(Boolean).length / details.length) * 100);
  }, [context]);

  const needsReview = useCallback((): boolean => {
    if (!context?.last_reviewed_at) return true;
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    return new Date(context.last_reviewed_at) < threeMonthsAgo;
  }, [context]);

  return {
    context,
    isLoading,
    isSaving,
    updateContext,
    markAsReviewed,
    getProfileCompleteness,
    getDetailsCompleteness,
    needsReview,
    refetch: fetchContext,
  };
}
