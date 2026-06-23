-- SECURITY HARDENING: Additional defense-in-depth measures

-- 1. Create audit logging for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS - only system can write, admins can read
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (public.is_admin(auth.uid()));

-- 2. Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (user_id, action, table_name, record_id)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, NEW.id::text);
  RETURN NEW;
END;
$$;

-- 3. Add audit triggers for sensitive tables
CREATE TRIGGER audit_plaid_items_access
  AFTER INSERT OR UPDATE ON public.plaid_items
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_access();

CREATE TRIGGER audit_tax_documents_access
  AFTER INSERT OR UPDATE ON public.tax_documents
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_access();

-- 4. Create a view for kids_profiles that hides security_answer from parents
-- Parents should NOT be able to see children's security answers
CREATE OR REPLACE VIEW public.kids_profiles_safe AS
SELECT 
  id, user_id, first_name, last_name, display_name, username,
  birth_date, age_tier, avatar_emoji, avatar_url, card_theme_id,
  current_balance, spend_balance, save_balance, give_balance,
  total_earned, total_spent, total_saved, streak_days,
  split_spend_percent, split_save_percent, split_give_percent,
  dark_mode_enabled, notifications_enabled, sound_effects_enabled,
  security_question, -- Question is OK to show
  -- security_answer is EXCLUDED - should only be verified via backend
  pin_hash, -- Keep for now but recommend removing from client access
  last_active_at, created_at, updated_at
FROM public.kids_profiles;

-- Grant access to the safe view
GRANT SELECT ON public.kids_profiles_safe TO authenticated;