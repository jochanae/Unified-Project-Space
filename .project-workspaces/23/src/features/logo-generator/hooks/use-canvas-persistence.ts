import { useEffect, useRef, useCallback } from 'react';
import type { CanvasElement } from '../components/LogoCanvas';

const STORAGE_KEY = 'logo-generator-canvas-v2';
const DEBOUNCE_MS = 500;

export interface CanvasState {
  elements: CanvasElement[];
  backgroundColor: string;
  canvasSize: { width: number; height: number };
  referenceImageUrl?: string | null;
}

export function useCanvasPersistence(
  state: CanvasState,
  onRestore: (state: CanvasState) => void,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);

  // Restore once on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const saved: CanvasState = JSON.parse(raw);
      if (saved.elements && saved.elements.length > 0) {
        onRestore(saved);
      }
    } catch {
      // corrupt data — ignore
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save on changes (debounced)
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      try {
        // Don't persist base64 reference images > 2MB to avoid quota issues
        const toSave: CanvasState = {
          ...state,
          referenceImageUrl:
            state.referenceImageUrl && state.referenceImageUrl.length < 2_000_000
              ? state.referenceImageUrl
              : null,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch {
        // quota exceeded — silently skip
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state]);

  const clearSaved = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { clearSaved };
}