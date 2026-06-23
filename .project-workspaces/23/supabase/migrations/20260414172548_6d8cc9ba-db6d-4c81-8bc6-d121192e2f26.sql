ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS brand_primary_color text DEFAULT '#6366f1',
  ADD COLUMN IF NOT EXISTS brand_name text;