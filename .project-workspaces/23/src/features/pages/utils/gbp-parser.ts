/**
 * Lightweight Google Business Profile auto-fill parser.
 *
 * We can't call the official GBP API without per-user OAuth, so this helper
 * accepts either:
 *  1) A Google Maps / Business profile URL — we extract the place name from
 *     the URL slug as a best-effort hint.
 *  2) A free-form paste of the profile (name on first line, then address
 *     lines, with a phone number anywhere) — this is what users get when
 *     they "Copy" their listing from Google.
 *
 * Returns a partial LocalBusinessInfo the editor can merge in.
 */
import type { LocalBusinessInfo } from './local-business-schema';

export interface ParsedGBP {
  name?: string;
  telephone?: string;
  address?: Partial<LocalBusinessInfo['address']>;
  url?: string;
  geo?: { latitude: string; longitude: string };
}

const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const COORD_RE = /@(-?\d+\.\d+),(-?\d+\.\d+)/;

function extractFromMapsUrl(input: string): ParsedGBP {
  const out: ParsedGBP = {};
  try {
    const url = new URL(input);
    if (!/google\.[a-z.]+/i.test(url.hostname)) return out;

    // /maps/place/Some+Name/@lat,lng,...
    const placeMatch = url.pathname.match(/\/place\/([^/]+)/);
    if (placeMatch) {
      out.name = decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')).trim();
    }
    const coord = input.match(COORD_RE);
    if (coord) {
      out.geo = { latitude: coord[1], longitude: coord[2] };
    }
    out.url = input;
  } catch {
    /* not a URL */
  }
  return out;
}

function extractFromText(text: string): ParsedGBP {
  const out: ParsedGBP = {};
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return out;

  // Phone — anywhere
  for (const line of lines) {
    const m = line.match(PHONE_RE);
    if (m) {
      out.telephone = m[1].trim();
      break;
    }
  }

  // First non-phone line ≈ business name
  const nameLine = lines.find((l) => !PHONE_RE.test(l));
  if (nameLine && nameLine.length < 80) out.name = nameLine;

  // Address: try to find a line that looks like "Street, City, ST 12345"
  const addrLine = lines.find(
    (l) =>
      /\d/.test(l) &&
      /,/.test(l) &&
      !PHONE_RE.test(l) &&
      l !== nameLine &&
      l.length < 200
  );
  if (addrLine) {
    const parts = addrLine.split(',').map((p) => p.trim());
    const address: Partial<LocalBusinessInfo['address']> = {};
    if (parts[0]) address.street = parts[0];
    if (parts[1]) address.city = parts[1];
    if (parts[2]) {
      // "ST 12345" or "ST"
      const m = parts[2].match(/^([A-Za-z .]+)\s*(\d[\d-]*)?$/);
      if (m) {
        address.region = (m[1] || '').trim();
        if (m[2]) address.postalCode = m[2].trim();
      } else {
        address.region = parts[2];
      }
    }
    if (parts[3]) address.country = parts[3];
    out.address = address;
  }

  return out;
}

/** Public entry point — accepts a Maps URL, raw paste, or a mix. */
export function parseGoogleBusinessProfile(input: string): ParsedGBP {
  const trimmed = (input || '').trim();
  if (!trimmed) return {};

  const fromUrl = /^https?:\/\//i.test(trimmed) ? extractFromMapsUrl(trimmed) : {};
  const fromText = extractFromText(trimmed);

  // Merge — text takes precedence for name/phone (more specific), URL fills geo/url.
  return {
    ...fromUrl,
    ...fromText,
    address: { ...(fromUrl.address || {}), ...(fromText.address || {}) },
    geo: fromText.geo || fromUrl.geo,
    url: fromText.url || fromUrl.url,
  };
}

/** Apply a parsed GBP onto an existing profile (only fills empty fields). */
export function mergeParsedIntoProfile(
  current: LocalBusinessInfo,
  parsed: ParsedGBP
): LocalBusinessInfo {
  const next: LocalBusinessInfo = {
    ...current,
    enabled: true,
    name: current.name?.trim() ? current.name : parsed.name || current.name,
    telephone: current.telephone?.trim() ? current.telephone : parsed.telephone || current.telephone,
    url: current.url?.trim() ? current.url : parsed.url || current.url,
    address: {
      street: current.address.street || parsed.address?.street || '',
      city: current.address.city || parsed.address?.city || '',
      region: current.address.region || parsed.address?.region || '',
      postalCode: current.address.postalCode || parsed.address?.postalCode || '',
      country: current.address.country || parsed.address?.country || '',
    },
    geo:
      current.geo?.latitude && current.geo?.longitude
        ? current.geo
        : parsed.geo || current.geo,
  };
  return next;
}
