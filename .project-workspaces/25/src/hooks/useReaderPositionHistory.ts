/**
 * useReaderPositionHistory — fetch last N reading positions on demand.
 *
 * Used by the Gold-Dot Quick-Peek. We fetch lazily (on open) so we don't
 * pay for a read on every reader mount.
 */

import { useCallback, useState } from "react";
import { fetchRecentPositions, type PositionHistoryEntry } from "@/lib/reader-position-history";
import { useAuth } from "@/hooks/useAuth";

export function useReaderPositionHistory(limit: number = 3) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PositionHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      const next = await fetchRecentPositions(user.id, limit);
      setEntries(next);
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit]);

  return { entries, loading, refresh };
}
