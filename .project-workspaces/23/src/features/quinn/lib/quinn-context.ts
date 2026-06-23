import { useEffect, useState } from 'react';

/**
 * Lightweight cross-feature bridge so panels (Geo Insights, etc.)
 * can hand context + actions to the MarQ HUD without prop-drilling.
 */

export interface QuinnGeoContext {
  country?: string;
  region?: string;
  city?: string;
  postal_code?: string;
}

let currentGeo: QuinnGeoContext | null = null;
const GEO_EVENT = 'quinn:geo-context';
const OPEN_EVENT = 'quinn:open-hud';

export function setQuinnGeoContext(ctx: QuinnGeoContext | null) {
  const hasAny = ctx && (ctx.country || ctx.region || ctx.city || ctx.postal_code);
  currentGeo = hasAny ? ctx : null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(GEO_EVENT, { detail: currentGeo }));
  }
}

export function getQuinnGeoContext(): QuinnGeoContext | null {
  return currentGeo;
}

export function describeGeoContext(ctx: QuinnGeoContext | null | undefined): string {
  if (!ctx) return '';
  const parts: string[] = [];
  if (ctx.country) parts.push(`Country: ${ctx.country}`);
  if (ctx.region) parts.push(`Region: ${ctx.region}`);
  if (ctx.city) parts.push(`City: ${ctx.city}`);
  if (ctx.postal_code) parts.push(`ZIP: ${ctx.postal_code}`);
  return parts.join(' · ');
}

export function useQuinnGeoContext(): QuinnGeoContext | null {
  const [ctx, setCtx] = useState<QuinnGeoContext | null>(currentGeo);
  useEffect(() => {
    const handler = (e: Event) => setCtx((e as CustomEvent).detail ?? null);
    window.addEventListener(GEO_EVENT, handler);
    return () => window.removeEventListener(GEO_EVENT, handler);
  }, []);
  return ctx;
}

/**
 * Opens the MarQ HUD with an optional prefilled prompt.
 * GlobalQuinnFooter listens for this event.
 */
export function openQuinnHUD(prefillPrompt?: string) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { prefillPrompt } }));
}

export const QUINN_OPEN_EVENT = OPEN_EVENT;
