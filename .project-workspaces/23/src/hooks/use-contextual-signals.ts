import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';

export type QuinnNudge = {
  id: string;
  route: string;
  severity: 'info' | 'warn' | 'win';
  message: string;
  cta_label: string;
  cta_route: string;
};

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'intoiq_nudge_dismissals';

type DismissalMap = Record<string, number>; // nudgeId -> dismissedAt

function readDismissals(): DismissalMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DismissalMap) : {};
  } catch {
    return {};
  }
}

function writeDismissals(map: DismissalMap) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
}

function isOnCooldown(nudgeId: string): boolean {
  const map = readDismissals();
  const dismissedAt = map[nudgeId];
  if (!dismissedAt) return false;
  return Date.now() - dismissedAt < COOLDOWN_MS;
}

/**
 * useContextualSignals
 * Fetches one route-aware MarQ nudge from quinn-context-signals.
 * Respects 24h dismissal cooldown via localStorage.
 *
 * Routes are normalized — only top-level segments matter.
 */
export function useContextualSignals() {
  const { user } = useCurrentUser();
  const location = useLocation();
  const [nudge, setNudge] = useState<QuinnNudge | null>(null);
  const [loading, setLoading] = useState(false);

  // Skip on these routes — too noisy / not a "working" surface
  const skipRoutes = ['/login', '/reset-password', '/p/', '/blueprint', '/privacy', '/terms', '/unsubscribe', '/workspace'];
  const shouldSkip = skipRoutes.some((r) => location.pathname.startsWith(r));

  useEffect(() => {
    if (shouldSkip || !user?.orgId) {
      setNudge(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke('quinn-context-signals', {
          body: { route: location.pathname },
        });

        if (cancelled) return;
        if (error) {
          setNudge(null);
          return;
        }

        const incoming = (data?.nudge as QuinnNudge | null) ?? null;
        if (incoming && isOnCooldown(incoming.id)) {
          setNudge(null);
        } else {
          setNudge(incoming);
        }
      } catch {
        if (!cancelled) setNudge(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, user?.orgId, shouldSkip]);

  const dismiss = () => {
    if (!nudge) return;
    const map = readDismissals();
    map[nudge.id] = Date.now();
    writeDismissals(map);
    setNudge(null);
  };

  return { nudge, loading, dismiss };
}
