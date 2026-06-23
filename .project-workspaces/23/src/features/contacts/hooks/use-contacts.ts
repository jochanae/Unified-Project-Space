import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';

export interface Contact {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  source_project_id: string | null;
  created_at: string | null;
  tags: string[];
  pipeline_stage: string;
  notes: string;
  score: number;
  org_id: string;
  country: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
}

const PIPELINE_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const;
export type PipelineStage = typeof PIPELINE_STAGES[number];
export { PIPELINE_STAGES };

export function useContacts(projectId: string | null) {
  const { user } = useCurrentUser();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchContacts = useCallback(async () => {
    if (!user?.orgId) return;
    setLoading(true);
    let query = supabase
      .from('contacts')
      .select('*')
      .eq('org_id', user.orgId)
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('source_project_id', projectId);
    }

    const { data } = await query;
    setContacts((data as Contact[]) || []);
    setLoading(false);
  }, [user?.orgId, projectId]);

  useEffect(() => {
    if (!user?.orgId) return;
    fetchContacts();

    const filter = projectId
      ? `source_project_id=eq.${projectId}`
      : `org_id=eq.${user.orgId}`;

    const channelName = `crm-contacts-${user.orgId}-${projectId || 'all'}-${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'contacts',
        filter,
      }, () => { fetchContacts(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchContacts, projectId, user?.orgId]);

  const updateContact = async (id: string, updates: Partial<Contact>) => {
    const { error } = await supabase.from('contacts').update(updates).eq('id', id);
    if (error) throw error;
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteContact = async (id: string) => {
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) throw error;
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const addTag = async (id: string, tag: string) => {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;
    const newTags = [...new Set([...contact.tags, tag])];
    await updateContact(id, { tags: newTags } as any);
  };

  const removeTag = async (id: string, tag: string) => {
    const contact = contacts.find(c => c.id === id);
    if (!contact) return;
    const newTags = contact.tags.filter(t => t !== tag);
    await updateContact(id, { tags: newTags } as any);
  };

  const moveToStage = async (id: string, stage: PipelineStage) => {
    await updateContact(id, { pipeline_stage: stage } as any);
    // Fire contact.stage_changed webhook (fire-and-forget)
    const contact = contacts.find(c => c.id === id);
    if (contact && user?.orgId) {
      supabase.functions.invoke('dispatch-webhook', {
        body: {
          event: 'contact.stage_changed',
          org_id: user.orgId,
          project_id: contact.source_project_id ?? null,
          payload: {
            contact_id: id,
            email: contact.email,
            previous_stage: contact.pipeline_stage,
            new_stage: stage,
          },
        },
      }).catch(() => {/* fire-and-forget */});
    }
  };

  return {
    contacts,
    loading,
    updateContact,
    deleteContact,
    addTag,
    removeTag,
    moveToStage,
    refetch: fetchContacts,
  };
}
