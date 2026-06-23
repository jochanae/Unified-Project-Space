import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';

export type ScheduleKind = 'delay' | 'calendar';
export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface CampaignStepRow {
  id: string;
  sequence_id: string;
  org_id: string;
  position: number;
  title: string;
  format: string;
  asset_id: string | null;
  asset_url: string | null;
  schedule_kind: ScheduleKind;
  delay_days: number | null;
  calendar_day: Weekday | null;
  calendar_time: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignSequenceRow {
  id: string;
  org_id: string;
  project_id: string | null;
  created_by: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const DEFAULT_NAME = 'My Campaign';

export function useCampaignSequence(projectId?: string | null) {
  const qc = useQueryClient();
  const { user } = useCurrentUser();
  const orgId = user?.orgId;
  const userId = user?.id;

  const sequenceQuery = useQuery({
    queryKey: ['campaign-sequence', orgId, projectId ?? 'all'],
    enabled: !!orgId && !!userId,
    queryFn: async (): Promise<{ sequence: CampaignSequenceRow; steps: CampaignStepRow[] }> => {
      // Find or create a default sequence per (org, project).
      let q = supabase
        .from('campaign_sequences')
        .select('*')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: true })
        .limit(1);
      if (projectId) q = q.eq('project_id', projectId);
      else q = q.is('project_id', null);

      const { data: existing, error } = await q;
      if (error) throw error;

      let sequence = existing?.[0] as CampaignSequenceRow | undefined;
      if (!sequence) {
        const { data: created, error: insErr } = await supabase
          .from('campaign_sequences')
          .insert({
            org_id: orgId!,
            project_id: projectId ?? null,
            created_by: userId!,
            name: DEFAULT_NAME,
          } as never)
          .select('*')
          .single();
        if (insErr) throw insErr;
        sequence = created as unknown as CampaignSequenceRow;
      }

      const { data: steps, error: stepsErr } = await supabase
        .from('campaign_sequence_steps')
        .select('*')
        .eq('sequence_id', sequence.id)
        .order('position', { ascending: true });
      if (stepsErr) throw stepsErr;

      return { sequence, steps: (steps ?? []) as unknown as CampaignStepRow[] };
    },
  });

  const sequence = sequenceQuery.data?.sequence;
  const steps = sequenceQuery.data?.steps ?? [];

  const invalidate = () => qc.invalidateQueries({ queryKey: ['campaign-sequence', orgId, projectId ?? 'all'] });

  const addStep = useMutation({
    mutationFn: async (input?: Partial<Omit<CampaignStepRow, 'id' | 'org_id' | 'sequence_id' | 'created_at' | 'updated_at'>>) => {
      if (!sequence || !orgId) throw new Error('Sequence not ready');
      const position = steps.length;
      const row = {
        sequence_id: sequence.id,
        org_id: orgId,
        position,
        title: input?.title ?? `Step ${position + 1}`,
        format: input?.format ?? 'flyer',
        asset_id: input?.asset_id ?? null,
        asset_url: input?.asset_url ?? null,
        schedule_kind: input?.schedule_kind ?? 'delay',
        delay_days: input?.schedule_kind === 'calendar' ? null : (input?.delay_days ?? (position === 0 ? 0 : 3)),
        calendar_day: input?.schedule_kind === 'calendar' ? (input?.calendar_day ?? 'Mon') : null,
        calendar_time: input?.schedule_kind === 'calendar' ? (input?.calendar_time ?? '09:00') : null,
      };
      const { error } = await supabase.from('campaign_sequence_steps').insert(row as never);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const updateStep = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CampaignStepRow> }) => {
      const { error } = await supabase
        .from('campaign_sequence_steps')
        .update(patch as never)
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, patch }) => {
      // optimistic
      await qc.cancelQueries({ queryKey: ['campaign-sequence', orgId, projectId ?? 'all'] });
      const prev = qc.getQueryData<{ sequence: CampaignSequenceRow; steps: CampaignStepRow[] }>([
        'campaign-sequence', orgId, projectId ?? 'all',
      ]);
      if (prev) {
        qc.setQueryData(['campaign-sequence', orgId, projectId ?? 'all'], {
          ...prev,
          steps: prev.steps.map(s => (s.id === id ? { ...s, ...patch } : s)),
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['campaign-sequence', orgId, projectId ?? 'all'], ctx.prev);
    },
    onSettled: invalidate,
  });

  const removeStep = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaign_sequence_steps').delete().eq('id', id);
      if (error) throw error;
      // Resequence positions
      const remaining = steps.filter(s => s.id !== id);
      await Promise.all(
        remaining.map((s, i) =>
          s.position !== i
            ? supabase.from('campaign_sequence_steps').update({ position: i } as never).eq('id', s.id)
            : Promise.resolve(),
        ),
      );
    },
    onSuccess: invalidate,
  });

  const moveStep = useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: 'up' | 'down' }) => {
      const idx = steps.findIndex(s => s.id === id);
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (idx < 0 || target < 0 || target >= steps.length) return;
      const a = steps[idx];
      const b = steps[target];
      await Promise.all([
        supabase.from('campaign_sequence_steps').update({ position: b.position } as never).eq('id', a.id),
        supabase.from('campaign_sequence_steps').update({ position: a.position } as never).eq('id', b.id),
      ]);
    },
    onSuccess: invalidate,
  });

  return {
    sequence,
    steps,
    isLoading: sequenceQuery.isLoading,
    error: sequenceQuery.error,
    addStep,
    updateStep,
    removeStep,
    moveStep,
  };
}
