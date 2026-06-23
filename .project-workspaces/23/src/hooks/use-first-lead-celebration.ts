import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';

const STORAGE_KEY = 'intoiq_first_lead_celebrated';

/**
 * useFirstLeadCelebration
 * -----------------------
 * Detects the org's FIRST EVER lead and triggers the celebration moment.
 * Fires exactly once per org (persisted in localStorage).
 *
 * Strategy:
 *  1) On mount: if no flag set, check current lead count. If exactly 1, mark celebrated and trigger.
 *     If >1, mark celebrated WITHOUT trigger (org already has leads — they missed it).
 *  2) Subscribe to realtime INSERT on lead_notifications. When the first one arrives
 *     in this session for an org with previously zero leads, trigger.
 */
export function useFirstLeadCelebration() {
  const { user } = useCurrentUser();
  const orgId = user?.orgId;
  const [showCelebration, setShowCelebration] = useState(false);
  const [leadEmail, setLeadEmail] = useState<string | null>(null);

  const hasCelebrated = () => {
    if (typeof window === 'undefined' || !orgId) return true;
    try {
      const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, boolean>;
      return !!map[orgId];
    } catch {
      return false;
    }
  };

  const markCelebrated = () => {
    if (typeof window === 'undefined' || !orgId) return;
    try {
      const map = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, boolean>;
      map[orgId] = true;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    if (!orgId || hasCelebrated()) return;
    let cancelled = false;

    // Initial backfill check
    (async () => {
      const { count, data } = await supabase
        .from('lead_notifications')
        .select('email, created_at', { count: 'exact' })
        .eq('org_id', orgId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (cancelled) return;

      if ((count ?? 0) >= 1 && data && data[0]) {
        // If there's exactly one and it was within the last 5 minutes, celebrate.
        const createdAt = new Date(data[0].created_at).getTime();
        const isFresh = Date.now() - createdAt < 5 * 60 * 1000;
        if (count === 1 && isFresh) {
          setLeadEmail(data[0].email);
          setShowCelebration(true);
        }
        // Either way, mark so we never re-celebrate.
        markCelebrated();
      }
    })();

    // Realtime: if the first lead lands while user is in-app
    const channel = supabase
      .channel(`first-lead-${orgId}-${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'lead_notifications',
          filter: `org_id=eq.${orgId}`,
        },
        async (payload) => {
          if (hasCelebrated()) return;
          // Confirm this really is the first by re-counting
          const { count } = await supabase
            .from('lead_notifications')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', orgId);
          if ((count ?? 0) === 1) {
            const email = (payload.new as { email?: string })?.email ?? null;
            setLeadEmail(email);
            setShowCelebration(true);
          }
          markCelebrated();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const dismiss = () => setShowCelebration(false);

  return { showCelebration, leadEmail, dismiss };
}
