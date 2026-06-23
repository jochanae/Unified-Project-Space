// PERF: 2026-03-15 — Narrowed select() columns — reduces payload size per fetch
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCallback } from 'react';

const PLANS_SELECT = 'id, user_id, member_id, companion_name, title, description, category, emoji, schedule, status, source, created_at, updated_at, plan_type, steps, companion_note, playbook_theme, stage, completed_at, checked_steps, checklist_reset, goal_id, is_rhythm, rhythm_completed_today, rhythm_last_completed, missed_at';

export interface CompanionPlan {
  id: string;
  memberId: string;
  companionName: string;
  title: string;
  description: string | null;
  category: string;
  emoji: string;
  schedule: Record<string, any>;
  status: string;
  createdAt: string;
  updatedAt: string;
  planType: 'reminder' | 'guidance';
  steps: string[];
  companionNote: string | null;
  playbookTheme: string | null;
  stage: 'active' | 'upcoming' | 'someday' | 'completed';
  source?: string;
  completedAt: string | null;
  checkedSteps: number[];
  checklistReset: 'daily' | 'weekly' | null;
  goalId: string | null;
  isRhythm?: boolean;
  rhythmCompletedToday?: boolean;
  rhythmLastCompleted?: string | null;
}

function isWithinCurrentWeek(dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay(); // 0 = Sunday
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek); // Sunday
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7); // Next Sunday
  return date >= weekStart && date < weekEnd;
}

function mapPlan(p: any): CompanionPlan {
  const today = new Date().toISOString().slice(0, 10);
  const lastCompleted = p.rhythm_last_completed ? String(p.rhythm_last_completed).slice(0, 10) : null;
  const schedule = p.schedule || {};
  const frequency = (schedule.frequency || '').toLowerCase();

  // Frequency-aware rhythm completion check
  let rhythmDone = false;
  if (p.is_rhythm && lastCompleted) {
    if (frequency === 'weekly') {
      rhythmDone = isWithinCurrentWeek(lastCompleted);
    } else {
      // Default: daily
      rhythmDone = lastCompleted === today;
    }
  }
  // Also respect the DB boolean as a fallback
  if (p.is_rhythm && p.rhythm_completed_today) {
    rhythmDone = true;
  }

  return {
    id: p.id,
    memberId: p.member_id,
    companionName: p.companion_name,
    title: p.title,
    description: p.description,
    category: p.category,
    emoji: p.emoji,
    schedule,
    status: p.status,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    planType: p.plan_type || 'reminder',
    steps: Array.isArray(p.steps) ? p.steps : [],
    companionNote: p.companion_note || null,
    playbookTheme: p.playbook_theme || null,
    stage: (p.stage || 'active') as CompanionPlan['stage'],
    source: p.source ?? 'chat',
    completedAt: p.completed_at || null,
    checkedSteps: Array.isArray(p.checked_steps) ? p.checked_steps : [],
    checklistReset: p.checklist_reset || null,
    goalId: p.goal_id || null,
    isRhythm: !!p.is_rhythm,
    rhythmCompletedToday: rhythmDone,
    rhythmLastCompleted: lastCompleted,
  };
}

