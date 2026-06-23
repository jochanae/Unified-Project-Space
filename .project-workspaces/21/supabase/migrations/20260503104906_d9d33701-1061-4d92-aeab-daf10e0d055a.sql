ALTER TABLE public.chat_artifacts
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.user_projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_artifacts_project
  ON public.chat_artifacts (user_id, project_id, created_at DESC)
  WHERE project_id IS NOT NULL;