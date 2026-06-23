import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'portrait-animations-enabled';

function readPref(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
}

export function usePortraitAnimations() {
  const [enabled, setEnabledState] = useState(readPref);

  // Listen for changes from other instances (e.g. toggle in PortraitPreview updates chat page)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setEnabledState(e.newValue === 'true');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
      // Dispatch event so other mounted components using this hook re-read the value
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: String(next) }));
    } catch (e) { logger.warn("[PortraitAnimations] Animation failed:", e); }
  }, []);

  return [enabled, setEnabled] as const;
}

/** Read-only version for components that just need the current value */
export function getPortraitAnimationsEnabled(): boolean {
  return readPref();
}
