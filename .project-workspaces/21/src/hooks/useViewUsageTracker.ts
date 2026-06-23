/**
 * Phase 3 — View Usage Tracker
 * Tracks which of the 3 pinnable views the user opens most frequently.
 * Stores data in localStorage as a lightweight, privacy-friendly approach.
 */
import { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { routeToAnchor, type HomeAnchor } from './useHomeAnchor';

const STORAGE_KEY = 'compani-view-usage';

interface ViewUsageData {
  counts: Record<HomeAnchor, number>;
  totalSessions: number;
  lastNudgeDismissed?: string; // ISO timestamp
}

function getUsageData(): ViewUsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { counts: { dashboard: 0, companion: 0 }, totalSessions: 0 };
}

function saveUsageData(data: ViewUsageData) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

/** Record a view visit — called automatically by the hook on route change */
function recordVisit(anchor: HomeAnchor) {
  const data = getUsageData();
  data.counts[anchor] = (data.counts[anchor] || 0) + 1;
  data.totalSessions += 1;
  saveUsageData(data);
}

/** Get the most-used view and its usage percentage */
export function getMostUsedView(): { view: HomeAnchor; percentage: number; totalSessions: number } | null {
  const data = getUsageData();
  if (data.totalSessions < 5) return null; // need minimum data

  const entries = Object.entries(data.counts) as [HomeAnchor, number][];
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  const [topView, topCount] = sorted[0];
  const percentage = Math.round((topCount / data.totalSessions) * 100);

  return { view: topView, percentage, totalSessions: data.totalSessions };
}

/** Check if we should show the "Your Rhythm" nudge */
export function shouldShowRhythmNudge(currentAnchor: HomeAnchor): {
  show: boolean;
  suggestedView?: HomeAnchor;
  percentage?: number;
} {
  const data = getUsageData();

  // Don't show if dismissed in the last 7 days
  if (data.lastNudgeDismissed) {
    const dismissed = new Date(data.lastNudgeDismissed);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (dismissed > sevenDaysAgo) return { show: false };
  }

  const most = getMostUsedView();
  if (!most) return { show: false };

  // Only nudge if the most-used view differs from current anchor
  // and the user uses it >60% of the time
  if (most.view !== currentAnchor && most.percentage >= 60) {
    return { show: true, suggestedView: most.view, percentage: most.percentage };
  }

  return { show: false };
}

/** Dismiss the nudge for 7 days */
export function dismissRhythmNudge() {
  const data = getUsageData();
  data.lastNudgeDismissed = new Date().toISOString();
  saveUsageData(data);
}

/**
 * Hook: automatically tracks which pinnable view the user navigates to.
 * Drop this into a top-level layout component.
 */
export function useViewUsageTracker() {
  const location = useLocation();

  useEffect(() => {
    const anchor = routeToAnchor(location.pathname);
    if (anchor) {
      recordVisit(anchor);
    }
  }, [location.pathname]);
}
