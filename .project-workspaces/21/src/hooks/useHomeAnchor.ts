import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export type HomeAnchor = 'dashboard' | 'companion';

const STORAGE_KEY = 'compani-last-page';

/** Resolve a HomeAnchor to its route path */
export function anchorToRoute(anchor: HomeAnchor, companionMemberId?: string): string {
  switch (anchor) {
    case 'companion': return companionMemberId ? `/chat/${companionMemberId}` : '/my-world';
    case 'dashboard':
    default: return '/my-world';
  }
}

/** Resolve a route to its anchor type */
export function routeToAnchor(pathname: string): HomeAnchor | null {
  if (pathname === '/my-world') return 'dashboard';
  if (pathname === '/' || pathname.startsWith('/chat/')) return 'companion';
  return null;
}

function isValidAnchor(v: unknown): v is HomeAnchor {
  return v === 'dashboard' || v === 'companion';
}

export function getStoredAnchor(): HomeAnchor {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValidAnchor(stored)) return stored;
  } catch {}
  return 'dashboard';
}

/**
 * Automatically tracks the last visited pinnable page.
 * No user action needed — just remembers where you were.
 */
export function useLastPageTracker() {
  const location = useLocation();

  useEffect(() => {
    const anchor = routeToAnchor(location.pathname);
    if (anchor) {
      try { localStorage.setItem(STORAGE_KEY, anchor); } catch {}
    }
  }, [location.pathname]);
}

// Legacy exports for compatibility during transition
/** @deprecated No longer needed — home is automatic */
export function hasChosenHomeAnchor(): boolean { return true; }
/** @deprecated No longer needed */
export function markHomeAnchorChosen(): void {}
