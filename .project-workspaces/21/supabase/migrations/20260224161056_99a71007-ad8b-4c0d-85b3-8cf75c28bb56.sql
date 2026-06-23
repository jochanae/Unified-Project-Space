-- Add studio_selections JSONB column to connections table for per-companion studio choices
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS studio_selections jsonb DEFAULT NULL;