
-- 1. Protect voice quota fields on profiles from client-side tampering
CREATE OR REPLACE FUNCTION public.prevent_voice_quota_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Skip if called by service_role (edge functions / RPCs with SECURITY DEFINER)
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Revert any voice quota field changes from regular users
  NEW.voice_minutes_used := OLD.voice_minutes_used;
  NEW.voice_trial_seconds_used := OLD.voice_trial_seconds_used;
  NEW.voice_trial_used := OLD.voice_trial_used;
  NEW.voice_minutes_reset_at := OLD.voice_minutes_reset_at;

  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_voice_quota
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_voice_quota_changes();

-- 2. Remove user UPDATE and DELETE access on usage_tracking
DROP POLICY IF EXISTS "Users can only update own usage tracking" ON public.usage_tracking;
DROP POLICY IF EXISTS "Users can only delete own usage tracking" ON public.usage_tracking;
