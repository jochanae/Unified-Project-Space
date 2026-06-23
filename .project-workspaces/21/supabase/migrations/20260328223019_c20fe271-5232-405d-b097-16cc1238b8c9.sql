
CREATE TABLE public.beta_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text,
  claimed_by uuid,
  claimed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.beta_invite_codes ENABLE ROW LEVEL SECURITY;

-- Anyone can read codes to validate (but not see claimed_by)
CREATE POLICY "Anyone can check invite codes"
  ON public.beta_invite_codes
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated users can claim
CREATE POLICY "Authenticated users can claim codes"
  ON public.beta_invite_codes
  FOR UPDATE
  TO authenticated
  USING (claimed_by IS NULL AND is_active = true)
  WITH CHECK (claimed_by = auth.uid());

-- Seed initial invite codes
INSERT INTO public.beta_invite_codes (code, label) VALUES
  ('ARCHITECT-001', 'Founding Code 1'),
  ('ARCHITECT-002', 'Founding Code 2'),
  ('ARCHITECT-003', 'Founding Code 3'),
  ('SANCTUARY-ALPHA', 'Alpha Access'),
  ('FIRST100', 'General Beta'),
  ('CENTURION', 'Centurion Access');
