import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardUniversalStats {
  planTotal: number;
  planCompleted: number;
  lessonsCompleted: number;
  isLoading: boolean;
}

export function useDashboardStats(): DashboardUniversalStats {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-universal-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { planTotal: 0, planCompleted: 0, lessonsCompleted: 0 };

      const [planItemsResult, lessonsResult] = await Promise.all([
        supabase
          .from('plan_items')
          .select('status')
          .eq('user_id', user.id)
          .neq('status', 'archived'),
        supabase
          .from('user_lesson_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('completed', true),
      ]);

      const planItems = planItemsResult.data || [];
      const planTotal = planItems.length;
      const planCompleted = planItems.filter(i => i.status === 'completed').length;
      const lessonsCompleted = lessonsResult.count || 0;

      return { planTotal, planCompleted, lessonsCompleted };
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  return {
    planTotal: data?.planTotal ?? 0,
    planCompleted: data?.planCompleted ?? 0,
    lessonsCompleted: data?.lessonsCompleted ?? 0,
    isLoading,
  };
}
