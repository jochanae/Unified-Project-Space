/**
 * resolve-geo.ts — shared geo resolution helper
 *
 * v1: country via Cloudflare's cf-ipcountry header (free, no key, no rate limit).
 * city / region / postal_code are null until a paid IP→ZIP provider is added
 * behind the GEO_PROVIDER_KEY feature flag.
 *
 * Priority rule: form-supplied values always win over IP-derived.
 * Callers should pass formZip / formCity etc. and this module will
 * merge them, with form data taking precedence.
 */

export interface GeoResult {
  country: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
}

/**
 * Resolve geo data from the incoming request.
 * Pass optional form-supplied overrides — they win over IP lookup.
 */
export function resolveGeo(
  req: Request,
  formOverrides: Partial<GeoResult> = {},
): GeoResult {
  // cf-ipcountry is a 2-letter ISO code set by Cloudflare on every request
  // routed through Supabase edge functions. Falls back to null.
  const cfCountry = req.headers.get("cf-ipcountry") ?? null;

  // Sanitize: Cloudflare sends "XX" for unknown/private ranges
  const country = cfCountry && cfCountry !== "XX" ? cfCountry.toUpperCase() : null;

  const base: GeoResult = {
    country,
    city: null,
    region: null,
    postal_code: null,
  };

  // Form-supplied values win — merge in, dropping null/undefined overrides
  return {
    country:     formOverrides.country     ?? base.country,
    city:        formOverrides.city        ?? base.city,
    region:      formOverrides.region      ?? base.region,
    postal_code: formOverrides.postal_code ?? base.postal_code,
  };
}
