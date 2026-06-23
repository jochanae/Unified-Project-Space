-- Add checklist completion state to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_checklist_completed jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS welcome_checklist_hidden boolean DEFAULT false;