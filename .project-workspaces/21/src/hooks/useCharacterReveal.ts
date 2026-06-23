import { useState, useEffect, useRef } from 'react';

/**
 * Smoothly reveals text character-by-character.
 * As `targetText` grows (from streaming), characters are dripped
 * at `charDelay` ms each, producing a typewriter-like effect.
 */
export function useCharacterReveal(
  targetText: string,
  enabled = true,
  charDelay = 12
) {
  const [displayed, setDisplayed] = useState(enabled ? '' : targetText);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setDisplayed(targetText);
      indexRef.current = targetText.length;
      return;
    }

    // If target shrunk (e.g. new message), reset
    if (targetText.length < indexRef.current) {
      indexRef.current = 0;
      setDisplayed('');
    }

    const tick = (time: number) => {
      if (indexRef.current >= targetText.length) {
        rafRef.current = null;
        return;
      }

      if (!lastTimeRef.current) lastTimeRef.current = time;
      const elapsed = time - lastTimeRef.current;

      if (elapsed >= charDelay) {
        // Reveal multiple chars if we're behind
        const charsToAdd = Math.min(
          Math.floor(elapsed / charDelay),
          targetText.length - indexRef.current
        );
        indexRef.current += charsToAdd;
        setDisplayed(targetText.slice(0, indexRef.current));
        lastTimeRef.current = time;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [targetText, enabled, charDelay]);

  // When streaming ends, snap to full text
  useEffect(() => {
    if (!enabled && indexRef.current < targetText.length) {
      setDisplayed(targetText);
      indexRef.current = targetText.length;
    }
  }, [enabled, targetText]);

  return displayed;
}
