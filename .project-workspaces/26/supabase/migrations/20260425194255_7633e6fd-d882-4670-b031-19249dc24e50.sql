-- Drop the plaintext claim_token column and add hardened versions
ALTER TABLE public.professionals
  DROP COLUMN IF EXISTS claim_token;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS claim_token_hash text,
  ADD COLUMN IF NOT EXISTS claim_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS claim_token_issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_professionals_claim_token_hash
  ON public.professionals(claim_token_hash)
  WHERE claim_token_hash IS NOT NULL;

-- Admin-only: issue a fresh one-time claim token (returns plaintext once)
CREATE OR REPLACE FUNCTION public.issue_professional_claim_token(
  p_professional_id uuid,
  p_expires_in_days integer DEFAULT 14
)
RETURNS TABLE(claim_token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token text;
  v_hash text;
  v_expires timestamptz;
  v_existing record;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized: admin only';
  END IF;

  SELECT id, user_id, claimed_at INTO v_existing
  FROM public.professionals
  WHERE id = p_professional_id;

  IF v_existing.id IS NULL THEN
    RAISE EXCEPTION 'Professional not found';
  END IF;

  IF v_existing.user_id IS NOT NULL OR v_existing.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'Professional is already claimed';
  END IF;

  -- 32 random bytes => 64-char hex token
  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  v_expires := now() + make_interval(days => GREATEST(1, p_expires_in_days));

  UPDATE public.professionals
  SET claim_token_hash = v_hash,
      claim_token_expires_at = v_expires,
      claim_token_issued_by = auth.uid(),
      updated_at = now()
  WHERE id = p_professional_id;

  PERFORM public.log_audit_event(
    'issue_claim_token',
    'professional',
    p_professional_id::text,
    jsonb_build_object('expires_at', v_expires)
  );

  RETURN QUERY SELECT v_token, v_expires;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_professional_claim_token(uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.issue_professional_claim_token(uuid, integer) TO authenticated;

-- Authenticated users redeem a claim token to link the profile to their account
CREATE OR REPLACE FUNCTION public.claim_professional_profile(p_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_hash text;
  v_prof record;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_token IS NULL OR length(p_token) < 32 THEN
    RAISE EXCEPTION 'Invalid claim token';
  END IF;

  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');

  SELECT id, user_id, claimed_at, claim_token_expires_at
  INTO v_prof
  FROM public.professionals
  WHERE claim_token_hash = v_hash
  LIMIT 1;

  IF v_prof.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired claim token';
  END IF;

  IF v_prof.user_id IS NOT NULL OR v_prof.claimed_at IS NOT NULL THEN
    RAISE EXCEPTION 'This profile has already been claimed';
  END IF;

  IF v_prof.claim_token_expires_at IS NULL OR v_prof.claim_token_expires_at < now() THEN
    RAISE EXCEPTION 'This claim link has expired';
  END IF;

  -- Ensure this user doesn't already own a different professional row
  IF EXISTS (SELECT 1 FROM public.professionals WHERE user_id = v_uid) THEN
    RAISE EXCEPTION 'Your account is already linked to a professional profile';
  END IF;

  UPDATE public.professionals
  SET user_id = v_uid,
      claimed_at = now(),
      claim_token_hash = NULL,
      claim_token_expires_at = NULL,
      claim_token_issued_by = NULL,
      updated_at = now()
  WHERE id = v_prof.id;

  PERFORM public.log_audit_event(
    'claim_professional',
    'professional',
    v_prof.id::text,
    jsonb_build_object('claimed_by', v_uid)
  );

  RETURN v_prof.id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_professional_profile(text) FROM public;
GRANT EXECUTE ON FUNCTION public.claim_professional_profile(text) TO authenticated;