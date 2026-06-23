/**
 * useHighlightsEnabled — global on/off switch for visual highlights.
 *
 * Gates two surfaces:
 *   1. <mark> tokens inside Quick Search results
 *   2. Saved verse highlights overlay in the reader
 *
 * Persists in localStorage; defaults to ON.
 */

import { useCallback, useEffect, useState } from "react";

const KEY = "sanctumiq:highlights-enabled";
const EVENT = "sanctumiq:highlights-enabled-change";

function read(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

export function useHighlightsEnabled(): [boolean, (next: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(true);

  useEffect(() => {
    setEnabled(read());
    const onChange = () => setEnabled(read());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const set = useCallback((next: boolean) => {
    try {
      window.localStorage.setItem(KEY, String(next));
    } catch {
      /* no-op */
    }
    setEnabled(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return [enabled, set];
}
