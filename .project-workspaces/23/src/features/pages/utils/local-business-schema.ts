/**
 * LocalBusiness JSON-LD schema helpers.
 * Used by Page Builder editor + injected into published HTML for SEO.
 */

export interface DayHours {
  /** Closed if both empty */
  open: string;  // "09:00"
  close: string; // "17:00"
}

export interface LocalBusinessInfo {
  enabled: boolean;
  name: string;
  description?: string;
  telephone?: string;
  email?: string;
  url?: string;
  image?: string;
  priceRange?: string; // "$$"
  /** Free-form business type, defaults to "LocalBusiness" */
  businessType?: string;
  address: {
    street: string;
    city: string;
    region: string;     // state/province
    postalCode: string;
    country: string;    // ISO code preferred, e.g. "US"
  };
  geo?: {
    latitude: string;
    longitude: string;
  };
  /** Mon..Sun */
  hours?: Record<DayKey, DayHours>;
  sameAs?: string[]; // social URLs
}

export const DAY_KEYS = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'] as const;
export type DayKey = typeof DAY_KEYS[number];

export const DAY_LABELS: Record<DayKey, string> = {
  mo: 'Monday', tu: 'Tuesday', we: 'Wednesday', th: 'Thursday',
  fr: 'Friday', sa: 'Saturday', su: 'Sunday',
};

const SCHEMA_DAY: Record<DayKey, string> = {
  mo: 'Monday', tu: 'Tuesday', we: 'Wednesday', th: 'Thursday',
  fr: 'Friday', sa: 'Saturday', su: 'Sunday',
};

export function emptyLocalBusiness(): LocalBusinessInfo {
  return {
    enabled: false,
    name: '',
    description: '',
    telephone: '',
    email: '',
    url: '',
    image: '',
    priceRange: '',
    businessType: 'LocalBusiness',
    address: { street: '', city: '', region: '', postalCode: '', country: '' },
    geo: { latitude: '', longitude: '' },
    hours: DAY_KEYS.reduce((acc, k) => {
      acc[k] = { open: '', close: '' };
      return acc;
    }, {} as Record<DayKey, DayHours>),
    sameAs: [],
  };
}

/** Build a JSON-LD object. Returns null if disabled or missing required fields. */
export function buildLocalBusinessJsonLd(info: LocalBusinessInfo | null | undefined): object | null {
  if (!info || !info.enabled) return null;
  if (!info.name?.trim()) return null;

  const jsonLd: any = {
    '@context': 'https://schema.org',
    '@type': info.businessType?.trim() || 'LocalBusiness',
    name: info.name.trim(),
  };

  if (info.description?.trim()) jsonLd.description = info.description.trim();
  if (info.telephone?.trim()) jsonLd.telephone = info.telephone.trim();
  if (info.email?.trim()) jsonLd.email = info.email.trim();
  if (info.url?.trim()) jsonLd.url = info.url.trim();
  if (info.image?.trim()) jsonLd.image = info.image.trim();
  if (info.priceRange?.trim()) jsonLd.priceRange = info.priceRange.trim();

  const addr = info.address;
  if (addr && (addr.street || addr.city || addr.region || addr.postalCode || addr.country)) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      ...(addr.street && { streetAddress: addr.street.trim() }),
      ...(addr.city && { addressLocality: addr.city.trim() }),
      ...(addr.region && { addressRegion: addr.region.trim() }),
      ...(addr.postalCode && { postalCode: addr.postalCode.trim() }),
      ...(addr.country && { addressCountry: addr.country.trim() }),
    };
  }

  if (info.geo?.latitude && info.geo?.longitude) {
    const lat = parseFloat(info.geo.latitude);
    const lng = parseFloat(info.geo.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      jsonLd.geo = { '@type': 'GeoCoordinates', latitude: lat, longitude: lng };
    }
  }

  if (info.hours) {
    const spec: any[] = [];
    for (const k of DAY_KEYS) {
      const h = info.hours[k];
      if (h && h.open && h.close) {
        spec.push({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: SCHEMA_DAY[k],
          opens: h.open,
          closes: h.close,
        });
      }
    }
    if (spec.length) jsonLd.openingHoursSpecification = spec;
  }

  const same = (info.sameAs || []).map(s => s.trim()).filter(Boolean);
  if (same.length) jsonLd.sameAs = same;

  return jsonLd;
}

/** Render a <script type="application/ld+json"> tag, or empty string if no data. */
export function renderLocalBusinessScriptTag(info: LocalBusinessInfo | null | undefined): string {
  const obj = buildLocalBusinessJsonLd(info);
  if (!obj) return '';
  // Escape </ to prevent breaking out of <script>
  const json = JSON.stringify(obj).replace(/<\//g, '<\\/');
  return `<script type="application/ld+json">${json}</script>`;
}
