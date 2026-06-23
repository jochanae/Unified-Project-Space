/**
 * useDashboardMode — detects the current "mode" of the dashboard so the
 * Intent Ribbon can layer a mode-aware secondary phrase on top of the
 * user's morning intent word.
 *
 * Modes:
 *  - 'soul'       — default, no signal layered
 *  - 'strategic'  — recent Strategist tap or blueprint plan activity
 *  - 'reflective' — recent journal / wellness activity (last 6h)
 *  - 'creative'   — recent Studio activity
 *
 * Detection is intentionally lightweight & client-side for now — we read
 * localStorage flags + recent timestamps from companion_plans /
 * journal_entries. The hook is designed so a future PRL signal can be
 * wired in without changing the consumer surface.
 */
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type DashboardMode = 'soul' | 'strategic' | 'reflective' | 'creative';

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const STRATEGIC_FLAG_KEY = 'compani-mode-strategic-ts';
const CREATIVE_FLAG_KEY = 'compani-mode-creative-ts';

/** Mark a mode as recently active. Call this from Strategist tap, Studio tap, etc. */
export function markDashboardMode(mode: Exclude<DashboardMode, 'soul' | 'reflective'>) {
  try {
    if (mode === 'strategic') localStorage.setItem(STRATEGIC_FLAG_KEY, String(Date.now()));
    if (mode === 'creative') localStorage.setItem(CREATIVE_FLAG_KEY, String(Date.now()));
  } catch {}
}

function readFlag(key: string): number | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch { return null; }
}

export function useDashboardMode(userId: string | undefined): DashboardMode {
  const [mode, setMode] = useState<DashboardMode>('soul');

  const evaluate = useCallback(async () => {
    if (!userId) { setMode('soul'); return; }
    const now = Date.now();
    const cutoffIso = new Date(now - SIX_HOURS_MS).toISOString();

    // Quick local flags first — instant feedback for taps that just happened
    const strategicTs = readFlag(STRATEGIC_FLAG_KEY);
    const creativeTs = readFlag(CREATIVE_FLAG_KEY);
    const localStrategic = strategicTs && now - strategicTs < SIX_HOURS_MS;
    const localCreative = creativeTs && now - creativeTs < SIX_HOURS_MS;

    // DB checks — recent plan activity (strategic) + recent journal (reflective)
    const [plansRes, journalRes] = await Promise.all([
      supabase
        .from('companion_plans')
        .select('id', { head: true, count: 'exact' })
        .eq('user_id', userId)
        .gte('updated_at', cutoffIso),
      supabase
        .from('journal_entries')
        .select('id', { head: true, count: 'exact' })
        .eq('user_id', userId)
        .gte('created_at', cutoffIso),
    ]);

    const recentPlan = (plansRes.count ?? 0) > 0;
    const recentJournal = (journalRes.count ?? 0) > 0;

    // Priority: strategic > creative > reflective > soul
    if (localStrategic || recentPlan) setMode('strategic');
    else if (localCreative) setMode('creative');
    else if (recentJournal) setMode('reflective');
    else setMode('soul');
  }, [userId]);

  useEffect(() => {
    evaluate();
    // Re-evaluate when tab regains focus or window storage changes
    const onFocus = () => evaluate();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STRATEGIC_FLAG_KEY || e.key === CREATIVE_FLAG_KEY) evaluate();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('storage', onStorage);
    };
  }, [evaluate]);

  return mode;
}
