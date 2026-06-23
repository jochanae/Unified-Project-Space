-- Add optional customizable fields to partners table
ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS tagline text,
ADD COLUMN IF NOT EXISTS contact_info text,
ADD COLUMN IF NOT EXISTS highlights_text text,
ADD COLUMN IF NOT EXISTS external_website_url text;