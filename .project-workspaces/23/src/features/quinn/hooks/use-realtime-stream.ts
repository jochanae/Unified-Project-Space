import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Subscribe to realtime changes on stream_blocks for a project.
 * Invalidates React Query cache so BuildStream picks up new blocks.
 */
export function useRealtimeStream(projectId: string | null, orgId?: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId || !orgId) return;

    const channel = supabase
      .channel(`${orgId}.stream-blocks-${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stream_blocks',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          // Invalidate any queries that depend on stream blocks
          queryClient.invalidateQueries({ queryKey: ['stream-blocks', projectId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId, queryClient]);
}
