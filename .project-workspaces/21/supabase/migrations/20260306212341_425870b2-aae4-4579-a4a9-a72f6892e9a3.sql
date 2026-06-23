
-- 1. Fix bug_reports: restrict INSERT to authenticated users only
DROP POLICY IF EXISTS "Anyone can insert bug reports" ON public.bug_reports;
CREATE POLICY "Authenticated users can insert bug reports"
ON public.bug_reports FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Fix sms_profiles_decrypted: recreate with security_invoker
DROP VIEW IF EXISTS public.sms_profiles_decrypted;
CREATE OR REPLACE VIEW public.sms_profiles_decrypted
WITH (security_invoker = true)
AS SELECT id, user_id, user_name, companion_name, vibe, sms_enabled,
          memories, last_app_active, last_sms_sent,
          public.pii_decrypt(phone_number_encrypted) AS phone_number_decrypted,
          created_at
FROM public.sms_profiles;
