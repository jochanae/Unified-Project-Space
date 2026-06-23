import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EmailSequenceRow {
  id: string;
  project_id: string;
  org_id: string;
  subject: string | null;
  body: string;
  purpose: string;
  delay_days: number;
  trigger_stage: string;
  order_index: number;
  is_active: boolean;
  channel: 'email' | 'sms';
  behavior_trigger: string | null;
  behavior_threshold_hours: number | null;
  behavior_target_page_id: string | null;
  created_at: string;
  updated_at: string;
}

export type BehaviorTrigger =
  | 'viewed_no_convert'
  | 'no_email_engagement'
  | 'abandoned_checkout';

export type SequenceChannel = 'email' | 'sms';

export interface EmailSequence {
  id: string;
  subject: string;
  body: string;
  purpose: string;
  delayDays: number;
  triggerStage: string;
  orderIndex: number;
  isActive: boolean;
  channel?: SequenceChannel;
  behaviorTrigger?: BehaviorTrigger | null;
  behaviorThresholdHours?: number | null;
  behaviorTargetPageId?: string | null;
}

function toLocal(row: EmailSequenceRow): EmailSequence {
  return {
    id: row.id,
    subject: row.subject ?? '',
    body: row.body,
    purpose: row.purpose,
    delayDays: row.delay_days,
    triggerStage: row.trigger_stage,
    orderIndex: row.order_index,
    isActive: row.is_active ?? false,
    channel: (row.channel as SequenceChannel) ?? 'email',
    behaviorTrigger: (row.behavior_trigger as BehaviorTrigger | null) ?? null,
    behaviorThresholdHours: row.behavior_threshold_hours ?? null,
    behaviorTargetPageId: row.behavior_target_page_id ?? null,
  };
}

export function useEmailSequences(projectId: string | null, orgId?: string) {
  const qc = useQueryClient();
  const key = ['email-sequences', projectId];

  const { data: sequences = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!projectId && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_sequences')
        .select('*')
        .eq('project_id', projectId!)
        .order('order_index');
      if (error) throw error;
      return (data as unknown as EmailSequenceRow[]).map(toLocal);
    },
  });

  const saveAll = useMutation({
    mutationFn: async (emails: Omit<EmailSequence, 'id' | 'isActive'>[]) => {
      if (!projectId || !orgId) throw new Error('Missing project/org');
      // Delete existing then insert fresh
      await supabase.from('email_sequences').delete().eq('project_id', projectId);
      if (emails.length === 0) return;
      const rows = emails.map((e, i) => ({
        project_id: projectId,
        org_id: orgId,
        subject: e.subject,
        body: e.body,
        purpose: e.purpose,
        delay_days: e.delayDays,
        trigger_stage: e.triggerStage,
        order_index: i,
        channel: e.channel ?? 'email',
        behavior_trigger: e.behaviorTrigger ?? null,
        behavior_threshold_hours: e.behaviorThresholdHours ?? null,
        behavior_target_page_id: e.behaviorTargetPageId ?? null,
      }));
      const { error } = await supabase.from('email_sequences').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  /** Mark every sequence step in the project as active so new leads are routed through it. */
  const activate = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('Missing project');
      const { error } = await supabase
        .from('email_sequences')
        .update({ is_active: true })
        .eq('project_id', projectId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { sequences, isLoading, saveAll, activate };
}
