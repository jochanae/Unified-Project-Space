import type { NavigateFunction } from 'react-router-dom';

/**
 * Safe "go back" that falls back to a default route
 * when there's no browser history (direct visit / bookmark).
 */
export function safeGoBack(navigate: NavigateFunction, fallback = '/') {
  if (window.history.length > 1) {
    navigate(-1);
  } else {
    navigate(fallback);
  }
}
