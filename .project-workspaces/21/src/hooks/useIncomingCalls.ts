import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface IncomingCall {
  id: string;
  user_id: string;
  member_id: string;
  companion_name: string;
  companion_avatar_url: string | null;
  opener_line: string | null;
  reason: string | null;
  status: string;
  expires_at: string;
  created_at: string;
}

/**
 * Subscribes to incoming_calls for the current user.
 * Returns the most recent "ringing" call (or null).
 */
export function useIncomingCalls() {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!userId) return;

    // 1) Initial fetch — catch any ringing call placed while app was loading
    supabase
      .from('incoming_calls')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'ringing')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setActiveCall(data as IncomingCall);
      });

    // 2) Realtime subscription
    const channel = supabase
      .channel(`incoming_calls:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'incoming_calls', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as IncomingCall;
          if (row.status === 'ringing') {
            logger.log('[IncomingCalls] new ring', { id: row.id, from: row.companion_name });
            setActiveCall(row);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'incoming_calls', filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as IncomingCall;
          // If the active call moved out of "ringing", dismiss
          setActiveCall((cur) => {
            if (cur && cur.id === row.id && row.status !== 'ringing') return null;
            return cur;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  return { activeCall, dismiss: () => setActiveCall(null) };
}
