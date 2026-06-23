// Faith Goal helpers — yearly stewardship target.
import { supabase } from "@/integrations/supabase/client";

export type FaithGoal = {
  id: string;
  user_id: string;
  year: number;
  target_cents: number;
  percent_of_income: number | null;
  is_active: boolean;
};

export async function fetchActiveGoal(userId: string, year: number) {
  const { data, error } = await supabase
    .from("faith_goals")
    .select("id,user_id,year,target_cents,percent_of_income,is_active")
    .eq("user_id", userId)
    .eq("year", year)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as FaithGoal | null) ?? null;
}

export async function upsertGoal(args: {
  userId: string;
  year: number;
  targetCents: number;
  percentOfIncome: number | null;
}) {
  const { data, error } = await supabase
    .from("faith_goals")
    .upsert(
      {
        user_id: args.userId,
        year: args.year,
        target_cents: args.targetCents,
        percent_of_income: args.percentOfIncome,
        is_active: true,
      },
      { onConflict: "user_id,year" },
    )
    .select("id,user_id,year,target_cents,percent_of_income,is_active")
    .single();
  if (error) throw error;
  return data as FaithGoal;
}

export async function clearGoal(userId: string, year: number) {
  const { error } = await supabase
    .from("faith_goals")
    .delete()
    .eq("user_id", userId)
    .eq("year", year);
  if (error) throw error;
}
