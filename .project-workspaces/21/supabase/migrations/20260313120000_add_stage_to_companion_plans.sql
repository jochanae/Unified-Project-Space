ALTER TABLE public.companion_plans 
ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'active' 
CHECK (stage IN ('active', 'upcoming', 'someday', 'completed'));
