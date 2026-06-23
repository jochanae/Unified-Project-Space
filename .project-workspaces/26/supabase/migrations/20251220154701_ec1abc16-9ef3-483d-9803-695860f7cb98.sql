
-- Recreate kids_profiles_safe view with security_invoker = true
-- This ensures RLS from the underlying kids_profiles table is enforced
DROP VIEW IF EXISTS public.kids_profiles_safe;

CREATE VIEW public.kids_profiles_safe
WITH (security_invoker = true)
AS
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
FROM public.kids_profiles;

-- Grant access to authenticated users (RLS from underlying table will be enforced)
GRANT SELECT ON public.kids_profiles_safe TO authenticated;
