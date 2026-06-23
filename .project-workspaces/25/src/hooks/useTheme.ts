// Sanctuary theme switcher — Obsidian (default) ↔ Parchment.
// Stores choice in localStorage, syncs across tabs, toggles `.parchment`
// class on <html>. Obsidian remains the implicit default (no class).
//
// IMPORTANT: SSR-safe. We only touch `window` / `document` inside effects,
// and the initial state mirrors what's in localStorage on mount to avoid
// hydration mismatches like the ones we just fixed in Offline/Service badges.

import { useCallback, useEffect, useState } from "react";

export type SanctuaryTheme = "obsidian" | "parchment";

const KEY = "sanctumiq:theme";
const EVT = "sanctumiq:theme:change";

function readStored(): SanctuaryTheme {
  if (typeof window === "undefined") return "obsidian";
  try {
    const v = localStorage.getItem(KEY);
    if (v === "parchment" || v === "obsidian") return v;
  } catch {
    /* ignore */
  }
  return "obsidian";
}

function applyToDocument(theme: SanctuaryTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "parchment") root.classList.add("parchment");
  else root.classList.remove("parchment");
}

export function useTheme() {
  // Start with "obsidian" on both server + first client render so SSR markup
  // matches. The real value is hydrated in the effect below.
  const [theme, setThemeState] = useState<SanctuaryTheme>("obsidian");

  useEffect(() => {
    const stored = readStored();
    setThemeState(stored);
    applyToDocument(stored);
  }, []);

  useEffect(() => {
    const onCustom = (e: Event) => {
      const next = (e as CustomEvent<SanctuaryTheme>).detail;
      if (next === "obsidian" || next === "parchment") {
        setThemeState(next);
        applyToDocument(next);
      }
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) {
        const next = readStored();
        setThemeState(next);
        applyToDocument(next);
      }
    };
    window.addEventListener(EVT, onCustom as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(EVT, onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setTheme = useCallback((next: SanctuaryTheme) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    applyToDocument(next);
    setThemeState(next);
    window.dispatchEvent(new CustomEvent<SanctuaryTheme>(EVT, { detail: next }));
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "obsidian" ? "parchment" : "obsidian");
  }, [theme, setTheme]);

  return { theme, setTheme, toggle };
}
