/**
 * Merged template registry. Phase 1: just exposes the unified array.
 * Phase 2 will render this in a single filterable gallery.
 *
 * The existing marketing-studio TEMPLATES + their React renderers
 * (ObsidianTile / GoldFlyer / CinematicStory) are preserved verbatim —
 * we only add the new mode/theme/tag metadata on top.
 */

import type { TemplateMeta } from '../types';

export const STUDIO_TEMPLATES: TemplateMeta[] = [
  // ── Marketing flyer / social templates (existing) ──────────────────────
  {
    id: 'obsidian-tile',
    name: 'Obsidian Social Tile',
    description: 'Square Instagram / Facebook tile with gold-pulse accent.',
    mode: 'social',
    theme: 'obsidian',
    width: 1080,
    height: 1080,
    asset_type: 'social_tile',
    tags: ['square', 'instagram', 'facebook', 'dark'],
  },
  {
    id: 'gold-flyer',
    name: 'Gold Smart Flyer',
    description: 'Print-ready 8.5×11 flyer with embedded QR + headline.',
    mode: 'flyer',
    theme: 'gold',
    width: 1240,
    height: 1754,
    asset_type: 'flyer',
    tags: ['flyer', 'print', 'qr', 'luxe'],
  },
  {
    id: 'cinematic-story',
    name: 'Cinematic Story',
    description: '9:16 vertical for IG / TikTok stories.',
    mode: 'social',
    theme: 'cinematic',
    width: 1080,
    height: 1920,
    asset_type: 'story',
    tags: ['vertical', 'story', 'tiktok', 'reels'],
  },

  // ── Hero / OG ─────────────────────────────────────────────────────────
  {
    id: 'web-hero-cinematic',
    name: 'Cinematic Web Hero',
    description: '1200×630 hero / Open Graph image, cinematic palette.',
    mode: 'hero',
    theme: 'cinematic',
    width: 1200,
    height: 630,
    asset_type: 'hero',
    tags: ['hero', 'og', 'landscape'],
  },

  // ── Logo ──────────────────────────────────────────────────────────────
  {
    id: 'logo-wordmark',
    name: 'Wordmark Logo',
    description: 'Typographic wordmark on transparent background.',
    mode: 'logo',
    theme: 'default',
    width: 1024,
    height: 1024,
    asset_type: 'logo',
    tags: ['logo', 'wordmark'],
  },
  {
    id: 'logo-icon',
    name: 'Icon Mark',
    description: 'Square icon mark suitable for avatars and favicons.',
    mode: 'logo',
    theme: 'default',
    width: 1024,
    height: 1024,
    asset_type: 'logo',
    tags: ['logo', 'icon', 'mark'],
  },
];

export function getTemplate(id: string): TemplateMeta | undefined {
  return STUDIO_TEMPLATES.find((t) => t.id === id);
}

export function templatesByMode(mode: TemplateMeta['mode']): TemplateMeta[] {
  return STUDIO_TEMPLATES.filter((t) => t.mode === mode);
}
