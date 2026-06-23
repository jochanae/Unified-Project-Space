
CREATE TABLE public.image_generation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  user_id uuid,
  function_name text NOT NULL,
  raw_prompt text NOT NULL,
  final_prompt text NOT NULL,
  strict_mode boolean NOT NULL DEFAULT false,
  injected_additions text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.image_generation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their org image logs"
  ON public.image_generation_logs FOR SELECT
  USING (org_id = public.get_user_org_id() OR public.is_admin());

CREATE POLICY "Service role inserts image logs"
  ON public.image_generation_logs FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_image_gen_logs_org_created ON public.image_generation_logs (org_id, created_at DESC);
