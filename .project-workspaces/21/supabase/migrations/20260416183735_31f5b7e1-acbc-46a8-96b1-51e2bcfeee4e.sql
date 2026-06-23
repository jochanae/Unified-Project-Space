-- Phase 4: Think Freely Strategic Poke Level
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS think_freely_poke_level integer NOT NULL DEFAULT 0;

-- Phase 5: Project-Specific Personas
CREATE TABLE IF NOT EXISTS public.user_projects (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  emoji       text DEFAULT '📁',
  description text DEFAULT NULL,
  default_mode text NOT NULL DEFAULT 'strategist',
  color_hex   text DEFAULT '#D4AF37',
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_projects_mode_check CHECK (default_mode IN ('auditor', 'visionary', 'strategist'))
);

ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own projects"
  ON public.user_projects FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_projects_user
  ON public.user_projects(user_id, updated_at DESC)
  WHERE is_active = true;