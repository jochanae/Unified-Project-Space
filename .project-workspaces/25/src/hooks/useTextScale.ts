// Reader/Notes text scaling — Standard / Large / Extra Large / Pulpit / Presentation.
// Persisted to localStorage and synced across tabs via the storage event.
// Reflow rules keep Cormorant elegant: line-height tightens slightly as size grows;
// letter-spacing relaxes a touch at XL+ so glyphs breathe at distance (pulpit use).
//
// Pulpit (32px) and Presentation (40px) tiers are designed for ministers reading
// from a laptop or iPad on a stand during a live service.

import { useCallback, useEffect, useState } from "react";

export type TextScale = "standard" | "large" | "xlarge" | "pulpit" | "presentation";

const KEY = "sanctumiq:text-scale";
const EVT = "sanctumiq:text-scale:change";

export const TEXT_SCALE_STYLES: Record<
  TextScale,
  {
    fontSize: string;
    lineHeight: string;
    letterSpacing: string;
    label: string;
    px: number;
    pulpit?: boolean;
  }
> = {
  standard: {
    fontSize: "18px",
    lineHeight: "1.85",
    letterSpacing: "0",
    label: "Standard",
    px: 18,
  },
  large: {
    fontSize: "22px",
    lineHeight: "1.7",
    letterSpacing: "0.005em",
    label: "Large",
    px: 22,
  },
  xlarge: {
    fontSize: "26px",
    lineHeight: "1.6",
    letterSpacing: "0.01em",
    label: "Extra Large",
    px: 26,
  },
  pulpit: {
    fontSize: "32px",
    lineHeight: "1.5",
    letterSpacing: "0.012em",
    label: "Pulpit",
    px: 32,
    pulpit: true,
  },
  presentation: {
    fontSize: "40px",
    lineHeight: "1.4",
    letterSpacing: "0.015em",
    label: "Presentation",
    px: 40,
    pulpit: true,
  },
};

const VALID = new Set<TextScale>(["standard", "large", "xlarge", "pulpit", "presentation"]);

function readStored(): TextScale {
  if (typeof window === "undefined") return "standard";
  try {
    const v = localStorage.getItem(KEY);
    if (v && VALID.has(v as TextScale)) return v as TextScale;
  } catch {
    /* ignore */
  }
  return "standard";
}

export function useTextScale() {
  const [scale, setScaleState] = useState<TextScale>(() => readStored());

  // Listen for changes from other components/tabs.
  useEffect(() => {
    const onCustom = (e: Event) => {
      const next = (e as CustomEvent<TextScale>).detail;
      if (next) setScaleState(next);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setScaleState(readStored());
    };
    window.addEventListener(EVT, onCustom as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVT, onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setScale = useCallback((next: TextScale) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    setScaleState(next);
    window.dispatchEvent(new CustomEvent<TextScale>(EVT, { detail: next }));
  }, []);

  return { scale, setScale, style: TEXT_SCALE_STYLES[scale] };
}
