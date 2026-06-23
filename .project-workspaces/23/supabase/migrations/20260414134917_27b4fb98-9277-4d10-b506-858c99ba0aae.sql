
CREATE TABLE public.shared_blueprints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  share_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text, '-', ''),
  org_id uuid NOT NULL,
  project_name text,
  blueprint_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.shared_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their org blueprints"
  ON public.shared_blueprints FOR ALL
  TO authenticated
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Anyone can view shared blueprints by token"
  ON public.shared_blueprints FOR SELECT
  TO anon
  USING (true);
