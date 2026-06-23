// API base URL. Empty string = same-origin (Replit proxy routes /api/* to
// the local Express backend). Override at build time with VITE_API_URL when
// pointing at a different backend (e.g. Cloud Run for production builds).
const DEFAULT_API_BASE = "";
const configuredApiBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE;
export const API_BASE = configuredApiBase.replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

// Auth is cookie-based (atlas-session, httpOnly) PLUS a bearer token stored
// in localStorage as "atlas-auth-token". The global fetch shim in
// src/lib/install-api-fetch.ts attaches both automatically. Most call sites
// can keep using bare fetch("/api/..."); use apiUrl() only for non-fetch URLs
// (window.location redirects, <a href>, OAuth start).
export function getAuthHeaders(): Record<string, string> {
  return {};
}
