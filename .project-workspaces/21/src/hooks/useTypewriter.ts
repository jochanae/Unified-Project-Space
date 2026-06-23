import { useState, useEffect } from 'react';

/**
 * Reveals text word-by-word with a configurable delay.
 * Returns the visible portion of the string and a `done` flag.
 */
export function useTypewriter(
  text: string,
  /** ms between each word appearing */
  speed = 80,
  /** whether the effect is active */
  enabled = true
) {
  const words = text.split(' ');
  const [visibleCount, setVisibleCount] = useState(enabled ? 0 : words.length);

  useEffect(() => {
    if (!enabled) {
      setVisibleCount(words.length);
      return;
    }
    setVisibleCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setVisibleCount(i);
      if (i >= words.length) clearInterval(interval);
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, enabled, words.length]);

  return {
    visibleText: words.slice(0, visibleCount).join(' '),
    done: visibleCount >= words.length,
  };
}
