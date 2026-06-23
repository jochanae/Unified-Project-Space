import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Subscriber {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: 'active' | 'cold' | 'unsubscribed';
  tags: string[];
  source: string;
  engagementScore: number;
  lastEngagedAt: string | null;
  subscribedAt: string;
  projectId: string | null;
}

interface SubscriberRow {
  id: string;
  org_id: string;
  project_id: string | null;
  email: string;
  first_name: string | null;
  last_name: string | null;
  status: string;
  tags: string[];
  source: string;
  engagement_score: number;
  last_engaged_at: string | null;
  subscribed_at: string;
  unsubscribed_at: string | null;
  created_at: string;
  updated_at: string;
}

function toLocal(row: SubscriberRow): Subscriber {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status as Subscriber['status'],
    tags: row.tags || [],
    source: row.source,
    engagementScore: row.engagement_score,
    lastEngagedAt: row.last_engaged_at,
    subscribedAt: row.subscribed_at,
    projectId: row.project_id,
  };
}

export function useSubscribers(orgId?: string, projectId?: string | null) {
  const qc = useQueryClient();
  const key = ['subscribers', orgId, projectId];

  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!orgId,
    queryFn: async () => {
      let query = supabase
        .from('subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as SubscriberRow[]).map(toLocal);
    },
  });

  const addSubscriber = useMutation({
    mutationFn: async (sub: { email: string; firstName?: string; lastName?: string; source?: string; projectId?: string; tags?: string[] }) => {
      if (!orgId) throw new Error('Missing org');
      const { error } = await supabase.from('subscribers').upsert({
        org_id: orgId,
        email: sub.email,
        first_name: sub.firstName || null,
        last_name: sub.lastName || null,
        source: sub.source || 'manual',
        project_id: sub.projectId || null,
        tags: sub.tags || [],
      }, { onConflict: 'org_id,email' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const updateSubscriber = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; tags?: string[]; engagementScore?: number }) => {
      const dbUpdates: {
        status?: string;
        unsubscribed_at?: string;
        tags?: string[];
        engagement_score?: number;
        updated_at: string;
      } = { updated_at: new Date().toISOString() };
      if (updates.status) {
        dbUpdates.status = updates.status;
        if (updates.status === 'unsubscribed') dbUpdates.unsubscribed_at = new Date().toISOString();
      }
      if (updates.tags) dbUpdates.tags = updates.tags;
      if (updates.engagementScore !== undefined) dbUpdates.engagement_score = updates.engagementScore;

      const { error } = await supabase.from('subscribers').update(dbUpdates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const deleteSubscriber = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscribers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  // Computed stats
  const stats = {
    total: subscribers.length,
    active: subscribers.filter(s => s.status === 'active').length,
    cold: subscribers.filter(s => s.status === 'cold').length,
    unsubscribed: subscribers.filter(s => s.status === 'unsubscribed').length,
    avgEngagement: subscribers.length > 0
      ? Math.round(subscribers.reduce((sum, s) => sum + s.engagementScore, 0) / subscribers.length)
      : 0,
  };

  return { subscribers, isLoading, stats, addSubscriber, updateSubscriber, deleteSubscriber };
}
