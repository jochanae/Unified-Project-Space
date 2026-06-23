import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FlowPage {
  id: string;
  funnel_id: string | null;
  project_id: string | null;
  title: string;
  slug: string;
  step_index: number;
  next_page_id: string | null;
  is_published: boolean;
  published_url: string | null;
}

export function useFunnelFlow(funnelId: string | null) {
  const qc = useQueryClient();

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['funnel-flow', funnelId],
    queryFn: async () => {
      if (!funnelId) return [];
      const { data, error } = await supabase
        .from('pages')
        .select('id, funnel_id, project_id, title, slug, step_index, next_page_id, is_published, published_url')
        .eq('funnel_id', funnelId)
        .order('step_index', { ascending: true });
      if (error) throw error;
      return (data || []) as FlowPage[];
    },
    enabled: !!funnelId,
  });

  const setNext = useMutation({
    mutationFn: async ({ pageId, nextPageId }: { pageId: string; nextPageId: string | null }) => {
      const { error } = await supabase
        .from('pages')
        .update({ next_page_id: nextPageId })
        .eq('id', pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['funnel-flow', funnelId] });
      toast.success('Flow updated');
    },
    onError: (e: any) => toast.error(e.message || 'Could not update flow'),
  });

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      await Promise.all(
        orderedIds.map((id, idx) =>
          supabase.from('pages').update({ step_index: idx }).eq('id', id)
        )
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['funnel-flow', funnelId] }),
  });

  return { pages, isLoading, setNext, reorder };
}
