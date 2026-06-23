import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Funnel {
  id: string;
  project_id: string;
  org_id: string;
  name: string;
  funnel_type: string;
  status: string;
  slug: string;
  created_at: string;
}

export const FUNNEL_TYPES = [
  { value: 'lead_gen', label: 'Lead Gen' },
  { value: 'sales', label: 'Sales' },
  { value: 'webinar', label: 'Webinar' },
  { value: 'waitlist', label: 'Waitlist' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
];

export function useFunnels(orgId: string | null) {
  const qc = useQueryClient();

  const { data: funnels = [], isLoading } = useQuery({
    queryKey: ['funnels', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('funnels' as any)
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Funnel[];
    },
    enabled: !!orgId,
  });

  const addFunnel = useMutation({
    mutationFn: async (input: { project_id: string; name: string; funnel_type?: string }) => {
      if (!orgId) throw new Error('Missing org');
      const slug = input.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + crypto.randomUUID().slice(0, 8);
      const { data, error } = await supabase
        .from('funnels' as any)
        .insert({
          project_id: input.project_id,
          org_id: orgId,
          name: input.name,
          funnel_type: input.funnel_type || 'lead_gen',
          slug,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Funnel;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['funnels', orgId] });
      toast.success('Funnel created');
    },
    onError: (e: any) => toast.error(e.message || 'Could not create funnel'),
  });

  const updateFunnel = useMutation({
    mutationFn: async (input: { id: string; updates: Partial<Pick<Funnel, 'name' | 'funnel_type' | 'status'>> }) => {
      const { error } = await supabase.from('funnels' as any).update(input.updates).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['funnels', orgId] }),
  });

  const removeFunnel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('funnels' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['funnels', orgId] });
      qc.invalidateQueries({ queryKey: ['funnel-pages-status'] });
      toast.success('Funnel deleted');
    },
  });

  return { funnels, isLoading, addFunnel, updateFunnel, removeFunnel };
}
