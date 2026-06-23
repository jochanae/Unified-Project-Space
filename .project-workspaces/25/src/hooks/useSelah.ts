/**
 * useSelah
 * Manages the Selah reflection lifecycle with a daily usage limit for free users.
 *
 * Free tier:  3 reflections per day (resets at midnight local time)
 * Paid tiers: unlimited
 *
 * Usage limit is tracked in localStorage — no server call needed.
 * Paid access check uses useRoles hook.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useRoles";
import { useAuth } from "@/hooks/useAuth";

export type SelahStatus = "idle" | "loading" | "done" | "error" | "limit_reached";

export interface UseSelahReturn {
  reflect: (verse: string, reference: string, mode?: string) => Promise<void>;
  previewFeeling: (feeling: string, mode?: string) => Promise<void>;
  reflection: string;
  status: SelahStatus;
  reset: () => void;
  usageToday: number;
  dailyLimit: number; // 3 for free, Infinity for paid
  isLimited: boolean; // true when free user has hit 3
  limitMessage: string; // the calm, non-punitive message
}

const FREE_DAILY_LIMIT = 3;
const STORAGE_KEY = "sanctumiq:selah:usage";

type UsageRecord = { date: string; count: number };

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function getUsageToday(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const record: UsageRecord = JSON.parse(raw);
    return record.date === todayKey() ? record.count : 0;
  } catch {
    return 0;
  }
}

function incrementUsage(): number {
  const today = todayKey();
  const current = getUsageToday();
  const next = current + 1;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: next }));
  } catch {
    // localStorage full — ignore
  }
  return next;
}

export function useSelah(): UseSelahReturn {
  const { user } = useAuth();
  const { hasAnyRole } = useRoles(user?.id);
  const [status, setStatus] = useState<SelahStatus>("idle");
  const [reflection, setReflection] = useState("");
  const [usageToday, setUsageToday] = useState<number>(() => getUsageToday());

  const hasPaidAccess = hasAnyRole(["minister", "church_partner", "admin"]);
  const dailyLimit = hasPaidAccess ? Infinity : FREE_DAILY_LIMIT;
  const isLimited = !hasPaidAccess && usageToday >= FREE_DAILY_LIMIT;

  const limitMessage = isLimited
    ? "You've had 3 Selah reflections today. Come back tomorrow, or continue without limits as an Architect or Church Partner."
    : "";

  const runSelah = useCallback(
    async (body: Record<string, string>) => {
      // Re-read usage fresh in case it changed
      const currentUsage = getUsageToday();
      const paid = hasAnyRole(["minister", "church_partner", "admin"]);

      if (!paid && currentUsage >= FREE_DAILY_LIMIT) {
        setStatus("limit_reached");
        return;
      }

      setStatus("loading");
      setReflection("");

      try {
        const { data, error } = await supabase.functions.invoke("selah", { body });

        if (error || !data?.reflection) {
          console.error("Selah error:", error ?? "empty response");
          setStatus("error");
          return;
        }

        // Only count on success
        if (!paid) {
          const next = incrementUsage();
          setUsageToday(next);
        }

        setReflection(data.reflection);
        setStatus("done");
      } catch (err) {
        console.error("Selah unexpected error:", err);
        setStatus("error");
      }
    },
    [hasAnyRole],
  );

  const reflect = useCallback(
    async (verse: string, reference: string, mode = "reflect") => {
      await runSelah({ verse, reference, mode });
    },
    [runSelah],
  );

  const previewFeeling = useCallback(
    async (feeling: string, mode = "open") => {
      await runSelah({ feeling, mode });
    },
    [runSelah],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setReflection("");
  }, []);

  return {
    reflect,
    previewFeeling,
    reflection,
    status,
    reset,
    usageToday,
    dailyLimit,
    isLimited,
    limitMessage,
  };
}
