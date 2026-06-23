-- Fix 1: audit_logs - Change INSERT policy to block all client inserts (only service role should insert)
DROP POLICY IF EXISTS "Only service role can insert audit logs directly" ON public.audit_logs;
CREATE POLICY "Block client audit log inserts"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (false);

-- Fix 2: kids_profiles - Remove parent's ability to see sensitive fields
-- First, drop the existing parent SELECT via the UPDATE policy (parents shouldn't see pin_hash, security_answer)
-- The is_parent_of_kid function allows parents to UPDATE, but SELECT should be restricted

-- Create a security definer function to get kid profile data WITHOUT sensitive fields for parents
CREATE OR REPLACE FUNCTION public.get_kid_profile_for_parent(p_kid_id uuid)
RETURNS TABLE(
  id uuid,
  user_id uuid,
  first_name text,
  last_name text,
  display_name text,
  username text,
  birth_date date,
  age_tier kid_age_tier,
  avatar_emoji text,
  avatar_url text,
  chart_color text,
  card_theme_id uuid,
  current_balance numeric,
  spend_balance numeric,
  save_balance numeric,
  give_balance numeric,
  split_spend_percent integer,
  split_save_percent integer,
  split_give_percent integer,
  total_earned numeric,
  total_spent numeric,
  total_saved numeric,
  streak_days integer,
  dark_mode_enabled boolean,
  sound_effects_enabled boolean,
  notifications_enabled boolean,
  last_active_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    kp.id,
    kp.user_id,
    kp.first_name,
    kp.last_name,
    kp.display_name,
    kp.username,
    kp.birth_date,
    kp.age_tier,
    kp.avatar_emoji,
    kp.avatar_url,
    kp.chart_color,
    kp.card_theme_id,
    kp.current_balance,
    kp.spend_balance,
    kp.save_balance,
    kp.give_balance,
    kp.split_spend_percent,
    kp.split_save_percent,
    kp.split_give_percent,
    kp.total_earned,
    kp.total_spent,
    kp.total_saved,
    kp.streak_days,
    kp.dark_mode_enabled,
    kp.sound_effects_enabled,
    kp.notifications_enabled,
    kp.last_active_at,
    kp.created_at,
    kp.updated_at
    -- Explicitly NOT returning: pin_hash, security_answer, security_question
  FROM kids_profiles kp
  WHERE kp.id = p_kid_id
    AND is_parent_of_kid(p_kid_id, auth.uid());
$$;

-- Update the existing kids_profiles_safe view to also exclude sensitive data
DROP VIEW IF EXISTS public.kids_profiles_safe;
CREATE VIEW public.kids_profiles_safe AS
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
COMMENT ON VIEW public.kids_profiles_safe IS 'Safe view of kids_profiles that excludes sensitive authentication fields (pin_hash, security_answer, security_question)';