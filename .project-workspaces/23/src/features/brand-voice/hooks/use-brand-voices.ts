import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BrandVoice } from "../types";

export function useBrandVoices() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["brand_voices"],
    queryFn: async (): Promise<BrandVoice[]> => {
      const { data, error } = await supabase
        .from("brand_voices")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BrandVoice[];
    },
  });

  const cloneVoice = useMutation({
    mutationFn: async (input: { name: string; description?: string; file: File; setDefault?: boolean }) => {
      const form = new FormData();
      form.append("name", input.name);
      if (input.description) form.append("description", input.description);
      form.append("sample", input.file);
      if (input.setDefault) form.append("set_default", "true");

      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/clone-brand-voice`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Clone failed");
      return json.voice as BrandVoice;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brand_voices"] }),
  });

  const setDefault = useMutation({
    mutationFn: async (voiceId: string) => {
      const target = list.data?.find((v) => v.id === voiceId);
      if (!target) throw new Error("Voice not found");
      // Clear other defaults in same org
      await supabase
        .from("brand_voices")
        .update({ is_default: false })
        .eq("org_id", target.org_id);
      const { error } = await supabase
        .from("brand_voices")
        .update({ is_default: true })
        .eq("id", voiceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brand_voices"] }),
  });

  const deleteVoice = useMutation({
    mutationFn: async (voiceId: string) => {
      const { error } = await supabase.from("brand_voices").delete().eq("id", voiceId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["brand_voices"] }),
  });

  return { list, cloneVoice, setDefault, deleteVoice };
}
