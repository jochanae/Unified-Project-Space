import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BloomCoachProfile {
  id?: string;
  age_range?: string | null;
  employment_type?: string | null;
  family_status?: string | null;
  has_dependents?: boolean;
  num_dependents?: number;
  income_range?: string | null;
  financial_literacy?: string | null;
  top_financial_goals?: string[];
  biggest_challenges?: string[] | null;
  risk_tolerance?: string | null;
  coaching_style?: string | null;
  is_complete?: boolean;
}

// Maps frontend field names to DB column names
function toDbFields(updates: Partial<BloomCoachProfile>): Record<string, unknown> {
  const { biggest_challenges, ...rest } = updates;
  const dbFields: Record<string, unknown> = { ...rest };
  if (biggest_challenges !== undefined) {
    dbFields.biggest_challenge = biggest_challenges;
  }
  return dbFields;
}

// Maps DB row to frontend profile
function fromDbRow(row: any): BloomCoachProfile {
  const { biggest_challenge, ...rest } = row;
  return {
    ...rest,
    biggest_challenges: biggest_challenge || [],
  };
}

export function useBloomCoachProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<BloomCoachProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("bloom_coach_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      setProfile(data ? fromDbRow(data) : null);
    } catch (err) {
      console.error("Failed to fetch coach profile:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const saveProfile = useCallback(
    async (updates: Partial<BloomCoachProfile>) => {
      if (!user) return;
      try {
        const dbFields = toDbFields(updates);
        if (profile?.id) {
          const { error } = await supabase
            .from("bloom_coach_profiles")
            .update(dbFields as any)
            .eq("user_id", user.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("bloom_coach_profiles")
            .insert({ ...dbFields, user_id: user.id } as any);
          if (error) throw error;
        }
        await fetchProfile();
        toast.success("Profile saved!");
      } catch (err) {
        console.error("Failed to save coach profile:", err);
        toast.error("Failed to save profile");
      }
    },
    [user, profile, fetchProfile]
  );

  return { profile, isLoading, saveProfile, refetch: fetchProfile };
}
