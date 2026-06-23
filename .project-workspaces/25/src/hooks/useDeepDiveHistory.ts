/**
 * useDeepDiveHistory
 *
 * Paid-tier (Minister, Church Partner, Admin) history of Deep Dive lookups.
 * Free users get a no-op hook (logs return silently, list is empty) so the
 * Reader UI can hide history affordances cleanly.
 *
 * Storage: deep_dive_history table (RLS restricts to paid roles via has_role).
 */

import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRoles";
import { clearDeepDiveHistory } from "@/lib/deepDive.functions";

export interface DeepDiveHistoryEntry {
  id: string;
  book: string;
  chapter: number;
  verse_start: number | null;
  verse_end: number | null;
  reference_label: string;
  provider: string;
  prompt: string;
  url: string;
  created_at: string;
}

const HISTORY_LIMIT = 100;

export function useDeepDiveHistory() {
  const { user } = useAuth();
  const { hasAnyRole, loading: rolesLoading } = useRoles(user?.id);
  const hasPaidAccess = hasAnyRole(["minister", "church_partner", "admin"]);
  const clearAllFn = useServerFn(clearDeepDiveHistory);

  const [entries, setEntries] = useState<DeepDiveHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user || !hasPaidAccess) {
      setEntries([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("deep_dive_history")
      .select(
        "id, book, chapter, verse_start, verse_end, reference_label, provider, prompt, url, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT);
    if (!error && data) setEntries(data as DeepDiveHistoryEntry[]);
    setLoading(false);
  }, [user, hasPaidAccess]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const log = useCallback(
    async (entry: Omit<DeepDiveHistoryEntry, "id" | "created_at">) => {
      if (!user || !hasPaidAccess) return;
      const row = { ...entry, user_id: user.id };
      const { data, error } = await supabase
        .from("deep_dive_history")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert(row as any)
        .select(
          "id, book, chapter, verse_start, verse_end, reference_label, provider, prompt, url, created_at",
        )
        .single();
      if (!error && data) {
        setEntries((current) => [data as DeepDiveHistoryEntry, ...current].slice(0, HISTORY_LIMIT));
      }
    },
    [user, hasPaidAccess],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!user) return;
      const { error } = await supabase.from("deep_dive_history").delete().eq("id", id);
      if (!error) setEntries((current) => current.filter((entry) => entry.id !== id));
    },
    [user],
  );

  const reopen = useCallback((entry: DeepDiveHistoryEntry) => {
    if (typeof window === "undefined") return;
    window.open(entry.url, "_blank", "noopener,noreferrer");
  }, []);

  const clearAll = useCallback(async () => {
    if (!user || !hasPaidAccess) return { ok: false as const, cleared: 0 };
    // Server-enforced: requireSupabaseAuth + RLS (paid roles only) on the
    // deep_dive_history DELETE policy. Client-side gating here is for UX only.
    const result = await clearAllFn();
    if (result.ok) setEntries([]);
    return result;
  }, [user, hasPaidAccess, clearAllFn]);

  return {
    entries,
    loading: loading || rolesLoading,
    hasPaidAccess,
    refresh,
    log,
    remove,
    reopen,
    clearAll,
  };
}
