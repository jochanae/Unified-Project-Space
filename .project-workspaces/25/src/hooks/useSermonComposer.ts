/**
 * useSermonComposer
 *
 * Multi-step sermon generation lifecycle:
 *   outline → manuscript → revise (optional) → save (optional)
 *
 * Access: Minister, Church Partner, or Admin tier required (paid only).
 * Free users see an upgrade prompt — they cannot generate sermons.
 *
 * Daily soft limit on paid tiers: 5 generations per day per device, to keep
 * AI costs predictable. Tracked in localStorage like Selah.
 */

import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";

export interface SermonOutlinePoint {
  heading: string;
  scripture_anchor: string;
  explanation: string;
  illustration: string;
  application: string;
}

export interface SermonOutline {
  title: string;
  big_idea: string;
  introduction: string;
  points: SermonOutlinePoint[];
  conclusion: string;
  benediction: string;
}

export interface SermonInputs {
  theme: string;
  scriptureRef: string;
  scriptureText: string;
  audience: string;
  tone: string;
  tradition?: string;
  lengthTarget: "short" | "standard" | "long";
}

export type ComposerStatus = "idle" | "loading" | "ready" | "error" | "limit_reached" | "no_access";

const PAID_DAILY_LIMIT = 5;
const STORAGE_KEY = "sanctumiq:sermon-composer:usage";

function todayKey() {
  return new Date().toLocaleDateString("en-CA");
}

function getUsageToday(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const record = JSON.parse(raw) as { date: string; count: number };
    return record.date === todayKey() ? record.count : 0;
  } catch {
    return 0;
  }
}

function bumpUsage(): number {
  const next = getUsageToday() + 1;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey(), count: next }));
  } catch {
    // ignore
  }
  return next;
}

export function useSermonComposer() {
  const { user } = useAuth();
  const { hasAnyRole, loading: rolesLoading } = useRoles(user?.id);
  const hasPaidAccess = hasAnyRole(["minister", "church_partner", "admin"]);

  const [status, setStatus] = useState<ComposerStatus>("idle");
  const [error, setError] = useState<string>("");
  const [outline, setOutline] = useState<SermonOutline | null>(null);
  const [manuscript, setManuscript] = useState<string>("");
  const [usageToday, setUsageToday] = useState<number>(() => getUsageToday());

  const checkAccess = useCallback((): boolean => {
    if (!user) {
      setStatus("no_access");
      setError("Please sign in to use Sermon Composer.");
      return false;
    }
    if (!hasPaidAccess) {
      setStatus("no_access");
      setError("Sermon Composer is an Architect & Church Partner feature.");
      return false;
    }
    if (getUsageToday() >= PAID_DAILY_LIMIT) {
      setStatus("limit_reached");
      setError(`You've generated ${PAID_DAILY_LIMIT} sermons today. The limit resets tomorrow.`);
      return false;
    }
    return true;
  }, [user, hasPaidAccess]);

  const generateOutline = useCallback(
    async (inputs: SermonInputs) => {
      if (!checkAccess()) return;
      setStatus("loading");
      setError("");
      try {
        const { data, error: fnError } = await supabase.functions.invoke("sermon-composer", {
          body: {
            action: "outline",
            theme: inputs.theme,
            scripture_ref: inputs.scriptureRef,
            scripture_text: inputs.scriptureText,
            audience: inputs.audience,
            tone: inputs.tone,
            length_target: inputs.lengthTarget,
            tradition: inputs.tradition || undefined,
          },
        });
        if (fnError || !data?.outline) {
          setError(data?.error ?? "Outline generation failed.");
          setStatus("error");
          return;
        }
        setOutline(data.outline as SermonOutline);
        setUsageToday(bumpUsage());
        setStatus("ready");
      } catch (err) {
        console.error("generateOutline error:", err);
        setError("Connection error. Please try again.");
        setStatus("error");
      }
    },
    [checkAccess],
  );

  const generateManuscript = useCallback(
    async (inputs: SermonInputs, currentOutline: SermonOutline) => {
      if (!checkAccess()) return;
      setStatus("loading");
      setError("");
      try {
        const { data, error: fnError } = await supabase.functions.invoke("sermon-composer", {
          body: {
            action: "manuscript",
            outline: currentOutline,
            scripture_ref: inputs.scriptureRef,
            scripture_text: inputs.scriptureText,
            audience: inputs.audience,
            tone: inputs.tone,
            length_target: inputs.lengthTarget,
          },
        });
        if (fnError || !data?.manuscript) {
          setError(data?.error ?? "Manuscript generation failed.");
          setStatus("error");
          return;
        }
        setManuscript(data.manuscript);
        setUsageToday(bumpUsage());
        setStatus("ready");
      } catch (err) {
        console.error("generateManuscript error:", err);
        setError("Connection error. Please try again.");
        setStatus("error");
      }
    },
    [checkAccess],
  );

  const revise = useCallback(
    async (instruction: string) => {
      if (!checkAccess()) return;
      if (!manuscript) {
        setError("Generate a manuscript first.");
        return;
      }
      setStatus("loading");
      setError("");
      try {
        const { data, error: fnError } = await supabase.functions.invoke("sermon-composer", {
          body: { action: "revise", manuscript, instruction },
        });
        if (fnError || !data?.manuscript) {
          setError(data?.error ?? "Revision failed.");
          setStatus("error");
          return;
        }
        setManuscript(data.manuscript);
        setUsageToday(bumpUsage());
        setStatus("ready");
      } catch (err) {
        console.error("revise error:", err);
        setError("Connection error. Please try again.");
        setStatus("error");
      }
    },
    [manuscript, checkAccess],
  );

  const saveSermon = useCallback(
    async (
      inputs: SermonInputs,
      currentOutline: SermonOutline | null,
      currentManuscript: string,
    ) => {
      if (!user) return { error: "Not signed in" };
      try {
        const sermonRow = {
          user_id: user.id,
          title: currentOutline?.title || inputs.theme || "Untitled Sermon",
          theme: inputs.theme || null,
          scripture_ref: inputs.scriptureRef || null,
          scripture_text: inputs.scriptureText || null,
          audience: inputs.audience || null,
          tone: inputs.tone || null,
          length_target: inputs.lengthTarget,
          tradition: inputs.tradition || null,
          outline: currentOutline as unknown as Record<string, unknown> | null,
          manuscript: currentManuscript,
          status: "draft",
          current_version: 1,
        };
        const { data, error: dbError } = await supabase
          .from("sermons")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(sermonRow as any)
          .select("id")
          .single();
        if (dbError || !data) {
          return { error: dbError?.message ?? "Save failed" };
        }
        const versionRow = {
          sermon_id: data.id,
          user_id: user.id,
          version_number: 1,
          outline: currentOutline as unknown as Record<string, unknown> | null,
          manuscript: currentManuscript,
          notes: "Initial draft",
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await supabase.from("sermon_versions").insert(versionRow as any);
        return { id: data.id };
      } catch (err) {
        console.error("saveSermon error:", err);
        return { error: "Save failed" };
      }
    },
    [user],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setError("");
    setOutline(null);
    setManuscript("");
  }, []);

  return {
    status,
    error,
    outline,
    manuscript,
    usageToday,
    dailyLimit: PAID_DAILY_LIMIT,
    hasPaidAccess,
    rolesLoading,
    setManuscript,
    setOutline,
    generateOutline,
    generateManuscript,
    revise,
    saveSermon,
    reset,
  };
}
