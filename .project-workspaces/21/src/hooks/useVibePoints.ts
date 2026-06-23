import { useState, useEffect, useCallback, useRef, useSyncExternalStore } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

/** Points awarded per action */
export const VP_REWARDS = {
  dailyLogin: 10,
  chatMessage: 2,   // reduced from 5 to prevent runaway inflation
  goalComplete: 20,
  postReaction: 2,
  journalEntry: 10,
  moodCheckin: 5,
} as const;

// ═══════════════════════════════════════════════════
// Shared global store so all useVibePoints instances
// see the same balance without independent state.
// ═══════════════════════════════════════════════════

let _balance = 0;
let _listeners = new Set<() => void>();
let _initialised = false;
let _initUserId: string | null = null;
let _dailyLoginClaimed = false;
let _globalToastCooldown = 0;

// Throttle chat VP rewards: max once per 60s
let _lastChatRewardTime = 0;

function _setBalance(val: number) {
  _balance = val;
  _listeners.forEach(fn => fn());
}

function _subscribe(cb: () => void) {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

function _getSnapshot() { return _balance; }

/**
 * Database-backed Vibe Points system.
 * Uses a shared global store so all components see the same balance.
 */
export function useVibePoints(userId: string | null) {
  const balance = useSyncExternalStore(_subscribe, _getSnapshot);

  // Init + daily login (once per userId)
  useEffect(() => {
    if (!userId) return;
    if (_initialised && _initUserId === userId) return;
    _initUserId = userId;

    const init = async () => {
      try {
        const { data, error } = await supabase.rpc('claim_daily_login_bonus', {
          p_user_id: userId,
          p_bonus: VP_REWARDS.dailyLogin,
        });

        if (error) {
          console.error('[VibePoints] claim_daily_login_bonus error:', error);
          const { data: row } = await supabase
            .from('vibe_points')
            .select('balance')
            .eq('user_id', userId)
            .maybeSingle();
          _setBalance(row?.balance ?? 100);
          _initialised = true;
          return;
        }

        const result = data as { awarded: boolean; balance: number } | null;
        if (result) {
          _setBalance(result.balance);
          if (result.awarded && !_dailyLoginClaimed) {
            _dailyLoginClaimed = true;
            setTimeout(() => toast.success(`+${VP_REWARDS.dailyLogin} Vibe Points — daily login bonus ✨`), 2000);
          }
        }
      } catch (e) {
        console.error('[VibePoints] init failed:', e);
      }
      _initialised = true;
    };

    init();
  }, [userId]);

  const addPoints = useCallback(async (amount: number, reason?: string) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase.rpc('add_vibe_points', {
        p_user_id: userId,
        p_amount: amount,
      });
      if (!error && typeof data === 'number') {
        _setBalance(data);
      }
    } catch (e) {
      console.error('[VibePoints] addPoints failed:', e);
    }
    const now = Date.now();
    if (reason && now - _globalToastCooldown > 30000) {
      _globalToastCooldown = now;
      toast.success(`+${amount} VP — ${reason}`, { duration: 2000 });
    }
  }, [userId]);

  const reward = useCallback((action: keyof typeof VP_REWARDS) => {
    // Throttle chat messages to max once per 60 seconds
    if (action === 'chatMessage') {
      const now = Date.now();
      if (now - _lastChatRewardTime < 60000) return;
      _lastChatRewardTime = now;
    }
    const labels: Record<string, string> = {
      chatMessage: 'chatting',
      goalComplete: 'goal completed!',
      journalEntry: 'journal entry',
      moodCheckin: 'mood check-in',
      postReaction: 'reaction',
      dailyLogin: 'daily login',
    };
    addPoints(VP_REWARDS[action], labels[action] || action);
  }, [addPoints]);

  const spendPoints = useCallback(async (amount: number): Promise<boolean> => {
    if (!userId) return false;
    try {
      logger.log('[VibePoints] spendPoints called:', { userId, amount, currentBalance: _balance });
      const { data, error } = await supabase.rpc('spend_vibe_points', {
        p_user_id: userId,
        p_amount: amount,
      });
      logger.log('[VibePoints] spend_vibe_points RPC result:', { data, error });
      if (error) {
        console.error('[VibePoints] spend RPC error:', error);
        return false;
      }
      if (typeof data === 'number' && data >= 0) {
        logger.log('[VibePoints] Spend successful, new balance:', data);
        _setBalance(data);
        return true;
      }
      logger.warn('[VibePoints] Spend failed - insufficient funds. RPC returned:', data);
      return false;
    } catch (e) {
      console.error('[VibePoints] spendPoints exception:', e);
      return false;
    }
  }, [userId]);

  /** Force refresh balance from DB (e.g. after external changes) */
  const refreshBalance = useCallback(async () => {
    if (!userId) return;
    const { data: row } = await supabase
      .from('vibe_points')
      .select('balance')
      .eq('user_id', userId)
      .maybeSingle();
    if (row) _setBalance(row.balance);
  }, [userId]);

  return { balance, addPoints, spendPoints, reward, refreshBalance };
}
