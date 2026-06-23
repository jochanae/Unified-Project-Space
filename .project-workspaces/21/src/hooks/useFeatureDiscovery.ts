import { useState, useEffect, useCallback } from 'react';

export const DISCOVERY_KEYS = {
  PLANS_SECTION: 'plans-section',
  PLAN_STEPS: 'plan-steps',
  SAVE_OFFER: 'save-offer',
  WELLNESS_TAB: 'wellness-tab',
  VAULT_TAB: 'vault-tab',
  PLAYBOOKS: 'playbooks',
} as const;

function getStorageKey(userId: string): string {
  return `compani-discovered-${userId}`;
}

function loadDiscovered(userId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDiscovered(userId: string, keys: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(keys));
  } catch {
    // ignore
  }
}

export function useFeatureDiscovery(userId: string | undefined) {
  const [discovered, setDiscovered] = useState<string[]>([]);

  useEffect(() => {
    if (!userId) {
      setDiscovered([]);
      return;
    }
    setDiscovered(loadDiscovered(userId));
  }, [userId]);

  const hasDiscovered = useCallback(
    (key: string): boolean => {
      return discovered.includes(key);
    },
    [discovered]
  );

  const markDiscovered = useCallback(
    (key: string): void => {
      if (!userId) return;
      if (discovered.includes(key)) return;
      const next = [...discovered, key];
      setDiscovered(next);
      saveDiscovered(userId, next);
    },
    [userId, discovered]
  );

  return { hasDiscovered, markDiscovered };
}
