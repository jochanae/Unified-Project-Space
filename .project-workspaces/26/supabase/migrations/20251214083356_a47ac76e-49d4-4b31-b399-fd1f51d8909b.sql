-- Fix security definer view by using SECURITY INVOKER instead
DROP VIEW IF EXISTS public.kids_profiles_safe;

CREATE VIEW public.kids_profiles_safe
WITH (security_invoker = true)
AS
SELECT 
  id, user_id, first_name, last_name, display_name, username,
  birth_date, age_tier, avatar_emoji, avatar_url, card_theme_id,
  current_balance, spend_balance, save_balance, give_balance,
  total_earned, total_spent, total_saved, streak_days,
  split_spend_percent, split_save_percent, split_give_percent,
  dark_mode_enabled, notifications_enabled, sound_effects_enabled,
  security_question,
  pin_hash,
  last_active_at, created_at, updated_at
FROM public.kids_profiles;

-- Grant access to the safe view
GRANT SELECT ON public.kids_profiles_safe TO authenticated;