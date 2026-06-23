import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProgressNote {
  text: string;
  date: string;
}

export interface WellnessGoal {
  id: string;
  title: string;
  description: string | null;
  status: 'active' | 'completed' | 'paused';
  progressNotes: ProgressNote[];
  createdAt: string;
  updatedAt: string;
}

const MAX_ACTIVE_GOALS = 3;

export function useGoals(userId: string | null) {
  const [goals, setGoals] = useState<WellnessGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('wellness_goals' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (data) {
        setGoals((data as any[]).map(r => ({
          id: r.id,
          title: r.title,
          description: r.description,
          status: r.status,
          progressNotes: (r.progress_notes || []) as ProgressNote[],
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        })));
      }
      setLoading(false);
    };
    load();
  }, [userId]);

  const activeGoals = goals.filter(g => g.status === 'active');
  const canAddGoal = activeGoals.length < MAX_ACTIVE_GOALS;

  const addGoal = useCallback(async (title: string, description?: string) => {
    if (!userId || !canAddGoal) return;
    const { data, error } = await supabase.from('wellness_goals' as any).insert({
      user_id: userId,
      title,
      description: description || null,
    } as any).select().single();

    if (data && !error) {
      const d = data as any;
      setGoals(prev => [{
        id: d.id, title: d.title, description: d.description, status: d.status,
        progressNotes: [], createdAt: d.created_at, updatedAt: d.updated_at,
      }, ...prev]);
    }
  }, [userId, canAddGoal]);

  const addProgressNote = useCallback(async (goalId: string, text: string) => {
    if (!userId) return;
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

    const newNotes = [...goal.progressNotes, { text, date: new Date().toISOString() }];
    const { error } = await supabase.from('wellness_goals' as any)
      .update({ progress_notes: newNotes as any } as any)
      .eq('id', goalId)
      .eq('user_id', userId);

    if (!error) {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, progressNotes: newNotes } : g));
    }
  }, [userId, goals]);

  const updateGoalStatus = useCallback(async (goalId: string, status: 'active' | 'completed' | 'paused') => {
    if (!userId) return;
    const { error } = await supabase.from('wellness_goals' as any)
      .update({ status } as any)
      .eq('id', goalId)
      .eq('user_id', userId);

    if (!error) {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status } : g));
    }
  }, [userId]);

  const deleteGoal = useCallback(async (goalId: string) => {
    if (!userId) return;
    const { error } = await supabase.from('wellness_goals' as any)
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);

    if (!error) {
      setGoals(prev => prev.filter(g => g.id !== goalId));
    }
  }, [userId]);

  /** Format active goals for companion memory / AI prompts */
  const getGoalsMemoryString = useCallback((): string => {
    if (activeGoals.length === 0) return '';
    const lines = activeGoals.map(g => {
      const latest = g.progressNotes.length > 0 ? g.progressNotes[g.progressNotes.length - 1].text : null;
      return `- ${g.title}${g.description ? ` (${g.description})` : ''}${latest ? ` — latest update: "${latest}"` : ''}`;
    });
    return `Active wellness goals:\n${lines.join('\n')}`;
  }, [activeGoals]);

  return {
    goals, activeGoals, loading, canAddGoal,
    addGoal, addProgressNote, updateGoalStatus, deleteGoal,
    getGoalsMemoryString, MAX_ACTIVE_GOALS,
  };
}
