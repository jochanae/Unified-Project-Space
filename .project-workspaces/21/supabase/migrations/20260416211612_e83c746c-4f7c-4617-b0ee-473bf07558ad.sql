CREATE TABLE IF NOT EXISTS public.project_blueprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.user_projects(id) ON DELETE CASCADE,
  member_id text NOT NULL,
  mode text NOT NULL DEFAULT 'strategist' CHECK (mode IN ('auditor','visionary','strategist')),
  title text NOT NULL,
  callout text,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_message_excerpt text,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_blueprints_project
  ON public.project_blueprints (project_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_project_blueprints_user
  ON public.project_blueprints (user_id, created_at DESC);

ALTER TABLE public.project_blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own project blueprints"
  ON public.project_blueprints
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);