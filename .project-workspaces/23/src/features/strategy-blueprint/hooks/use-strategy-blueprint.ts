import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { BlueprintData } from '../types';

export function useStrategyBlueprint(projectId: string) {
  const { user } = useCurrentUser();

  const { data: blueprint = null, isLoading } = useQuery({
    queryKey: ['strategy-blueprint', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await supabase
        .from('project_context')
        .select('directive, created_at')
        .eq('project_id', projectId)
        .eq('context_type', 'strategy_blueprint')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      try {
        return JSON.parse(data.directive) as BlueprintData;
      } catch {
        return null;
      }
    },
    enabled: !!projectId,
  });

  const saveBlueprint = useCallback(
    async (data: BlueprintData) => {
      if (!projectId) throw new Error('Missing projectId');
      if (!user?.orgId) throw new Error('Missing user org');

      await supabase
        .from('project_context')
        .delete()
        .eq('project_id', projectId)
        .eq('org_id', user.orgId)
        .eq('context_type', 'strategy_blueprint');

      const { error } = await supabase.from('project_context').insert({
        project_id: projectId,
        org_id: user.orgId,
        context_type: 'strategy_blueprint',
        directive: JSON.stringify(data),
      });

      if (error) throw error;
    },
    [projectId, user?.orgId],
  );

  const clearBlueprint = useCallback(async () => {
    if (!projectId) throw new Error('Missing projectId');
    if (!user?.orgId) throw new Error('Missing user org');

    const { error } = await supabase
      .from('project_context')
      .delete()
      .eq('project_id', projectId)
      .eq('org_id', user.orgId)
      .eq('context_type', 'strategy_blueprint');

    if (error) throw error;
  }, [projectId, user?.orgId]);

  return { blueprint, isLoading, saveBlueprint, clearBlueprint };
}
