// Persists the user's preferred Deep Dive destination (ChatGPT or Perplexity)
// for the version-chip launcher. The toggle is shown prominently above the
// chips so Perplexity is never hidden behind a silent default — this module
// just remembers which one the user picked last.

import { useEffect, useState } from "react";
import type { DeepDiveProvider } from "@/lib/deepDive";

const STORAGE_KEY = "sanctumiq.deepDive.provider";
const DEFAULT_PROVIDER: DeepDiveProvider = "ChatGPT";

function readStoredProvider(): DeepDiveProvider {
  if (typeof window === "undefined") return DEFAULT_PROVIDER;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "ChatGPT" || raw === "Perplexity") return raw;
  } catch {
    // localStorage may be unavailable (private mode, SSR) — fall through.
  }
  return DEFAULT_PROVIDER;
}

function writeStoredProvider(provider: DeepDiveProvider): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, provider);
  } catch {
    // Ignore quota / disabled storage.
  }
}

/**
 * React hook that returns the persisted Deep Dive provider preference and a
 * setter that writes through to localStorage. Multiple chip rows on the same
 * page stay in sync via a custom event broadcast on change.
 */
export function useDeepDiveProviderPref(): [DeepDiveProvider, (next: DeepDiveProvider) => void] {
  const [provider, setProvider] = useState<DeepDiveProvider>(DEFAULT_PROVIDER);

  useEffect(() => {
    setProvider(readStoredProvider());
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<DeepDiveProvider>).detail;
      if (detail === "ChatGPT" || detail === "Perplexity") {
        setProvider(detail);
      }
    };
    window.addEventListener("sanctumiq:deepDiveProviderChanged", handler);
    return () => window.removeEventListener("sanctumiq:deepDiveProviderChanged", handler);
  }, []);

  const update = (next: DeepDiveProvider) => {
    setProvider(next);
    writeStoredProvider(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("sanctumiq:deepDiveProviderChanged", { detail: next }));
    }
  };

  return [provider, update];
}
