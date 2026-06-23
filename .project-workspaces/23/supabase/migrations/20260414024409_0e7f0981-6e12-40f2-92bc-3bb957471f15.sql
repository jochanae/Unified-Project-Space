CREATE TABLE public.ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id uuid NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  field_name text NOT NULL,
  variant_a text NOT NULL,
  variant_b text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org ab tests"
  ON public.ab_tests FOR ALL TO authenticated
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Anyone can view active ab tests"
  ON public.ab_tests FOR SELECT TO anon
  USING (is_active = true);