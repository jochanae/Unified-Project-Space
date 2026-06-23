import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { loadMemory } from '@/lib/memory';

export interface DepthSignals {
  streakDays: number;
  memoryCount: number;
  milestonesAchieved: number;
  totalMilestones: number;
  loading: boolean;
}

const MILESTONE_TYPES = ['first_message', '7_day_streak', '30_day_streak', 'vulnerable_share', 'crisis_followup'];

async function fetchDepthSignals(userId: string, memberId: string): Promise<Omit<DepthSignals, 'loading'>> {
  const [streakResult, milestonesResult] = await Promise.all([
    supabase
      .from('chat_messages')
      .select('created_at')
      .eq('user_id', userId)
      .eq('member_id', memberId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('companion_milestones')
      .select('milestone_type')
      .eq('user_id', userId)
      .eq('member_id', memberId),
  ]);

  let streakDays = 0;
  if (streakResult.data && streakResult.data.length > 0) {
    const uniqueDays = [...new Set(
      streakResult.data.map((m) => new Date(m.created_at).toISOString().slice(0, 10))
    )].sort().reverse();

    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (uniqueDays[0] === today || uniqueDays[0] === yesterday) {
      streakDays = 1;
      for (let i = 1; i < uniqueDays.length; i++) {
        const prev = new Date(uniqueDays[i - 1]);
        const curr = new Date(uniqueDays[i]);
        const diff = (prev.getTime() - curr.getTime()) / 86400000;
        if (diff <= 1.5) streakDays++;
        else break;
      }
    }
  }

  const memory = loadMemory();

  return {
    streakDays,
    memoryCount: memory.entries.length,
    milestonesAchieved: milestonesResult.data?.length || 0,
    totalMilestones: MILESTONE_TYPES.length,
  };
}

export function useDepthSignals(userId: string | null, memberId: string | undefined): DepthSignals {
  const { data, isLoading } = useQuery({
    queryKey: ['depth-signals', userId, memberId],
    queryFn: () => fetchDepthSignals(userId!, memberId!),
    enabled: !!userId && !!memberId,
    staleTime: 60_000,
  });

  return {
    streakDays: data?.streakDays ?? 0,
    memoryCount: data?.memoryCount ?? 0,
    milestonesAchieved: data?.milestonesAchieved ?? 0,
    totalMilestones: data?.totalMilestones ?? MILESTONE_TYPES.length,
    loading: isLoading,
  };
}
