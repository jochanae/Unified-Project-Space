// Shared helpers for injecting open-pixel and click-tracking links into the
// rendered MarQ lead follow-up HTML/text. Used by both send-lead-followup
// (manual sends) and process-scheduled-followups (cron sends) so every
// outgoing MarQ follow-up gets a tracking_id-bound pixel + rewritten links.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
export const PIXEL_PATH = `${SUPABASE_URL}/functions/v1/track-followup-open`;
export const CLICK_PATH = `${SUPABASE_URL}/functions/v1/track-followup-click`;

export function buildPixelUrl(trackingId: string): string {
  return `${PIXEL_PATH}?t=${encodeURIComponent(trackingId)}`;
}

export function buildClickUrl(trackingId: string, originalUrl: string): string {
  return `${CLICK_PATH}?t=${encodeURIComponent(trackingId)}&u=${encodeURIComponent(originalUrl)}`;
}

/**
 * Wrap each `https?://…` URL in the body so the recipient hits our redirect
 * endpoint first. Skips our own pixel + tracker URLs to avoid double-wrapping.
 */
export function rewriteLinksInText(body: string, trackingId: string): string {
  if (!body) return body;
  const URL_RE = /(https?:\/\/[^\s<>"')]+)/g;
  return body.replace(URL_RE, (match) => {
    if (match.startsWith(PIXEL_PATH) || match.startsWith(CLICK_PATH)) return match;
    return buildClickUrl(trackingId, match);
  });
}
