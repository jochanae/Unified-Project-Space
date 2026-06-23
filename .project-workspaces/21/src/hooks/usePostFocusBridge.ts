import { useSyncExternalStore } from 'react';

/**
 * Post-Focus Bridge
 * ─────────────────
 * A tiny global store that surfaces a "Return to your thoughts" pill on the
 * dashboard when the Sanctuary (Focus Mode) exit ceremony completes AND
 * a pending Private Insight exists.
 *
 * Reset triggers (handled by callers):
 *  - User taps the pill (consumes → navigates)
 *  - User dismisses the pill manually
 *  - Insight is viewed/expired (clearPrivateInsight already wipes storage)
 */

const STORAGE_KEY = 'compani-post-focus-bridge';

let visible = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot() {
  return visible;
}

function getServerSnapshot() {
  return false;
}

/** Show the pill (called after Sanctuary Exit dismiss, gated on hasPendingInsight). */
export function showPostFocusBridge() {
  if (visible) return;
  visible = true;
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch { /* noop */ }
  emit();
}

/** Hide the pill (consumed or dismissed). */
export function hidePostFocusBridge() {
  if (!visible) return;
  visible = false;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* noop */ }
  emit();
}

// Restore on page reload within the same session
try {
  if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY) === '1') {
    visible = true;
  }
} catch { /* noop */ }

export function usePostFocusBridge() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
