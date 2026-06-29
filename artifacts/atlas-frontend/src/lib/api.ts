// API base URL — resolved once at startup.
// Priority: explicit env var → environment detection → Cloud Run fallback
// - Replit domains (.replit.dev, .replit.app, localhost): same-origin → local Express backend
// - Everywhere else (Lovable preview, axiomsystem.app, etc.): Cloud Run
const CLOUD_RUN = "https://axiom-atlas-689827072865.us-east1.run.app";

function resolveApiBase(): string {
  const explicit = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h === "localhost" || h.endsWith(".replit.dev") || h.endsWith(".replit.app")) {
      return ""; // same-origin → Replit backend
    }
  }
  return CLOUD_RUN;
}

export const API_BASE = resolveApiBase();

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
