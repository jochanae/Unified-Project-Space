/**
 * useServiceMode
 *
 * Returns whether Service Mode is currently active for the signed-in user.
 *
 * Active when EITHER:
 *   1. A `plan_events` row exists with category = 'service' and
 *      starts_at <= now() <= ends_at, OR
 *   2. The user's manual weekly service window (notification_settings)
 *      matches the current local time.
 *
 * Polls every 60s; also re-checks on focus and visibility change.
 */

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { isInServiceWindow } from "@/lib/notifications";

export type ServiceModeReason = "calendar" | "manual" | null;

export function useServiceMode(): {
  active: boolean;
  reason: ServiceModeReason;
} {
  const { user } = useAuth();
  const { settings } = useNotificationSettings();
  const [calendarActive, setCalendarActive] = useState(false);

  const checkCalendar = useCallback(async () => {
    if (!user) {
      setCalendarActive(false);
      return;
    }
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from("plan_events")
      .select("id")
      .eq("user_id", user.id)
      .eq("category", "service")
      .lte("starts_at", nowIso)
      .gte("ends_at", nowIso)
      .limit(1);
    if (error) {
      console.warn("useServiceMode: calendar query failed", error);
      return;
    }
    setCalendarActive((data?.length ?? 0) > 0);
  }, [user]);

  useEffect(() => {
    checkCalendar();
    const id = window.setInterval(checkCalendar, 60_000);
    const onVis = () => {
      if (document.visibilityState === "visible") checkCalendar();
    };
    window.addEventListener("focus", checkCalendar);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", checkCalendar);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [checkCalendar]);

  const manualActive = settings
    ? isInServiceWindow(
        settings.service_window_day,
        settings.service_window_start,
        settings.service_window_end,
      )
    : false;

  if (calendarActive) return { active: true, reason: "calendar" };
  if (manualActive) return { active: true, reason: "manual" };
  return { active: false, reason: null };
}
