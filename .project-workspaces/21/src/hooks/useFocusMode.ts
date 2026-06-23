import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { closingRitualHaptic, softConfirmHaptic } from '@/lib/sanctuaryHaptics';
import { playDashboardChime } from '@/lib/sanctuarySfx';

const STORAGE_KEY = 'compani-focus-mode';
const ACTIVATED_KEY = 'compani-focus-activated-at';

export interface FocusModeState {
  isFocusActive: boolean;
  activatedAt: number | null;
  /** Elapsed seconds since focus started */
  elapsed: number;
  activate: () => void;
  deactivate: () => void;
  toggle: () => void;
}

/** Global Focus Mode ("Flight Mode") hook — persisted in localStorage */
export function useFocusMode(): FocusModeState {
  const [isFocusActive, setIsFocusActive] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const [activatedAt, setActivatedAt] = useState<number | null>(() => {
    const v = localStorage.getItem(ACTIVATED_KEY);
    return v ? Number(v) : null;
  });
  const [elapsed, setElapsed] = useState(0);

  // Tick elapsed every second while active
  useEffect(() => {
    if (!isFocusActive || !activatedAt) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - activatedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isFocusActive, activatedAt]);

  // Listen for cross-tab changes
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        const active = e.newValue === 'true';
        setIsFocusActive(active);
        if (!active) setActivatedAt(null);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const activate = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.setItem(ACTIVATED_KEY, String(now));
    setIsFocusActive(true);
    setActivatedAt(now);
    softConfirmHaptic();

    // ── Memory fade-in: re-trigger last-used soundscape with a 3s fade ──
    const lastDeck = localStorage.getItem('compani-sound-deck');
    if (lastDeck && lastDeck !== 'none') {
      (window as any).__compani_next_fade_seconds = 3;
      window.dispatchEvent(new CustomEvent('compani-sound-change', {
        detail: { key: 'deck', value: lastDeck },
      }));
    }

    // Entry toast — obsidian glass + gold
    toast('Entering the Stillness…', {
      duration: 2400,
      className: 'compani-focus-toast',
      style: {
        background: 'hsl(230 30% 6% / 0.92)',
        border: '1px solid hsl(var(--primary) / 0.35)',
        color: 'hsl(var(--primary))',
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5), 0 0 18px hsl(var(--primary) / 0.15)',
        fontWeight: 500,
        letterSpacing: '0.02em',
      },
    });

    // Dispatch custom event so overlay can react immediately
    window.dispatchEvent(new CustomEvent('focus-mode-change', { detail: { active: true } }));
  }, []);

  const deactivate = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVATED_KEY);
    setIsFocusActive(false);
    setActivatedAt(null);
    closingRitualHaptic();
    playDashboardChime();
    window.dispatchEvent(new CustomEvent('focus-mode-change', { detail: { active: false } }));
  }, []);

  const toggle = useCallback(() => {
    if (isFocusActive) deactivate();
    else activate();
  }, [isFocusActive, activate, deactivate]);

  return { isFocusActive, activatedAt, elapsed, activate, deactivate, toggle };
}

/** Lightweight read-only check (no hook, no re-render) */
export function isFocusModeActive(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}
