-- Add voice_id to connections for per-companion voice selection
ALTER TABLE public.connections ADD COLUMN IF NOT EXISTS voice_id text;