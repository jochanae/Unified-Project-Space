import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SocialCampaign, SocialPlatform, GenerationMode } from '../types';
import { toast } from 'sonner';

export function useSocialCampaigns(projectId: string | null) {
  const qc = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['social-campaigns', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('social_campaigns')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SocialCampaign[];
    },
    enabled: !!projectId,
  });

  const generate = useMutation({
    mutationFn: async (vars: { platforms?: SocialPlatform[]; daysOfContent?: number; mode?: GenerationMode }) => {
      if (!projectId) throw new Error('No project selected');
      const { data, error } = await supabase.functions.invoke('quinn-social-translator', {
        body: {
          projectId,
          platforms: vars.platforms ?? ['instagram', 'linkedin', 'tiktok'],
          daysOfContent: vars.daysOfContent ?? 7,
          mode: vars.mode ?? 'deep_dive',
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { count: number; campaign_id: string; campaign_theme: string; mode: GenerationMode; posts: SocialCampaign[] };
    },
    onSuccess: (data) => {
      const label = data.mode === 'deep_dive' ? 'Deep Dive' : 'Campaign';
      toast.success(`${label} live: "${data.campaign_theme}" — ${data.count} posts across the arc.`);
      qc.invalidateQueries({ queryKey: ['social-campaigns', projectId] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Generation failed');
    },
  });

  const update = useCallback(
    async (id: string, patch: Partial<SocialCampaign>) => {
      const { error } = await supabase
        .from('social_campaigns')
        .update({ ...patch, refinement_count: ((patch.refinement_count ?? 0) + 1) })
        .eq('id', id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['social-campaigns', projectId] });
    },
    [projectId, qc],
  );

  const remove = useCallback(
    async (id: string) => {
      const { error } = await supabase.from('social_campaigns').delete().eq('id', id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ['social-campaigns', projectId] });
    },
    [projectId, qc],
  );

  /**
   * Optimistically reorder narrative_day for a Deep Dive campaign arc.
   * `dayMap` is a record of postId → newDay (1-indexed).
   * Posts on the same day stay grouped (cross-platform variants).
   */
  const reorderArc = useMutation({
    mutationFn: async (dayMap: Record<string, number>) => {
      const ids = Object.keys(dayMap);
      if (!ids.length) return;
      // Run updates in parallel; PostgREST handles them per-row.
      const results = await Promise.all(
        ids.map((id) =>
          supabase.from('social_campaigns').update({ narrative_day: dayMap[id] }).eq('id', id),
        ),
      );
      const firstErr = results.find((r) => r.error)?.error;
      if (firstErr) throw firstErr;
    },
    onMutate: async (dayMap) => {
      await qc.cancelQueries({ queryKey: ['social-campaigns', projectId] });
      const prev = qc.getQueryData<SocialCampaign[]>(['social-campaigns', projectId]);
      if (prev) {
        qc.setQueryData<SocialCampaign[]>(
          ['social-campaigns', projectId],
          prev.map((c) =>
            dayMap[c.id] != null ? { ...c, narrative_day: dayMap[c.id] } : c,
          ),
        );
      }
      return { prev };
    },
    onError: (err: Error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['social-campaigns', projectId], ctx.prev);
      toast.error(err.message || 'Reorder failed — restored previous arc.');
    },
    onSuccess: () => {
      toast.success('Arc reordered.');
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['social-campaigns', projectId] });
    },
  });

  return { campaigns, isLoading, generate, update, remove, reorderArc };
}
