import { useCallback, useEffect, useMemo, useState } from "react";
import type { Enums } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

type AppRole = Enums<"app_role">;

type RolesState = { roles: AppRole[]; resolved: boolean };

// Module-level cache shared across every useRoles() caller in the app.
const rolesCache = new Map<string, AppRole[]>();
const rolesCacheTime = new Map<string, number>();
const inflight = new Map<string, Promise<AppRole[]>>();
const subscribers = new Map<string, Set<(roles: AppRole[]) => void>>();

/** Cache is considered stale after 2 minutes — forces a re-fetch from the DB. */
const CACHE_TTL_MS = 2 * 60 * 1000;

function isCacheFresh(userId: string): boolean {
  const ts = rolesCacheTime.get(userId);
  return !!ts && Date.now() - ts < CACHE_TTL_MS;
}

function fetchRoles(userId: string): Promise<AppRole[]> {
  const cached = inflight.get(userId);
  if (cached) return cached;

  const promise = Promise.resolve(
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ).then(({ data, error }) => {
    const roles = error ? [] : (data ?? []).map((entry) => entry.role as AppRole);
    rolesCache.set(userId, roles);
    rolesCacheTime.set(userId, Date.now());
    inflight.delete(userId);
    const subs = subscribers.get(userId);
    if (subs) for (const cb of subs) cb(roles);
    return roles;
  });

  inflight.set(userId, promise);
  return promise;
}

/** Imperatively invalidate the cache for a user and re-fetch roles. */
export function refreshRoles(userId: string): void {
  rolesCache.delete(userId);
  rolesCacheTime.delete(userId);
  fetchRoles(userId);
}

export function useRoles(userId?: string) {
  const [state, setState] = useState<RolesState>(() => {
    if (!userId) return { roles: [], resolved: true };
    const cached = rolesCache.get(userId);
    if (cached && isCacheFresh(userId)) return { roles: cached, resolved: true };
    return { roles: [], resolved: false };
  });

  useEffect(() => {
    if (!userId) {
      setState({ roles: [], resolved: true });
      return;
    }

    const cached = rolesCache.get(userId);
    const fresh = cached && isCacheFresh(userId);
    if (fresh) {
      setState({ roles: cached, resolved: true });
    } else {
      // Show cached roles optimistically while re-fetching
      if (cached) setState({ roles: cached, resolved: true });
      else setState({ roles: [], resolved: false });
    }

    let active = true;
    const onUpdate = (roles: AppRole[]) => {
      if (active) setState({ roles, resolved: true });
    };

    let subs = subscribers.get(userId);
    if (!subs) {
      subs = new Set();
      subscribers.set(userId, subs);
    }
    subs.add(onUpdate);

    if (!fresh) {
      rolesCache.delete(userId);
      rolesCacheTime.delete(userId);
      fetchRoles(userId).catch(() => {
        if (active) setState({ roles: [], resolved: true });
      });
    }

    return () => {
      active = false;
      subs?.delete(onUpdate);
      if (subs && subs.size === 0) subscribers.delete(userId);
    };
  }, [userId]);

  const roleSet = useMemo(() => new Set(state.roles), [state.roles]);

  const refetch = useCallback(() => {
    if (userId) refreshRoles(userId);
  }, [userId]);

  return {
    roles: state.roles,
    loading: !state.resolved,
    resolved: state.resolved,
    hasRole: (role: AppRole) => roleSet.has(role),
    hasAnyRole: (acceptedRoles: readonly AppRole[]) =>
      acceptedRoles.some((role) => roleSet.has(role)),
    refetch,
  };
}
