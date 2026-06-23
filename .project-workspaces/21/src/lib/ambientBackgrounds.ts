/**
 * Ambient light-leak background styles.
 *
 * Adults  → moody amber / violet
 * Minors  → brighter magical cyan / magenta / gold
 */

export interface AmbientStyles {
  /** Deep radial base gradient */
  base: string;
  /** Light-leak overlay (use with opacity ~0.2–0.25) */
  leaks: string;
}

const ADULT: AmbientStyles = {
  base: 'radial-gradient(ellipse at 30% 20%, hsl(225 25% 10%) 0%, hsl(225 25% 6%) 50%, hsl(230 20% 4%) 100%)',
  leaks:
    'radial-gradient(circle at 15% 50%, hsl(350 45% 65% / 0.12) 0%, transparent 45%), ' +
    'radial-gradient(circle at 85% 30%, hsl(262 55% 62% / 0.08) 0%, transparent 40%)',
};

const YOUTH: AmbientStyles = {
  base: 'radial-gradient(ellipse at 30% 20%, hsl(220 30% 14%) 0%, hsl(225 25% 8%) 50%, hsl(230 20% 5%) 100%)',
  leaks:
    'radial-gradient(circle at 10% 55%, hsl(185 80% 60% / 0.18) 0%, transparent 45%), ' +
    'radial-gradient(circle at 85% 25%, hsl(310 70% 60% / 0.14) 0%, transparent 40%), ' +
    'radial-gradient(circle at 50% 80%, hsl(45 90% 55% / 0.10) 0%, transparent 35%)',
};

const FOCUS: AmbientStyles = {
  base: 'radial-gradient(ellipse at 30% 20%, hsl(230 30% 8%) 0%, hsl(235 25% 5%) 50%, hsl(240 20% 3%) 100%)',
  leaks:
    'radial-gradient(circle at 50% 40%, hsl(230 60% 45% / 0.12) 0%, transparent 55%), ' +
    'radial-gradient(circle at 20% 70%, hsl(250 50% 35% / 0.08) 0%, transparent 40%)',
};

export function getAmbientStyles(isMinor: boolean, focusActive?: boolean): AmbientStyles {
  if (focusActive) return FOCUS;
  return isMinor ? YOUTH : ADULT;
}
