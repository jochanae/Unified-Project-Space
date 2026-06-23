import { createServerFn } from "@tanstack/react-start";
import { getVerseOfTheDay } from "@/lib/verseOfTheDay";

/**
 * Returns today's Reflection — the same daily-rotating verse used in-app.
 * Single source of truth: src/lib/verseOfTheDay.ts.
 *
 * Function name kept (`getPinnedWeeklyReflection`) for backwards compatibility
 * with existing import sites. Behavior is now: today's daily reflection.
 */
export const getPinnedWeeklyReflection = createServerFn({ method: "GET" }).handler(async () => {
  const verse = getVerseOfTheDay();
  return { text: verse.text, ref: verse.ref, version: "KJV" as const };
});
