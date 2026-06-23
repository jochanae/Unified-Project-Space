import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useSubscription } from '@/features/billing';
import { colorForUser } from '../lib/colors';

export interface FieldLockInfo {
  field_key: string;
  locked_by: string;
  locked_by_name: string | null;
  locked_by_color: string | null;
  expires_at: string;
}

interface Options {
  projectId: string | null;
  surface?: string;
}

/**
 * Live field-lock awareness across collaborators.
 * Subscribes to field_locks for this project + surface and exposes acquire/release helpers.
 */
export function useFieldLocks({ projectId, surface = 'build_stream' }: Options) {
  const { user } = useCurrentUser();
  const { isGrowth } = useSubscription();
  const [locks, setLocks] = useState<Record<string, FieldLockInfo>>({});
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heldKeysRef = useRef<Set<string>>(new Set());

  const active = isGrowth && !!projectId && !!user?.orgId;

  // Initial fetch + realtime
  useEffect(() => {
    if (!active || !projectId) return;

    let mounted = true;

    const refresh = async () => {
      const { data } = await supabase
        .from('field_locks')
        .select('field_key, locked_by, locked_by_name, locked_by_color, expires_at')
        .eq('project_id', projectId)
        .eq('surface', surface)
        .gt('expires_at', new Date().toISOString());
      if (!mounted) return;
      const next: Record<string, FieldLockInfo> = {};
      (data || []).forEach((l: any) => { next[l.field_key] = l; });
      setLocks(next);
    };

    refresh();

    const ch = supabase
      .channel(`${user!.orgId}.field-locks-${projectId}-${surface}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'field_locks',
        filter: `project_id=eq.${projectId}`,
      }, () => { refresh(); })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(ch);
    };
  }, [active, projectId, surface, user?.orgId]);

  // Refresh held locks every 20s so they don't expire
  useEffect(() => {
    if (!active || !projectId) return;
    refreshTimerRef.current = setInterval(async () => {
      if (heldKeysRef.current.size === 0) return;
      const userName = user?.email?.split('@')[0] || 'Teammate';
      const userColor = colorForUser(user!.id);
      for (const key of heldKeysRef.current) {
        await supabase.rpc('acquire_field_lock', {
          _project_id: projectId,
          _surface: surface,
          _field_key: key,
          _user_name: userName,
          _user_color: userColor,
        });
      }
    }, 20_000);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [active, projectId, surface, user?.id, user?.email]);

  const acquire = useCallback(async (fieldKey: string): Promise<boolean> => {
    if (!active || !projectId || !user) return true; // allow free editing when collab off
    const userName = user.email?.split('@')[0] || 'Teammate';
    const userColor = colorForUser(user.id);
    const { data, error } = await supabase.rpc('acquire_field_lock', {
      _project_id: projectId,
      _surface: surface,
      _field_key: fieldKey,
      _user_name: userName,
      _user_color: userColor,
    });
    if (error) return true; // fail-open
    const row = Array.isArray(data) ? data[0] : data;
    if (row?.success) {
      heldKeysRef.current.add(fieldKey);
      return true;
    }
    return false;
  }, [active, projectId, surface, user?.id, user?.email]);

  const release = useCallback(async (fieldKey: string) => {
    if (!active || !projectId) return;
    heldKeysRef.current.delete(fieldKey);
    await supabase.rpc('release_field_lock', {
      _project_id: projectId,
      _surface: surface,
      _field_key: fieldKey,
    });
  }, [active, projectId, surface]);

  // Release everything on unmount
  useEffect(() => () => {
    if (!projectId) return;
    const keys = Array.from(heldKeysRef.current);
    heldKeysRef.current.clear();
    keys.forEach(k => {
      supabase.rpc('release_field_lock', {
        _project_id: projectId,
        _surface: surface,
        _field_key: k,
      });
    });
  }, [projectId, surface]);

  const lockedBySomeoneElse = useCallback((fieldKey: string): FieldLockInfo | null => {
    const lock = locks[fieldKey];
    if (!lock) return null;
    if (lock.locked_by === user?.id) return null;
    return lock;
  }, [locks, user?.id]);

  return { locks, acquire, release, lockedBySomeoneElse, enabled: active };
}
