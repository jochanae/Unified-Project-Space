import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type ProfileData = {
  displayName: string | null;
  avatarUrl: string | null;
};

type ProfileState = ProfileData & { loading: boolean };

// Shared cache + in-flight dedup keyed by userId. Multiple components calling
// useProfile(user.id) on the same render now share a single GET /profiles call.
const profileCache = new Map<string, ProfileData>();
const inflight = new Map<string, Promise<ProfileData>>();
const subscribers = new Map<string, Set<(data: ProfileData) => void>>();

function fetchProfile(userId: string): Promise<ProfileData> {
  const cached = inflight.get(userId);
  if (cached) return cached;

  const promise = Promise.resolve(
    supabase.from("profiles").select("display_name, avatar_url").eq("id", userId).maybeSingle(),
  ).then(({ data, error }) => {
    const result: ProfileData = {
      displayName: error ? null : (data?.display_name ?? null),
      avatarUrl: error ? null : (data?.avatar_url ?? null),
    };
    profileCache.set(userId, result);
    inflight.delete(userId);
    const subs = subscribers.get(userId);
    if (subs) for (const cb of subs) cb(result);
    return result;
  });

  inflight.set(userId, promise);
  return promise;
}

export function useProfile(
  userId?: string,
  fallbackName?: string | null,
  fallbackAvatarUrl?: string | null,
) {
  const [profile, setProfile] = useState<ProfileState>(() => {
    if (!userId) {
      return {
        displayName: fallbackName ?? null,
        avatarUrl: fallbackAvatarUrl ?? null,
        loading: false,
      };
    }
    const cached = profileCache.get(userId);
    if (cached) {
      return {
        displayName: cached.displayName ?? fallbackName ?? null,
        avatarUrl: cached.avatarUrl ?? fallbackAvatarUrl ?? null,
        loading: false,
      };
    }
    return {
      displayName: fallbackName ?? null,
      avatarUrl: fallbackAvatarUrl ?? null,
      loading: true,
    };
  });

  useEffect(() => {
    if (!userId) {
      setProfile({
        displayName: fallbackName ?? null,
        avatarUrl: fallbackAvatarUrl ?? null,
        loading: false,
      });
      return;
    }

    let active = true;
    const cached = profileCache.get(userId);
    if (cached) {
      setProfile({
        displayName: cached.displayName ?? fallbackName ?? null,
        avatarUrl: cached.avatarUrl ?? fallbackAvatarUrl ?? null,
        loading: false,
      });
    } else {
      setProfile((current) => ({
        displayName: current.displayName ?? fallbackName ?? null,
        avatarUrl: current.avatarUrl ?? fallbackAvatarUrl ?? null,
        loading: true,
      }));
    }

    const onUpdate = (data: ProfileData) => {
      if (!active) return;
      setProfile({
        displayName: data.displayName ?? fallbackName ?? null,
        avatarUrl: data.avatarUrl ?? fallbackAvatarUrl ?? null,
        loading: false,
      });
    };

    let subs = subscribers.get(userId);
    if (!subs) {
      subs = new Set();
      subscribers.set(userId, subs);
    }
    subs.add(onUpdate);

    if (!cached) {
      fetchProfile(userId).catch(() => {
        if (active) {
          setProfile({
            displayName: fallbackName ?? null,
            avatarUrl: fallbackAvatarUrl ?? null,
            loading: false,
          });
        }
      });
    }

    return () => {
      active = false;
      subs?.delete(onUpdate);
      if (subs && subs.size === 0) subscribers.delete(userId);
    };
  }, [fallbackAvatarUrl, fallbackName, userId]);

  return useMemo(
    () => ({
      ...profile,
      setProfile,
    }),
    [profile],
  );
}

// Allow components that mutate the profile (e.g. settings page) to push a fresh
// snapshot into the shared cache so every other consumer updates immediately.
export function primeProfileCache(userId: string, data: Partial<ProfileData>) {
  const existing = profileCache.get(userId) ?? { displayName: null, avatarUrl: null };
  const next: ProfileData = {
    displayName: data.displayName !== undefined ? data.displayName : existing.displayName,
    avatarUrl: data.avatarUrl !== undefined ? data.avatarUrl : existing.avatarUrl,
  };
  profileCache.set(userId, next);
  const subs = subscribers.get(userId);
  if (subs) for (const cb of subs) cb(next);
}

// Clear cache entries on sign-out so a new user doesn't see stale data.
export function clearProfileCache(userId?: string) {
  if (userId) {
    profileCache.delete(userId);
    inflight.delete(userId);
  } else {
    profileCache.clear();
    inflight.clear();
  }
}
