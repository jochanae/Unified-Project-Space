ALTER TABLE public.companion_plans 
ADD COLUMN checked_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN checklist_reset text DEFAULT NULL;