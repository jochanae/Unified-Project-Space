CREATE TABLE public.deep_dive_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book text NOT NULL,
  chapter integer NOT NULL,
  verse_start integer,
  verse_end integer,
  reference_label text NOT NULL,
  provider text NOT NULL,
  prompt text NOT NULL,
  url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deep_dive_history_user_created
  ON public.deep_dive_history (user_id, created_at DESC);

ALTER TABLE public.deep_dive_history ENABLE ROW LEVEL SECURITY;

-- Paid tiers only: Minister, Church Partner, Admin
CREATE POLICY "Paid users insert own deep dive history"
  ON public.deep_dive_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'minister'::app_role)
      OR public.has_role(auth.uid(), 'church_partner'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Paid users view own deep dive history"
  ON public.deep_dive_history
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'minister'::app_role)
      OR public.has_role(auth.uid(), 'church_partner'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );

CREATE POLICY "Paid users delete own deep dive history"
  ON public.deep_dive_history
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (
      public.has_role(auth.uid(), 'minister'::app_role)
      OR public.has_role(auth.uid(), 'church_partner'::app_role)
      OR public.has_role(auth.uid(), 'admin'::app_role)
    )
  );