import { useState, useCallback, useEffect } from 'react';

export type SanctuaryAtmosphere = 'obsidian' | 'ethereal' | 'deep-sea';

export interface AtmosphereTheme {
  id: SanctuaryAtmosphere;
  label: string;
  emoji: string;
  description: string;
  /** Deep radial base */
  base: string;
  /** Breathing mesh gradient layers */
  meshLayers: {
    gradient: string;
    /** Opacity keyframes [min, max] */
    opacityRange: [number, number];
    /** Duration in seconds */
    duration: number;
    /** Delay in seconds */
    delay?: number;
  }[];
  /** Accent glow color for UI elements */
  accentHsl: string;
}

const THEMES: Record<SanctuaryAtmosphere, AtmosphereTheme> = {
  obsidian: {
    id: 'obsidian',
    label: 'Obsidian',
    emoji: '🌑',
    description: 'Deep blacks, gold accents — the private night sky',
    base: 'radial-gradient(ellipse at 30% 20%, hsl(230 30% 8%) 0%, hsl(235 25% 5%) 50%, hsl(240 20% 3%) 100%)',
    meshLayers: [
      {
        gradient:
          'radial-gradient(circle at 50% 40%, hsl(230 60% 45% / 0.25) 0%, transparent 55%), ' +
          'radial-gradient(circle at 20% 70%, hsl(250 50% 35% / 0.15) 0%, transparent 40%)',
        opacityRange: [0.06, 0.14],
        duration: 8,
      },
      {
        gradient: 'radial-gradient(circle at 50% 50%, hsl(35 60% 45% / 0.08) 0%, transparent 30%)',
        opacityRange: [0.03, 0.08],
        duration: 6,
        delay: 2,
      },
    ],
    accentHsl: '230 60% 65%',
  },
  ethereal: {
    id: 'ethereal',
    label: 'Ethereal',
    emoji: '🌤',
    description: 'Frosted morning whites with champagne gold',
    base: 'radial-gradient(ellipse at 40% 30%, hsl(40 20% 14%) 0%, hsl(35 15% 10%) 50%, hsl(30 12% 7%) 100%)',
    meshLayers: [
      {
        gradient:
          'radial-gradient(circle at 60% 30%, hsl(38 55% 60% / 0.20) 0%, transparent 50%), ' +
          'radial-gradient(circle at 25% 65%, hsl(30 40% 55% / 0.12) 0%, transparent 45%)',
        opacityRange: [0.08, 0.18],
        duration: 10,
      },
      {
        gradient:
          'radial-gradient(circle at 45% 50%, hsl(45 70% 70% / 0.10) 0%, transparent 35%), ' +
          'radial-gradient(circle at 80% 20%, hsl(20 45% 50% / 0.08) 0%, transparent 40%)',
        opacityRange: [0.04, 0.10],
        duration: 12,
        delay: 3,
      },
    ],
    accentHsl: '38 60% 60%',
  },
  'deep-sea': {
    id: 'deep-sea',
    label: 'Deep Sea',
    emoji: '🌊',
    description: 'Midnight blues and teals — the ocean swell',
    base: 'radial-gradient(ellipse at 35% 25%, hsl(210 40% 10%) 0%, hsl(215 35% 7%) 50%, hsl(220 30% 4%) 100%)',
    meshLayers: [
      {
        gradient:
          'radial-gradient(circle at 40% 45%, hsl(195 70% 40% / 0.20) 0%, transparent 50%), ' +
          'radial-gradient(circle at 75% 25%, hsl(210 60% 35% / 0.14) 0%, transparent 45%)',
        opacityRange: [0.06, 0.16],
        duration: 9,
      },
      {
        gradient:
          'radial-gradient(circle at 55% 70%, hsl(180 55% 45% / 0.10) 0%, transparent 40%), ' +
          'radial-gradient(circle at 15% 40%, hsl(220 50% 30% / 0.08) 0%, transparent 35%)',
        opacityRange: [0.03, 0.09],
        duration: 14,
        delay: 4,
      },
    ],
    accentHsl: '195 65% 55%',
  },
};

const STORAGE_KEY = 'compani-sanctuary-atmosphere';

export function useSanctuaryTheme() {
  const [atmosphere, setAtmosphereState] = useState<SanctuaryAtmosphere>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in THEMES) return stored as SanctuaryAtmosphere;
    return 'obsidian';
  });

  const setAtmosphere = useCallback((id: SanctuaryAtmosphere) => {
    localStorage.setItem(STORAGE_KEY, id);
    setAtmosphereState(id);
    window.dispatchEvent(new CustomEvent('sanctuary-atmosphere-change', { detail: id }));
  }, []);

  // Cross-tab sync
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue && e.newValue in THEMES) {
        setAtmosphereState(e.newValue as SanctuaryAtmosphere);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const theme = THEMES[atmosphere];

  return { atmosphere, setAtmosphere, theme, allThemes: Object.values(THEMES) };
}

export function getAtmosphereTheme(id?: SanctuaryAtmosphere): AtmosphereTheme {
  if (id && id in THEMES) return THEMES[id];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in THEMES) return THEMES[stored as SanctuaryAtmosphere];
  return THEMES.obsidian;
}
