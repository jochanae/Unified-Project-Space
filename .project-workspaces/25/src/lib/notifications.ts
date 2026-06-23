/**
 * Notifications · Core types, philosophy, and pure helpers
 *
 * This module is the single source of truth for the SanctumIQ notification
 * philosophy: "Never interrupt — only accompany."
 *
 * Three layers:
 *   sacred    — rhythm/context/utility (Selah, Service, Deep Dive). Default on.
 *   personal  — gentle memory (continue reading, revisit highlight). Opt-in.
 *   community — pastor / church messages. Opt-in.
 *
 * Three modes (user posture):
 *   sanctuary — only sacred (the default)
 *   guided    — sacred + personal
 *   connected — all three
 *
 * Plus a master `enabled` toggle ("Silence the Sanctuary") and a quiet-hours
 * window during which notifications are suppressed (still recorded, but no
 * toast/push).
 */

export type NotificationCategory = "sacred" | "personal" | "community";
export type NotificationMode = "sanctuary" | "guided" | "connected";
export type NotificationPriority = "low" | "normal";

export interface NotificationSettings {
  user_id: string;
  mode: NotificationMode;
  enabled: boolean;
  quiet_hours_start: number; // 0-23
  quiet_hours_end: number; // 0-23
  /** 0 = Sun … 6 = Sat. null = no manual service window. */
  service_window_day: number | null;
  /** 0-23. Required when service_window_day is set. */
  service_window_start: number | null;
  /** 0-23. Required when service_window_day is set. */
  service_window_end: number | null;
}

export interface SanctumNotification {
  id: string;
  user_id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  silent: boolean;
  priority: NotificationPriority;
  action_url: string | null;
  scheduled_for: string | null;
  delivered_at: string | null;
  read_at: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export const DEFAULT_SETTINGS: Omit<NotificationSettings, "user_id"> = {
  mode: "sanctuary",
  enabled: true,
  quiet_hours_start: 21,
  quiet_hours_end: 7,
  service_window_day: null,
  service_window_start: null,
  service_window_end: null,
};

/**
 * Decides whether a category is permitted under a given posture.
 * Mirrors the backend rule (kept in sync intentionally — both sides
 * enforce the same philosophy).
 */
export function isCategoryAllowed(category: NotificationCategory, mode: NotificationMode): boolean {
  if (mode === "sanctuary") return category === "sacred";
  if (mode === "guided") return category !== "community";
  return true;
}

/**
 * Quiet-hours check. Window can wrap midnight (e.g. 21 → 7).
 * `now` is injected for testability.
 */
export function isQuietHours(start: number, end: number, now: Date = new Date()): boolean {
  if (start === end) return false;
  const hour = now.getHours();
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/**
 * Manual Service Window check — true when `now` falls inside the user's
 * configured weekly service window (e.g. Sunday 10–11). Wraps midnight if
 * end <= start. Returns false when any field is null.
 */
export function isInServiceWindow(
  day: number | null,
  start: number | null,
  end: number | null,
  now: Date = new Date(),
): boolean {
  if (day === null || start === null || end === null) return false;
  if (start === end) return false;
  // For wrapping windows (rare), the matching day is the day the window starts.
  if (now.getDay() !== day) return false;
  const hour = now.getHours();
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}

/**
 * Tone guard — rejects copy that violates the sanctuary voice.
 * Used at insertion time, before a notification ever reaches the user.
 *
 * Returns true if the text is acceptable.
 */
const BANNED_PHRASES = [
  "don't miss",
  "dont miss",
  "come back",
  "hurry",
  "last chance",
  "act now",
  "limited time",
  "!!!",
  "🔥",
  "🚨",
];

export function passesToneGuard(text: string): boolean {
  if (!text) return true;
  const lower = text.toLowerCase();
  return !BANNED_PHRASES.some((phrase) => lower.includes(phrase));
}

/** Convenience labels for the settings UI. */
export const MODE_LABELS: Record<NotificationMode, { title: string; subtitle: string }> = {
  sanctuary: {
    title: "Sanctuary",
    subtitle: "Only sacred moments — Selah, Service, Deep Dive.",
  },
  guided: {
    title: "Guided",
    subtitle: "Sacred plus gentle reminders of your own journey.",
  },
  connected: {
    title: "Connected",
    subtitle: "Sacred, personal, and messages from your community.",
  },
};
