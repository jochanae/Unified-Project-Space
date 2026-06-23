import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type FoundingTier = 'genesis' | 'foundation';

interface FoundingMemberStatus {
  isFoundingMember: boolean;
  serialNumber: number | null;
  tier: FoundingTier | null;
  showReveal: boolean;
  showSnapshot: boolean;
  claimDate: string | null;
  percentile: number | null;
  joinedAfterCount: number | null;
  markAsNotified: () => Promise<void>;
  markSnapshotSaved: () => Promise<void>;
}

export function useFoundingMemberStatus(): FoundingMemberStatus {
  const [serialNumber, setSerialNumber] = useState<number | null>(null);
  const [showReveal, setShowReveal] = useState(false);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [claimDate, setClaimDate] = useState<string | null>(null);
  const [percentile, setPercentile] = useState<number | null>(null);
  const [joinedAfterCount, setJoinedAfterCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data, error } = await supabase
        .from('beta_serial_numbers')
        .select('serial_number, notified_at, claimed_at, snapshot_saved_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error || !data || cancelled) return;

      setSerialNumber(data.serial_number);
      setClaimDate(data.claimed_at);

      if (!(data as any).notified_at) {
        setShowReveal(true);
      } else if (!(data as any).snapshot_saved_at) {
        setShowSnapshot(true);
      }

      const [percRes, countRes] = await Promise.all([
        supabase.rpc('get_founding_percentile', { p_serial: data.serial_number }),
        supabase.rpc('get_joined_after_count', { p_serial: data.serial_number }),
      ]);

      if (!cancelled) {
        if (!percRes.error && percRes.data !== null) {
          setPercentile(percRes.data as number);
        }
        if (!countRes.error && countRes.data !== null) {
          setJoinedAfterCount(countRes.data as number);
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const tier: FoundingTier | null = serialNumber
    ? serialNumber <= 100 ? 'genesis' : 'foundation'
    : null;

  const markAsNotified = useCallback(async () => {
    setShowReveal(false);
    setShowSnapshot(true);
    await supabase.rpc('mark_founding_reveal_seen' as any);
  }, []);

  const markSnapshotSaved = useCallback(async () => {
    setShowSnapshot(false);
    await supabase.rpc('mark_founding_snapshot_seen' as any);
  }, []);

  return {
    isFoundingMember: serialNumber !== null && serialNumber > 0,
    serialNumber,
    tier,
    showReveal,
    showSnapshot,
    claimDate,
    percentile,
    joinedAfterCount,
    markAsNotified,
    markSnapshotSaved,
  };
}
