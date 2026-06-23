import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CollectibleItem {
  id: string;
  userId: string;
  memberId: string;
  type: string; // 'letter' | 'recipe' | 'reflection' | 'decision' | 'knowledge' | 'habit' | 'language' | 'practice'
  title: string | null;
  content: Record<string, any>;
  companionName: string | null;
  createdAt: string;
}

function mapRow(row: any): CollectibleItem {
  return {
    id: row.id,
    userId: row.user_id,
    memberId: row.member_id,
    type: row.type,
    title: row.title,
    content: row.content,
    companionName: row.companion_name,
    createdAt: row.created_at,
  };
}

async function fetchCollectibles(userId: string, memberId: string): Promise<CollectibleItem[]> {
  const { data, error } = await (supabase as any)
    .from('companion_collectibles')
    .select('*')
    .eq('user_id', userId)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapRow);
}

export function useCompanionCollectibles(userId: string | null, memberId: string | undefined) {
  const queryClient = useQueryClient();
  const queryKey = ['companion-collectibles', userId, memberId];

  const { data: collectibles = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: () => fetchCollectibles(userId!, memberId!),
    enabled: !!userId && !!memberId,
    staleTime: 30_000,
  });

  const saveCollectible = useCallback(
    async (item: { type: string; title?: string; content: Record<string, any>; companionName?: string }) => {
      if (!userId || !memberId) return;
      try {
        await (supabase as any).from('companion_collectibles').insert({
          user_id: userId,
          member_id: memberId,
          type: item.type,
          title: item.title || null,
          content: item.content,
          companion_name: item.companionName || null,
        });
        queryClient.invalidateQueries({ queryKey });
      } catch (e) {
        console.error('[Collectibles] Save failed:', e);
      }
    },
    [userId, memberId, queryClient, queryKey]
  );

  const deleteCollectible = useCallback(
    async (id: string) => {
      try {
        queryClient.setQueryData<CollectibleItem[]>(queryKey, (prev) =>
          (prev || []).filter((c) => c.id !== id)
        );
        const { error } = await (supabase as any).from('companion_collectibles').delete().eq('id', id);
        if (error) {
          console.error('[Collectibles] Delete failed:', error);
          queryClient.invalidateQueries({ queryKey });
        }
      } catch (e) {
        console.error('[Collectibles] Delete failed:', e);
        queryClient.invalidateQueries({ queryKey });
      }
    },
    [queryClient, queryKey]
  );

  const letters = collectibles.filter((c) => c.type === 'letter');
  const cards = collectibles.filter((c) => c.type !== 'letter');

  return { collectibles, letters, cards, loading, saveCollectible, deleteCollectible, refresh: () => queryClient.invalidateQueries({ queryKey }) };
}

/** Fire-and-forget helper for saving collectibles from chat context (with dedup) */
export async function saveCollectibleFromChat(
  userId: string,
  memberId: string,
  item: { type: string; title?: string; content: Record<string, any>; companionName?: string }
) {
  try {
    // Dedup: check if a collectible with the same type+title already exists for this companion
    const { data: existing } = await (supabase as any)
      .from('companion_collectibles')
      .select('id')
      .eq('user_id', userId)
      .eq('member_id', memberId)
      .eq('type', item.type)
      .eq('title', item.title || '')
      .limit(1);

    if (existing && existing.length > 0) {
      return; // already saved
    }

    await (supabase as any).from('companion_collectibles').insert({
      user_id: userId,
      member_id: memberId,
      type: item.type,
      title: item.title || null,
      content: item.content,
      companion_name: item.companionName || null,
    });
  } catch (e) {
    console.error('[Collectibles] Save from chat failed:', e);
  }
}
