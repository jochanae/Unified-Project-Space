export type SocialPlatform = 'instagram' | 'linkedin' | 'tiktok' | 'twitter' | 'facebook';
export type SocialContentType = 'post' | 'reel' | 'story' | 'article' | 'short' | 'thread';
export type SocialStatus = 'draft' | 'scheduled' | 'posted' | 'archived';
export type GenerationMode = 'deep_dive' | 'spray_and_pray';
export type NarrativeRole = 'Hook' | 'Depth' | 'Proof' | 'Friction' | 'Bridge';

export interface SocialCampaign {
  id: string;
  org_id: string;
  project_id: string | null;
  created_by: string | null;
  platform: SocialPlatform;
  content_type: SocialContentType;
  hook: string;
  body: string;
  hashtags: string[];
  cta: string | null;
  media_suggestion: string | null;
  audio_suggestion: string | null;
  signal_source_id: string | null;
  scheduled_at: string | null;
  posted_at: string | null;
  status: SocialStatus;
  refinement_count: number;
  created_at: string;
  updated_at: string;
  // Deep Dive narrative grouping
  campaign_id: string | null;
  campaign_theme: string | null;
  narrative_day: number | null;
  narrative_role: NarrativeRole | null;
  generation_mode: GenerationMode;
  /** Optional AI-generated visual for this post. */
  image_url?: string | null;
  /** Funnel page id created from this post via the inline next-step prompt. */
  created_page_id?: string | null;
}

export const PLATFORM_META: Record<SocialPlatform, { label: string; icon: string; accent: string }> = {
  instagram: { label: 'Instagram', icon: '📸', accent: 'from-pink-500 to-purple-500' },
  linkedin: { label: 'LinkedIn', icon: '💼', accent: 'from-sky-600 to-blue-700' },
  tiktok: { label: 'TikTok', icon: '🎵', accent: 'from-rose-500 to-cyan-400' },
  twitter: { label: 'X / Twitter', icon: '𝕏', accent: 'from-zinc-700 to-zinc-900' },
  facebook: { label: 'Facebook', icon: '📘', accent: 'from-blue-600 to-blue-800' },
};

export const NARRATIVE_ROLE_META: Record<NarrativeRole, { label: string; description: string; tone: string }> = {
  Hook: { label: 'Hook', description: 'Paradigm shift — stop the scroll', tone: 'text-primary' },
  Depth: { label: 'Depth', description: 'Why it matters / how it works', tone: 'text-cyan-400' },
  Proof: { label: 'Proof', description: 'Story or case study', tone: 'text-emerald-400' },
  Friction: { label: 'Friction', description: 'Disarm the #1 objection', tone: 'text-amber-400' },
  Bridge: { label: 'Bridge', description: 'Pivot toward action', tone: 'text-rose-400' },
};
