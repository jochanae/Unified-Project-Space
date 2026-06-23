import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ReactionSummary {
  emoji: string;
  count: number;
  reacted: boolean; // current user reacted with this emoji
}

const EMOJI_OPTIONS = ['❤️', '😂', '🔥', '👏', '💯'];

export { EMOJI_OPTIONS };

export function useReactions(postIds: string[], userId: string | undefined) {
  const [reactions, setReactions] = useState<Record<string, ReactionSummary[]>>({});

  const buildSummaries = useCallback((rows: any[]) => {
    const map: Record<string, Record<string, { count: number; reacted: boolean }>> = {};
    rows.forEach((r) => {
      if (!map[r.post_id]) map[r.post_id] = {};
      if (!map[r.post_id][r.emoji]) map[r.post_id][r.emoji] = { count: 0, reacted: false };
      map[r.post_id][r.emoji].count++;
      if (r.user_id === userId) map[r.post_id][r.emoji].reacted = true;
    });
    const result: Record<string, ReactionSummary[]> = {};
    Object.entries(map).forEach(([postId, emojis]) => {
      result[postId] = Object.entries(emojis).map(([emoji, data]) => ({
        emoji,
        count: data.count,
        reacted: data.reacted,
      }));
    });
    return result;
  }, [userId]);

  useEffect(() => {
    if (postIds.length === 0) return;

    const load = async () => {
      const { data } = await supabase
        .from('post_reactions')
        .select('post_id, emoji, user_id')
        .in('post_id', postIds);
      if (data) setReactions(buildSummaries(data));
    };
    load();

    const channel = supabase
      .channel('reactions-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_reactions' }, () => {
        load();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [postIds.join(','), userId]);

  const toggleReaction = useCallback(async (postId: string, emoji: string) => {
    if (!userId) return;
    const existing = reactions[postId]?.find((r) => r.emoji === emoji && r.reacted);
    if (existing) {
      await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('emoji', emoji);
    } else {
      await supabase
        .from('post_reactions')
        .insert({ post_id: postId, user_id: userId, emoji });
    }
  }, [userId, reactions]);

  return { reactions, toggleReaction, EMOJI_OPTIONS };
}
