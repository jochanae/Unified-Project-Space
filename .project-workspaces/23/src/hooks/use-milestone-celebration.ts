import { useCallback, useEffect, useState } from 'react';
import type { WinCardInput } from '@/lib/win-card';

/**
 * Dedupes milestone celebrations using localStorage so the WinCardDialog
 * only opens once per (org, milestone-key) — or once per day for daily moments.
 *
 * Usage:
 *   const { winCard, setWinCard, celebrate } = useMilestoneCelebration(orgId);
 *   celebrate('first_deploy:my-project-id', { milestone: 'first_deploy', headline: '...' });
 *   {winCard && <WinCardDialog open onOpenChange={...} input={winCard} />}
 */
const STORAGE_PREFIX = 'intoiq_celebrated_';

function storageKey(orgId: string | undefined, key: string) {
  return `${STORAGE_PREFIX}${orgId ?? 'anon'}:${key}`;
}

/** Returns YYYY-MM-DD in local time — used for once-per-day milestones. */
export function todayStamp(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function useMilestoneCelebration(orgId: string | undefined) {
  const [winCard, setWinCard] = useState<WinCardInput | null>(null);

  const hasCelebrated = useCallback(
    (key: string) => {
      try {
        return localStorage.getItem(storageKey(orgId, key)) === '1';
      } catch {
        return false;
      }
    },
    [orgId],
  );

  const markCelebrated = useCallback(
    (key: string) => {
      try {
        localStorage.setItem(storageKey(orgId, key), '1');
      } catch {
        /* ignore quota errors */
      }
    },
    [orgId],
  );

  const celebrate = useCallback(
    (key: string, input: WinCardInput) => {
      if (!orgId) return false;
      if (hasCelebrated(key)) return false;
      markCelebrated(key);
      setWinCard(input);
      return true;
    },
    [orgId, hasCelebrated, markCelebrated],
  );

  return { winCard, setWinCard, celebrate, hasCelebrated, markCelebrated };
}

/**
 * Fire-and-forget version for places that don't need to render the dialog
 * locally (the caller supplies its own dialog state).
 */
export function shouldCelebrate(orgId: string | undefined, key: string): boolean {
  if (!orgId) return false;
  try {
    if (localStorage.getItem(storageKey(orgId, key)) === '1') return false;
    localStorage.setItem(storageKey(orgId, key), '1');
    return true;
  } catch {
    return false;
  }
}

/** Convenience: mark as celebrated when component mounts (avoids stale toggles). */
export function useOnce(_key: string) {
  useEffect(() => {
    /* placeholder for future hook composition */
  }, []);
}
