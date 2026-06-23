export type AssetType = 'social_tile' | 'flyer' | 'story' | 'qr' | 'copy_deck';

export type TemplateId = 'obsidian-tile' | 'gold-flyer' | 'cinematic-story';

export type VibeId = 'obsidian' | 'pearl' | 'vibrant';

/** Which guest fields the RSVP form collects. Smart default: name + phone. */
export interface RsvpFieldConfig {
  name: boolean;
  phone: boolean;
  email: boolean;
}

export const DEFAULT_RSVP_FIELDS: RsvpFieldConfig = {
  name: true,
  phone: true,
  email: false,
};

export interface BrandKit {
  brand_name?: string;
  tagline?: string;
  logo_url?: string;
  headshot_url?: string;
  accent_hex?: string;
  heading_font?: string;
  voice?: string;
  mood?: string;
}

export interface AssetConfig {
  headline: string;
  subhead?: string;
  cta?: string;
  url?: string;
  brand: BrandKit;
  /** Optional user-uploaded media (image or video frame poster) used as the canvas background. */
  media_url?: string;
  /** Distinguishes how the renderer treats the media in preview. Export always rasterizes a frame. */
  media_type?: 'image' | 'video';
  /** Style preset that drives palette + glassmorphism overlay. */
  vibe?: VibeId;
  // ─── Phase 2: Living Flyer / RSVP Bridge ─────────────────────────────────
  /** Configurable RSVP fields. Falls back to DEFAULT_RSVP_FIELDS. */
  rsvp_fields?: RsvpFieldConfig;
  /** Free-text label shown on the success card after submit. */
  success_message?: string;
  /** ISO date for "Add to Calendar" button (optional). */
  event_date?: string;
  /** Time string for the calendar invite (optional). */
  event_time?: string;
  /** Plain-text address for "Get Directions" + calendar location (optional). */
  event_location?: string;
  /** Display label for the event in the public funnel header. */
  event_title?: string;
  /** Source tag attached to leads created from this funnel (e.g. "Son's Wedding"). */
  source_tag?: string;
}

export interface MarketingAssetRow {
  id: string;
  org_id: string;
  project_id: string | null;
  created_by: string | null;
  asset_type: AssetType;
  template_id: TemplateId;
  title: string;
  config: AssetConfig;
  image_url: string | null;
  storage_path: string | null;
  share_token: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateMeta {
  id: TemplateId;
  name: string;
  asset_type: AssetType;
  width: number;
  height: number;
  description: string;
}

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'obsidian-tile',
    name: 'Obsidian Social Tile',
    asset_type: 'social_tile',
    width: 1080,
    height: 1080,
    description: 'Square Instagram / Facebook tile with gold-pulse accent.',
  },
  {
    id: 'gold-flyer',
    name: 'Gold Smart Flyer',
    asset_type: 'flyer',
    width: 1240,
    height: 1754,
    description: 'Print-ready 8.5×11 flyer with embedded QR + headline.',
  },
  {
    id: 'cinematic-story',
    name: 'Cinematic Story',
    asset_type: 'story',
    width: 1080,
    height: 1920,
    description: '9:16 vertical for IG / TikTok stories.',
  },
];

export interface VibeMeta {
  id: VibeId;
  name: string;
  tagline: string;
  /** CSS background applied to the base canvas when no media is uploaded. */
  background: string;
  /** Glass overlay panel background (rgba). */
  glass: string;
  /** Glass border color. */
  glassBorder: string;
  /** Default accent color for headline ribbon, CTA button, brand name. */
  accent: string;
  /** Primary text color. */
  text: string;
  /** Secondary / subhead text color. */
  textMuted: string;
  /** Eyebrow brand label color. */
  eyebrow: string;
  /** CTA button text color (contrast with accent). */
  ctaText: string;
}

export const VIBES: Record<VibeId, VibeMeta> = {
  obsidian: {
    id: 'obsidian',
    name: 'Obsidian',
    tagline: 'Pro · executive',
    background: 'radial-gradient(circle at 30% 20%, #1a1a2e 0%, #0a0a0f 60%, #050508 100%)',
    glass: 'rgba(10, 10, 15, 0.55)',
    glassBorder: 'rgba(212, 175, 55, 0.35)',
    accent: '#D4AF37',
    text: '#fafafa',
    textMuted: 'rgba(250,250,250,0.72)',
    eyebrow: '#D4AF37',
    ctaText: '#0a0a0f',
  },
  pearl: {
    id: 'pearl',
    name: 'Pearl',
    tagline: 'Elegant · wedding',
    background: 'linear-gradient(160deg, #f8f3ec 0%, #efe6d8 50%, #e3d4be 100%)',
    glass: 'rgba(255, 252, 246, 0.55)',
    glassBorder: 'rgba(180, 142, 96, 0.35)',
    accent: '#b48e60',
    text: '#2a2118',
    textMuted: 'rgba(42, 33, 24, 0.7)',
    eyebrow: '#8a6a3f',
    ctaText: '#fffdf8',
  },
  vibrant: {
    id: 'vibrant',
    name: 'Vibrant',
    tagline: 'Social · party',
    background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 35%, #e84393 70%, #6c5ce7 100%)',
    glass: 'rgba(20, 10, 35, 0.4)',
    glassBorder: 'rgba(255, 255, 255, 0.4)',
    accent: '#ffeb3b',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.85)',
    eyebrow: '#ffeb3b',
    ctaText: '#1a1a2e',
  },
};

export const VIBE_LIST: VibeMeta[] = [VIBES.obsidian, VIBES.pearl, VIBES.vibrant];

/** Build an .ics download URL (data URI) for a Living Flyer event. */
export function buildIcsDataUrl(opts: {
  title: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  location?: string;
  description?: string;
}): string | null {
  if (!opts.date) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = new Date(`${opts.date}T${opts.time || '18:00'}:00`);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = (dt: Date) =>
    `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(
      dt.getUTCHours(),
    )}${pad(dt.getUTCMinutes())}00Z`;
  const end = new Date(d.getTime() + 2 * 60 * 60 * 1000);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//IntoIQ//Living Flyer//EN',
    'BEGIN:VEVENT',
    `UID:${crypto.randomUUID()}@intoiq.app`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(d)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${(opts.title || 'Event').replace(/\n/g, ' ')}`,
    opts.location ? `LOCATION:${opts.location.replace(/\n/g, ' ')}` : '',
    opts.description ? `DESCRIPTION:${opts.description.replace(/\n/g, ' ')}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}
