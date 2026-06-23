-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can check invite codes" ON public.beta_invite_codes;

-- Create a secure RPC to validate a code without exposing the table
CREATE OR REPLACE FUNCTION public.check_invite_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row record;
BEGIN
  SELECT id, claimed_by INTO v_row
  FROM public.beta_invite_codes
  WHERE code = upper(trim(p_code))
    AND is_active = true
  LIMIT 1;

  IF v_row IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'claimed', false, 'id', null);
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'claimed', v_row.claimed_by IS NOT NULL,
    'id', v_row.id
  );
END;
$$;

-- Create a secure RPC to claim a code
CREATE OR REPLACE FUNCTION public.claim_invite_code(p_code_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.beta_invite_codes
  SET claimed_by = auth.uid(), claimed_at = now()
  WHERE id = p_code_id
    AND is_active = true
    AND claimed_by IS NULL;
  RETURN FOUND;
END;
$$;

-- Allow authenticated users to read only their own claimed codes
CREATE POLICY "Users can view their own claimed codes"
  ON public.beta_invite_codes
  FOR SELECT
  TO authenticated
  USING (claimed_by = auth.uid());

-- Admins can still see all codes
CREATE POLICY "Admins can view all invite codes"
  ON public.beta_invite_codes
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));