-- Drop existing view first since we can't modify columns
DROP VIEW IF EXISTS public.kids_profiles_safe;

-- Create a safe view for kids_profiles that excludes sensitive authentication fields
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
  -- Explicitly excluding: pin_hash, security_answer, security_question
FROM public.kids_profiles;

-- Enable RLS on the view via security_invoker
ALTER VIEW public.kids_profiles_safe SET (security_invoker = true);

-- Drop existing parent policies on the main table
DROP POLICY IF EXISTS "Parents can view linked kids profiles" ON public.kids_profiles;
DROP POLICY IF EXISTS "Parents can update linked kids profiles" ON public.kids_profiles;
DROP POLICY IF EXISTS "Parents can view linked kids via safe view" ON public.kids_profiles;
DROP POLICY IF EXISTS "Parents can view safe kid profiles" ON public.kids_profiles;

-- Recreate kid policies to target authenticated role only
DROP POLICY IF EXISTS "Kids can view their own profile" ON public.kids_profiles;
DROP POLICY IF EXISTS "Kids view own profile secure" ON public.kids_profiles;
DROP POLICY IF EXISTS "Kids can create their own profile" ON public.kids_profiles;
DROP POLICY IF EXISTS "Kids can update their own profile" ON public.kids_profiles;
DROP POLICY IF EXISTS "Kids update own profile secure" ON public.kids_profiles;

-- Kids can see their FULL profile (including pin_hash for verification)
CREATE POLICY "Kids can view their own profile" 
ON public.kids_profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Kids can create their own profile" 
ON public.kids_profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Kids can update their own profile" 
ON public.kids_profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Parents can ONLY update non-sensitive fields via a security definer function
CREATE OR REPLACE FUNCTION public.parent_update_kid_profile(
  p_kid_id uuid,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_avatar_emoji text DEFAULT NULL,
  p_chart_color text DEFAULT NULL,
  p_split_spend_percent integer DEFAULT NULL,
  p_split_save_percent integer DEFAULT NULL,
  p_split_give_percent integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the caller is a parent of this kid
  IF NOT is_parent_of_kid(p_kid_id, auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to update this kid profile';
  END IF;
  
  -- Update only non-sensitive fields (cannot touch pin_hash, security_answer, security_question)
  UPDATE public.kids_profiles
  SET
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    display_name = COALESCE(p_display_name, display_name),
    avatar_emoji = COALESCE(p_avatar_emoji, avatar_emoji),
    chart_color = COALESCE(p_chart_color, chart_color),
    split_spend_percent = COALESCE(p_split_spend_percent, split_spend_percent),
    split_save_percent = COALESCE(p_split_save_percent, split_save_percent),
    split_give_percent = COALESCE(p_split_give_percent, split_give_percent),
    updated_at = now()
  WHERE id = p_kid_id;
  
  RETURN true;
END;
$$;

-- Function for parents to read kid profile safely (excludes sensitive fields)
CREATE OR REPLACE FUNCTION public.get_linked_kids_profiles(p_parent_id uuid)
RETURNS TABLE (
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
  last_active_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
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
  INNER JOIN family_links fl ON fl.kid_profile_id = kp.id
  WHERE fl.parent_user_id = p_parent_id
    AND fl.status = 'active';
$$;

-- Add documentation comment
COMMENT ON VIEW public.kids_profiles_safe IS 
'Safe view of kids_profiles that excludes sensitive authentication fields (pin_hash, security_answer, security_question). Parents should use get_linked_kids_profiles() function instead of direct table access.';

COMMENT ON FUNCTION public.get_linked_kids_profiles IS
'Returns linked kids profiles for a parent, excluding sensitive security fields like pin_hash and security_answer.';