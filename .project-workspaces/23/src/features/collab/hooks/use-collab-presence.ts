import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSubscription } from '@/features/billing';
import { colorForUser } from '../lib/colors';

export interface CollabPeer {
  userId: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number; surface: string } | null;
  lastSeen: number;
}

interface Options {
  projectId: string | null;
  surface?: string; // 'build_stream' | 'page_builder' | 'funnel'
  enabled?: boolean;
}

/**
 * Real-time presence + cursor broadcast for a project surface.
 * Innovation tier only. Uses Supabase Realtime presence + broadcast.
 */
export function useCollabPresence({ projectId, surface = 'build_stream', enabled = true }: Options) {
  const { user } = useCurrentUser();
  const { isGrowth } = useSubscription();
  const [peers, setPeers] = useState<Record<string, CollabPeer>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastBroadcastRef = useRef(0);

  const active = enabled && isGrowth && !!projectId && !!user?.orgId;

  useEffect(() => {
    if (!active || !projectId || !user) return;

    const topic = `${user.orgId}.collab-${projectId}-${surface}`;
    // Remove any stale channel with the same topic to avoid re-using an
    // already-subscribed channel (which would throw when adding listeners).
    const existing = supabase.getChannels().find((c: any) => c.topic === `realtime:${topic}` || c.topic === topic);
    if (existing) {
      try { supabase.removeChannel(existing); } catch { /* noop */ }
    }
    const ch = supabase.channel(topic, {
      config: { presence: { key: user.id } },
    });

    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<{ name: string; color: string }>();
      const next: Record<string, CollabPeer> = {};
      Object.entries(state).forEach(([uid, metas]) => {
        if (uid === user.id) return;
        const meta = metas[0];
        next[uid] = {
          userId: uid,
          name: meta?.name || 'Teammate',
          color: meta?.color || colorForUser(uid),
          cursor: null,
          lastSeen: Date.now(),
        };
      });
      setPeers(prev => {
        // preserve cursor data if peer is still present
        Object.keys(next).forEach(uid => {
          if (prev[uid]?.cursor) next[uid].cursor = prev[uid].cursor;
        });
        return next;
      });
    });

    ch.on('broadcast', { event: 'cursor' }, (payload) => {
      const { userId, x, y } = payload.payload as { userId: string; x: number; y: number };
      if (userId === user.id) return;
      setPeers(prev => {
        if (!prev[userId]) return prev;
        return {
          ...prev,
          [userId]: { ...prev[userId], cursor: { x, y, surface }, lastSeen: Date.now() },
        };
      });
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({
          name: user.email?.split('@')[0] || 'Teammate',
          color: colorForUser(user.id),
        });
      }
    });

    channelRef.current = ch;

    return () => {
      ch.unsubscribe();
      supabase.removeChannel(ch);
      channelRef.current = null;
      setPeers({});
    };
  }, [active, projectId, surface, user?.id, user?.orgId, user?.email]);

  const broadcastCursor = useCallback((x: number, y: number) => {
    if (!channelRef.current || !user) return;
    const now = Date.now();
    if (now - lastBroadcastRef.current < 50) return; // throttle to 20fps
    lastBroadcastRef.current = now;
    channelRef.current.send({
      type: 'broadcast',
      event: 'cursor',
      payload: { userId: user.id, x, y },
    });
  }, [user?.id]);

  return {
    peers: Object.values(peers),
    broadcastCursor,
    enabled: active,
    selfColor: user ? colorForUser(user.id) : undefined,
  };
}
