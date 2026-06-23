
-- Add session_active flag to custom_circles for waiting room enforcement
ALTER TABLE public.custom_circles ADD COLUMN IF NOT EXISTS session_active boolean NOT NULL DEFAULT false;
