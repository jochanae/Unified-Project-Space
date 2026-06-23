-- Add columns for guidance plans (plans with steps but no scheduled time)
ALTER TABLE public.companion_plans ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'reminder' CHECK (plan_type IN ('reminder', 'guidance'));
ALTER TABLE public.companion_plans ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.companion_plans ADD COLUMN IF NOT EXISTS companion_note TEXT;
ALTER TABLE public.companion_plans ADD COLUMN IF NOT EXISTS playbook_theme TEXT;