async function fetchPlans(userId: string): Promise<CompanionPlan[]> {
  const { data, error } = await supabase
    .from('companion_plans' as any)
    .select(PLANS_SELECT)
    .eq('user_id', userId)
    .in('status', ['suggested', 'active'])
    .order('created_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];
  // Filter out plans that have completed_at but status wasn't updated (data integrity safeguard)
  return (data as any[]).filter(p => !p.completed_at).map(mapPlan);
}

async function fetchCompletedPlans(userId: string): Promise<CompanionPlan[]> {
  const { data, error } = await supabase
    .from('companion_plans' as any)
    .select(PLANS_SELECT)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return (data as any[]).map(mapPlan);
}

export function useCompanionPlans(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['companion-plans', userId],
    queryFn: () => fetchPlans(userId!),
    enabled: !!userId,
    staleTime: 0,
    refetchInterval: 120_000,
  });

  const completedQuery = useQuery({
    queryKey: ['companion-plans-completed', userId],
    queryFn: () => fetchCompletedPlans(userId!),
    enabled: !!userId,
    staleTime: 30_000,
  });

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['companion-plans', userId] });
    queryClient.invalidateQueries({ queryKey: ['companion-plans-completed', userId] });
  }, [userId, queryClient]);

  const completePlan = useCallback(async (planId: string) => {
    if (!userId) return;
    await (supabase.from('companion_plans' as any) as any)
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', planId)
      .eq('user_id', userId);
    invalidateAll();
  }, [userId, invalidateAll]);

  const dismissPlan = useCallback(async (planId: string) => {
    if (!userId) return;
    await (supabase.from('companion_plans' as any) as any)
      .update({ status: 'dismissed' })
      .eq('id', planId)
      .eq('user_id', userId);
    invalidateAll();
  }, [userId, invalidateAll]);

  const acceptPlan = useCallback(async (planId: string) => {
    if (!userId) return;
    await (supabase.from('companion_plans' as any) as any)
      .update({ status: 'active' })
      .eq('id', planId)
      .eq('user_id', userId);
    invalidateAll();
  }, [userId, invalidateAll]);

  const reactivatePlan = useCallback(async (planId: string) => {
    if (!userId) return;
    await (supabase.from('companion_plans' as any) as any)
      .update({ status: 'active', completed_at: null })
      .eq('id', planId)
      .eq('user_id', userId);
    invalidateAll();
  }, [userId, invalidateAll]);

  const updateStage = useCallback(async (planId: string, stage: string) => {
    if (!userId) return;
    await (supabase.from('companion_plans' as any) as any)
      .update({ stage })
      .eq('id', planId)
      .eq('user_id', userId);
    invalidateAll();
  }, [userId, invalidateAll]);

  const updatePlanTitle = useCallback(async (planId: string, title: string) => {
    if (!userId) return;
    await (supabase.from('companion_plans' as any) as any)
      .update({ title })
      .eq('id', planId)
      .eq('user_id', userId);
    invalidateAll();
  }, [userId, invalidateAll]);

  const updatePlanStep = useCallback(async (planId: string, stepIndex: number, newText: string, currentSteps: string[]) => {
    if (!userId) return;
    const updated = [...currentSteps];
    updated[stepIndex] = newText;
    await (supabase.from('companion_plans' as any) as any)
      .update({ steps: updated })
      .eq('id', planId)
      .eq('user_id', userId);
    invalidateAll();
  }, [userId, invalidateAll]);

  const createPlan = useCallback(
    async (params: {
      title: string;
      emoji?: string;
      category?: string;
      schedule?: Record<string, any>;
      description?: string;
      plan_type?: 'reminder' | 'guidance';
      steps?: string[];
      companion_note?: string | null;
      source?: string;
      member_id?: string;
      companion_name?: string;
      isRhythm?: boolean;
    }) => {
      if (!userId) return;
      const isGuidance = params.plan_type === 'guidance' || params.source === 'companion';
      await (supabase.from('companion_plans' as any) as any).insert({
        user_id: userId,
        title: params.title,
        emoji: params.emoji ?? '📋',
        category: params.category ?? 'general',
        schedule: params.schedule ?? {},
        description: params.description ?? null,
        plan_type: params.plan_type ?? (isGuidance ? 'guidance' : 'reminder'),
        steps: params.steps ?? [],
        companion_note: params.companion_note ?? null,
        source: params.source ?? 'user',
        status: 'active',
        companion_name: params.companion_name ?? 'You',
        member_id: params.member_id ?? 'user',
        is_rhythm: params.isRhythm ?? false,
      });
      invalidateAll();
    },
    [userId, invalidateAll]
  );

  const completeRhythmForToday = useCallback(async (planId: string) => {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    await (supabase.from('companion_plans' as any) as any)
      .update({
        rhythm_completed_today: true,
        rhythm_last_completed: today,
      })
      .eq('id', planId)
      .eq('user_id', userId);
    invalidateAll();
  }, [userId, invalidateAll]);

  const toggleStep = useCallback(async (planId: string, stepIndex: number, currentChecked: number[]) => {
    if (!userId) return;
    const newChecked = currentChecked.includes(stepIndex)
      ? currentChecked.filter(i => i !== stepIndex)
      : [...currentChecked, stepIndex];
    
    // Optimistic update
    queryClient.setQueryData(['companion-plans', userId], (old: CompanionPlan[] | undefined) =>
      old?.map(p => p.id === planId ? { ...p, checkedSteps: newChecked } : p)
    );

    await (supabase.from('companion_plans' as any) as any)
      .update({ checked_steps: newChecked })
      .eq('id', planId)
      .eq('user_id', userId);
  }, [userId, queryClient]);

  return {
    ...query,
    completedPlans: completedQuery.data ?? [],
    completePlan,
    completeRhythmForToday,
    dismissPlan,
    acceptPlan,
    reactivatePlan,
    updateStage,
    updatePlanTitle,
    updatePlanStep,
    createPlan,
    toggleStep,
  };
}
