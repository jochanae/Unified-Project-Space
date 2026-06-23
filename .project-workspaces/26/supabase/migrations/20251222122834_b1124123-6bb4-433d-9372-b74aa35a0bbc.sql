-- Fix the security definer view warning by making it a regular view
-- The RLS on the underlying kids_profiles table will handle security

DROP VIEW IF EXISTS public.kids_profiles_safe;

CREATE VIEW public.kids_profiles_safe 
WITH (security_invoker = true) AS
SELECT 
  id,
  user_id,
  first_name,
  last_name,
  display_name,
  username,
  birth_date,
  age_tier,
  avatar_emoji,
  avatar_url,
  chart_color,
  card_theme_id,
  current_balance,
  spend_balance,
  save_balance,
  give_balance,
  split_spend_percent,
  split_save_percent,
  split_give_percent,
  total_earned,
  total_spent,
  total_saved,
  streak_days,
  dark_mode_enabled,
  sound_effects_enabled,
  notifications_enabled,
  last_active_at,
  created_at,
  updated_at
  -- Explicitly NOT including: pin_hash, security_answer, security_question
FROM kids_profiles;

-- Grant SELECT on the safe view
GRANT SELECT ON public.kids_profiles_safe TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.kids_profiles_safe IS 'Safe view of kids_profiles that excludes sensitive authentication fields (pin_hash, security_answer, security_question). Uses security_invoker to respect RLS of the querying user.';