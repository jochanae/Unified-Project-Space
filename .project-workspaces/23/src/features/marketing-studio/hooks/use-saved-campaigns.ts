import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import type { StrategistPlan } from '../components/StrategistDialog';

export interface CampaignMetrics {
  views: number;
  leads: number;
  cvr: number;
}

export type PerformanceTier = 'elite' | 'high' | 'standard';

export interface SavedCampaignRow {
  id: string;
  org_id: string;
  project_id: string | null;
  created_by: string | null;
  name: string;
  rationale: string | null;
  plan: StrategistPlan;
  is_winner: boolean;
  auto_winner: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  metrics: CampaignMetrics;
  linked_page_ids: string[];
  linked_asset_ids: string[];
  deployed_at: string | null;
  metrics_updated_at: string | null;
  performance_tier: PerformanceTier;
}

/** MarQ's campaign memory — saved Strategist plans + real-world telemetry. */
export function useSavedCampaigns(projectId?: string | null) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const orgId = user?.orgId;

  const list = useQuery({
    queryKey: ['saved-campaigns', orgId, projectId ?? null],
    queryFn: async () => {
      if (!orgId) return [] as SavedCampaignRow[];
      let q = supabase
        .from('saved_campaigns')
        .select('*')
        .eq('org_id', orgId)
        .order('is_winner', { ascending: false })
        .order('created_at', { ascending: false });
      if (projectId) q = q.eq('project_id', projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as SavedCampaignRow[];
    },
    enabled: !!orgId,
  });

  const save = useMutation({
    mutationFn: async (input: {
      plan: StrategistPlan;
      projectId?: string | null;
      notes?: string;
      linkedPageIds?: string[];
    }) => {
      if (!orgId) throw new Error('No org');
      const { data, error } = await supabase
        .from('saved_campaigns')
        .insert({
          org_id: orgId,
          project_id: input.projectId ?? null,
          created_by: user?.id ?? null,
          name: input.plan.campaign_name || 'Untitled Campaign',
          rationale: input.plan.strategic_rationale ?? null,
          plan: input.plan as never,
          notes: input.notes ?? null,
          linked_page_ids: input.linkedPageIds ?? [],
          deployed_at: input.linkedPageIds?.length ? new Date().toISOString() : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as SavedCampaignRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-campaigns', orgId] }),
  });

  const toggleWinner = useMutation({
    mutationFn: async (input: { id: string; is_winner: boolean }) => {
      const { error } = await supabase
        .from('saved_campaigns')
        .update({ is_winner: input.is_winner })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-campaigns', orgId] }),
  });

  const linkPages = useMutation({
    mutationFn: async (input: { id: string; pageIds: string[] }) => {
      const { error } = await supabase
        .from('saved_campaigns')
        .update({
          linked_page_ids: input.pageIds,
          deployed_at: input.pageIds.length ? new Date().toISOString() : null,
        })
        .eq('id', input.id);
      if (error) throw error;
      // Recalc immediately so metrics reflect latest links
      await supabase.rpc('recalc_campaign_metrics', { _campaign_id: input.id });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-campaigns', orgId] }),
  });

  const recalc = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('recalc_campaign_metrics', { _campaign_id: id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-campaigns', orgId] }),
  });

  const recalcAll = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('No org');
      const { error } = await supabase.rpc('recalc_org_campaign_metrics', { _org_id: orgId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-campaigns', orgId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('saved_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-campaigns', orgId] }),
  });

  return {
    campaigns: list.data ?? [],
    isLoading: list.isLoading,
    save,
    toggleWinner,
    linkPages,
    recalc,
    recalcAll,
    remove,
  };
}
