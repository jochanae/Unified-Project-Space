/**
 * Resume event tracking — fire-and-forget logger for the Reader's
 * "Resumed where you left off" flow.
 *
 * Three event types:
 *   - "shown"     — toast appeared after server hydrate restored a position
 *   - "accepted"  — toast auto-dismissed without the user pressing Undo
 *   - "undo"      — user pressed Undo to revert to their previous position
 *
 * All writes are silent: failures are logged but never thrown so the Reader
 * UX is unaffected.
 */

import { supabase } from "@/integrations/supabase/client";

export type ResumeEventType = "shown" | "accepted" | "undo";

export type ResumeEventPayload = {
  type: ResumeEventType;
  userId: string;
  book?: string;
  chapter?: number;
  verse?: number | null;
  version?: string;
  metadata?: Record<string, unknown>;
};

export function trackResumeEvent(payload: ResumeEventPayload): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  void (supabase as any)
    .from("reader_resume_events")
    .insert({
      user_id: payload.userId,
      event_type: payload.type,
      book: payload.book ?? null,
      chapter: payload.chapter ?? null,
      verse: payload.verse ?? null,
      version: payload.version ?? null,
      metadata: payload.metadata ?? {},
    })
    .then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn("[resume-events] insert failed:", error.message);
    });
}
