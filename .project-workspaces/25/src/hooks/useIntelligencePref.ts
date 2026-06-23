import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isIntelligencePref, type IntelligencePref } from "@/lib/intelligencePref";

/**
 * Reads (and persists) the user's preferred AI intelligence source from
 * profiles.preferred_ai_provider. Defaults to "smart" while loading or for
 * signed-out users so resolveProvider falls back to surface defaults.
 */
export function useIntelligencePref(userId?: string | null) {
  const [pref, setPref] = useState<IntelligencePref>("smart");
  const [loading, setLoading] = useState(!!userId);

  useEffect(() => {
    if (!userId) {
      setPref("smart");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void supabase
      .from("profiles")
      .select("preferred_ai_provider")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const value = (data as { preferred_ai_provider?: unknown } | null)?.preferred_ai_provider;
        setPref(isIntelligencePref(value) ? value : "smart");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  async function update(next: IntelligencePref) {
    setPref(next);
    if (!userId) return;
    await supabase.from("profiles").update({ preferred_ai_provider: next }).eq("id", userId);
  }

  return { pref, loading, update };
}
