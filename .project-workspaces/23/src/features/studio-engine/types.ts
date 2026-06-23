/**
 * Studio Engine — unified types for the consolidated asset generation surface.
 *
 * Phase 1: types + registry + backend.
 * UI surfaces (Phase 2) will import StudioMode / TemplateMeta from here.
 */

export type StudioMode = 'logo' | 'flyer' | 'social' | 'hero' | 'freeform';

export type StudioPlatform = 'instagram' | 'linkedin' | 'twitter';

/** Luxury aesthetic tokens that map to existing brand templates. */
export type StudioTheme = 'obsidian' | 'gold' | 'cinematic' | 'default';

export interface StudioRequest {
  mode: StudioMode;
  prompt: string;
  platform?: StudioPlatform;
  /** Freeform override; ignored for non-freeform modes. */
  width?: number;
  height?: number;
  projectId?: string;
  templateId?: string;
}

export interface StudioResult {
  success: true;
  imageUrl: string;
  storagePath?: string;
  mode: StudioMode;
}

/** Unified template registry entry — merges marketing-studio + logo-generator templates. */
export interface TemplateMeta {
  id: string;
  name: string;
  description: string;
  mode: StudioMode;
  theme: StudioTheme;
  width: number;
  height: number;
  /** Loose tags for the Phase 2 filterable gallery. */
  tags?: string[];
  /** Preserved for backwards compat with marketing-studio AssetRenderer. */
  asset_type?: 'social_tile' | 'flyer' | 'story' | 'qr' | 'copy_deck' | 'logo' | 'hero';
}
