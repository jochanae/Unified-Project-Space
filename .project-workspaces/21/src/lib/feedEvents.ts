import { supabase } from '@/integrations/supabase/client';

/**
 * Fires the event-driven feed post generator.
 * Called from plan completion, mood logging, milestones, etc.
 * 
 * Rate-limited server-side: max 4 event posts/day.
 */
export async function fireEventPost(opts: {
  userId: string;
  eventType: 'plan_complete' | 'mood_log' | 'milestone' | 'streak' | 'goal_complete' | 'journal' | 'rhythm_checkin';
  eventLabel: string;
  eventContext?: string;
}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

    // Fire and forget — don't block the UI
    // Replaced by fireEdgeFunction — see edgeFunction.ts
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-event-post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({
        userId: opts.userId,
        eventType: opts.eventType,
        eventLabel: opts.eventLabel,
        eventContext: opts.eventContext || '',
      }),
    }).catch((e) => console.error('[EventPost] Failed:', e));
  } catch (e) {
    console.error('[EventPost] Error:', e);
  }
}
