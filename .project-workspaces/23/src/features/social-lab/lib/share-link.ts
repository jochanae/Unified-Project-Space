import { supabase } from '@/integrations/supabase/client';

export type SocialShareTarget = 'instagram' | 'twitter' | 'facebook' | 'tiktok' | 'linkedin';

function slugifyCampaign(input: string | null | undefined, fallback = 'campaign'): string {
  const base = (input ?? fallback).toString().toLowerCase().trim();
  return base.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || fallback;
}

interface BuildArgs {
  platform: SocialShareTarget;
  campaign?: string | null;
  projectId?: string | null;
  pageId?: string | null;
}

/**
 * Build a tracked share URL pointing at the user's funnel page (if available),
 * with UTMs attached. Falls back to site origin when no page is linked yet.
 */
export async function buildTrackedShareUrl({
  platform,
  campaign,
  pageId,
}: BuildArgs): Promise<string> {
  const origin = window.location.origin;
  let baseUrl = origin;

  if (pageId) {
    try {
      const { data } = await supabase
        .from('pages')
        .select('slug')
        .eq('id', pageId)
        .maybeSingle();
      if (data?.slug) {
        baseUrl = `${origin}/p/${data.slug}`;
      }
    } catch {
      /* fall back to origin */
    }
  }

  const params = new URLSearchParams({
    utm_source: platform,
    utm_medium: 'social',
    utm_campaign: slugifyCampaign(campaign),
  });

  return `${baseUrl}?${params.toString()}`;
}

/** True for iOS/Android user agents — used to attempt app deep links. */
export function isMobileUA(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Open Instagram. On mobile we try the camera deep link (best place to paste
 * a caption for a new Story/Reel). On desktop we open instagram.com.
 */
export function openInstagram(): void {
  if (isMobileUA()) {
    const fallback = window.setTimeout(() => {
      window.open('https://www.instagram.com/', '_blank');
    }, 600);
    try {
      window.location.href = 'instagram://camera';
      window.addEventListener(
        'pagehide',
        () => window.clearTimeout(fallback),
        { once: true },
      );
    } catch {
      window.clearTimeout(fallback);
      window.open('https://www.instagram.com/', '_blank');
    }
    return;
  }
  window.open('https://www.instagram.com/', '_blank');
}

/**
 * Open X/Twitter Web Intent with caption + tracked URL pre-filled.
 * User just clicks Post — no copy/paste needed.
 */
export function openTwitterIntent(text: string, url: string): void {
  // X imposes a 280 char limit; reserve room for the URL (t.co normalizes ~23 chars) + 2 newlines.
  const maxText = 280 - 23 - 2;
  const trimmed = text.length > maxText ? text.slice(0, maxText - 1).trimEnd() + '…' : text;
  const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(trimmed)}&url=${encodeURIComponent(url)}`;
  window.open(intent, '_blank', 'noopener,noreferrer');
}

/**
 * Open Facebook sharer (link only — FB strips pre-filled `quote` text per policy).
 * Caller should copy caption to clipboard first.
 */
export function openFacebookSharer(url: string): void {
  const sharer = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(sharer, '_blank', 'noopener,noreferrer,width=600,height=600');
}

/**
 * Open TikTok. No web share URL exists; mobile gets the app deep link, desktop
 * gets the upload page. Caller must copy caption to clipboard first.
 */
export function openTikTok(): void {
  if (isMobileUA()) {
    const fallback = window.setTimeout(() => {
      window.open('https://www.tiktok.com/upload', '_blank');
    }, 600);
    try {
      window.location.href = 'snssdk1233://';
      window.addEventListener(
        'pagehide',
        () => window.clearTimeout(fallback),
        { once: true },
      );
    } catch {
      window.clearTimeout(fallback);
      window.open('https://www.tiktok.com/upload', '_blank');
    }
    return;
  }
  window.open('https://www.tiktok.com/upload', '_blank');
}

