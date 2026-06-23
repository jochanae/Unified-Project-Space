ALTER TABLE public.companion_plans 
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'reminder',
  ADD COLUMN IF NOT EXISTS steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS companion_note text,
  ADD COLUMN IF NOT EXISTS playbook_theme text,
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'active';