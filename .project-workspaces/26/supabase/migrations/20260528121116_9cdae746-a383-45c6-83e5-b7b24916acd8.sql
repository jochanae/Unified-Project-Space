
-- 1. Lock down avatars bucket listing (public URLs still work)
DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_owner_list"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- 2. Gmail connections: add INSERT and UPDATE policies
CREATE POLICY "Users can insert own gmail connection"
ON public.gmail_connections FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own gmail connection"
ON public.gmail_connections FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Hide claim_token_hash and related columns from clients
REVOKE SELECT (claim_token_hash, claim_token_expires_at, claim_token_issued_by)
  ON public.professionals FROM anon, authenticated;

-- 4. Enforce scheduled_reports.email matches the user's profile email
CREATE OR REPLACE FUNCTION public.enforce_scheduled_report_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_email text;
BEGIN
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT email INTO v_profile_email FROM public.profiles WHERE id = NEW.user_id;
  IF v_profile_email IS NULL OR lower(NEW.email) <> lower(v_profile_email) THEN
    RAISE EXCEPTION 'Scheduled report email must match your account email';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_scheduled_report_email_trg ON public.scheduled_reports;
CREATE TRIGGER enforce_scheduled_report_email_trg
BEFORE INSERT OR UPDATE OF email ON public.scheduled_reports
FOR EACH ROW EXECUTE FUNCTION public.enforce_scheduled_report_email();
