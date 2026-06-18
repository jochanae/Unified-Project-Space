// API base — defaults to local Replit backend (relative URLs through proxy).
// Set VITE_API_URL to override (e.g. point at Cloud Run for production).
const DEFAULT_API_BASE = "";
const configuredApiBase = (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== "")
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.VITE_API_BASE_URL !== undefined && import.meta.env.VITE_API_BASE_URL !== "")
    ? import.meta.env.VITE_API_BASE_URL
    : DEFAULT_API_BASE;
export const API_BASE = configuredApiBase.replace(/\/$/, "");

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}

// Auth is cookie-based (atlas-session, httpOnly, sameSite=lax) PLUS a bearer
// token stored in localStorage as "atlas-auth-token" for cross-origin calls
// (Lovable preview → Cloud Run). The global fetch shim in
// src/lib/install-api-fetch.ts attaches both automatically. Most call sites
// can keep using bare fetch("/api/..."); use apiUrl() only for non-fetch URLs
// (window.location redirects, <a href>, OAuth start).
export function getAuthHeaders(): Record<string, string> {
  return {};
}
