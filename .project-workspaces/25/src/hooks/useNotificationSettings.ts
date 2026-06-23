/**
 * useNotificationSettings
 *
 * Loads (and lets the user mutate) their notification posture:
 *   - mode (sanctuary / guided / connected)
 *   - enabled (master "Silence the Sanctuary" toggle)
 *   - quiet hours window
 *
 * The DB has a default row created by trigger on signup, so authenticated
 * users always have a settings row. We still upsert defensively in case of
 * legacy users.
 */

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_SETTINGS, type NotificationSettings } from "@/lib/notifications";

export function useNotificationSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(user));
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setSettings(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("user_notification_settings")
      .select(
        "user_id, mode, enabled, quiet_hours_start, quiet_hours_end, service_window_day, service_window_start, service_window_end",
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      console.error("notification settings load failed:", error);
      setSettings({ user_id: user.id, ...DEFAULT_SETTINGS });
    } else if (!data) {
      // Legacy user with no row — create one.
      const seed = { user_id: user.id, ...DEFAULT_SETTINGS };
      await supabase.from("user_notification_settings").insert(seed);
      setSettings(seed as NotificationSettings);
    } else {
      setSettings(data as NotificationSettings);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const update = useCallback(
    async (patch: Partial<Omit<NotificationSettings, "user_id">>) => {
      if (!user || !settings) return;
      const next = { ...settings, ...patch };
      setSettings(next); // optimistic
      setSaving(true);
      const { error } = await supabase
        .from("user_notification_settings")
        .update(patch)
        .eq("user_id", user.id);
      setSaving(false);
      if (error) {
        console.error("notification settings save failed:", error);
        setSettings(settings); // rollback
        throw error;
      }
    },
    [user, settings],
  );

  return { settings, loading, saving, refresh, update };
}
