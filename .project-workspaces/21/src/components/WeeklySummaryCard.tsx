import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface WeeklySummaryCardProps {
  userId: string;
}

export default function WeeklySummaryCard({ userId }: WeeklySummaryCardProps) {
  const { data } = useQuery({
    queryKey: ['weekly-plan-summary', userId],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: plans } = await supabase
        .from('companion_plans')
        .select('status')
        .eq('user_id', userId)
        .gte('updated_at', sevenDaysAgo.toISOString())
        .in('status', ['completed', 'active', 'missed']);

      if (!plans || plans.length === 0) return null;

      const completed = plans.filter((p) => p.status === 'completed').length;
      const total = plans.length;
      return { completed, total };
    },
    enabled: !!userId,
    staleTime: 60_000 * 10,
  });

  if (!data || data.total === 0) return null;

  const rate = data.completed / data.total;
  const encouragement =
    rate === 0
      ? 'Pick one to start with today 💛'
      : rate >= 0.8
        ? "You're on a roll 🔥"
        : rate < 0.5
          ? 'Every step counts 💛'
          : null;

  return (
    <div className="relative w-full rounded-2xl px-4 py-3 mb-2 bg-white/5 backdrop-blur-sm border-[0.5px] border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_0_1px_rgba(212,175,80,0.25),0_0_12px_rgba(212,175,80,0.08)] text-left overflow-hidden">
      <p className="text-[11px] font-medium tracking-wide uppercase text-white/60 mb-1" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.6)' }}>
        📊 This week
      </p>
      <p className="text-sm text-white/80 leading-relaxed">
        You completed {data.completed} of {data.total} plan{data.total !== 1 ? 's' : ''}
      </p>
      {encouragement && (
        <p className="text-xs text-white/50 mt-1">{encouragement}</p>
      )}
    </div>
  );
}
