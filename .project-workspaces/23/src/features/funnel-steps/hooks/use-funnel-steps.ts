import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFunnelSteps,
  createFunnelStep,
  updateFunnelStep as updateStepApi,
  deleteFunnelStep,
  reorderFunnelSteps,
} from '@/services/supabase-data';

export function useFunnelSteps(projectId: string | null, orgId: string | undefined) {
  const qc = useQueryClient();

  const { data: steps = [], isLoading } = useQuery({
    queryKey: ['funnel_steps', projectId],
    queryFn: () => fetchFunnelSteps(projectId!),
    enabled: !!projectId,
  });

  const addStep = useMutation({
    mutationFn: ({ title, stepType }: { title: string; stepType?: string }) =>
      createFunnelStep(orgId!, projectId!, title, stepType || 'page', steps.length + 1),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['funnel_steps', projectId] }),
  });

  const updateStep = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { title?: string; step_type?: string; order_index?: number } }) =>
      updateStepApi(id, updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['funnel_steps', projectId] }),
  });

  const removeStep = useMutation({
    mutationFn: (id: string) => deleteFunnelStep(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['funnel_steps', projectId] }),
  });

  const reorder = useMutation({
    mutationFn: (stepIds: string[]) => reorderFunnelSteps(stepIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['funnel_steps', projectId] }),
  });

  return { steps, isLoading, addStep, updateStep, removeStep, reorder };
}
