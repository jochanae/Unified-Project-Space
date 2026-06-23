-- Add appearance columns to connections table for per-connection visual identity
ALTER TABLE public.connections 
  ADD COLUMN IF NOT EXISTS appearance_desc text,
  ADD COLUMN IF NOT EXISTS reference_image_url text;

-- Allow users to update their own connections (already exists but adding for safety)
-- RLS already covers UPDATE for connections