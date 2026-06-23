import { useState, useEffect } from 'react';

type CircadianPhase = 'night' | 'morning' | 'day';

/**
 * useNightMode — circadian-aware hook that manages three phases:
 * - night (10 PM – 5 AM): Obsidian Sanctuary
 * - morning (5 AM – 9 AM): Warm sunrise tones
 * - day (9 AM – 10 PM): Standard gold
 *
 * Applies `.night` or `.morning` class on <html> for CSS variable overrides.
 */
export function useNightMode(): CircadianPhase {
  const getPhase = (): CircadianPhase => {
    const h = new Date().getHours();
    if (h >= 22 || h < 5) return 'night';
    if (h >= 5 && h < 9) return 'morning';
    return 'day';
  };

  const [phase, setPhase] = useState<CircadianPhase>(getPhase);

  useEffect(() => {
    const check = () => setPhase(getPhase());
    const timer = setInterval(check, 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const el = document.documentElement;
    el.classList.remove('night', 'morning');
    if (phase !== 'day') {
      el.classList.add(phase);
    }
  }, [phase]);

  return phase;
}
