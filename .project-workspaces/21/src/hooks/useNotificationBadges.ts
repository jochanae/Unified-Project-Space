import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface BadgeCounts {
  messages: number;
  feed: number;
}

// Module-level ref so markChatSeen/markTabSeen can trigger invalidation
let _invalidate: (() => void) | null = null;

async function fetchBadgeCounts(userId: string): Promise<BadgeCounts> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // --- Messages badge: per-member last-seen tracking ---
  const { data: connections } = await supabase
    .from('connections')
    .select('member_id')
    .eq('user_id', userId)
    .eq('is_archived', false);

  let msgCount = 0;
  if (connections && connections.length > 0) {
    const memberIds = connections.map(c => c.member_id);
    
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('member_id, created_at')
      .eq('user_id', userId)
      .eq('role', 'assistant')
      .in('member_id', memberIds)
      .gt('created_at', since)
      .order('created_at', { ascending: false });

    if (recentMessages) {
      for (const memberId of memberIds) {
        const lastSeen = localStorage.getItem(`compani-lastseen-chat-${memberId}-${userId}`);
        const threshold = lastSeen || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const unread = recentMessages.filter(
          m => m.member_id === memberId && m.created_at > threshold
        ).length;
        msgCount += unread;
      }
    }
  }

  // --- Feed badge: post comments, reactions, and notifications ---
  const { data: userPostIds } = await supabase
    .from('user_posts')
    .select('id')
    .eq('user_id', userId);

  const feedLastSeen = localStorage.getItem(`compani-lastseen-feed-${userId}`) || new Date(0).toISOString();
  let feedCount = 0;

  if (userPostIds && userPostIds.length > 0) {
    const ids = userPostIds.map((p) => p.id);
    const [{ count: commentCount }, { count: reactionCount }] = await Promise.all([
      supabase
        .from('post_comments')
        .select('*', { count: 'exact', head: true })
        .in('post_id', ids)
        .neq('user_id', userId)
        .gt('created_at', feedLastSeen),
      supabase
        .from('post_reactions')
        .select('*', { count: 'exact', head: true })
        .in('post_id', ids)
        .neq('user_id', userId)
        .gt('created_at', feedLastSeen),
    ]);
    feedCount += (commentCount || 0) + (reactionCount || 0);
  }

  const { count: unreadNotifCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false)
    .gt('created_at', since);

  feedCount += (unreadNotifCount || 0);

  return { messages: msgCount, feed: feedCount };
}

export function useNotificationBadges(userId: string | undefined): BadgeCounts {
  const queryClient = useQueryClient();
  const queryKey = ['notification-badges', userId];

  const { data = { messages: 0, feed: 0 } } = useQuery({
    queryKey,
    queryFn: () => fetchBadgeCounts(userId!),
    enabled: !!userId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Expose invalidation so mark* functions can trigger immediate recount
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  useEffect(() => {
    _invalidate = invalidate;
    return () => { _invalidate = null; };
  }, [invalidate]);

  // Realtime invalidation
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('badge-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments' }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient, queryKey]);

  return data;
}

/** Mark a specific chat as seen (per-member) — immediately clears badge */
export function markChatSeen(memberId: string, userId: string) {
  localStorage.setItem(`compani-lastseen-chat-${memberId}-${userId}`, new Date().toISOString());
  _invalidate?.();
}

export function markTabSeen(tab: 'messages' | 'feed', userId: string) {
  localStorage.setItem(`compani-lastseen-${tab}-${userId}`, new Date().toISOString());
  _invalidate?.();
}
