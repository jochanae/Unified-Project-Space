-- Add kids_mode column for minor accounts (under 18)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS kids_mode boolean NOT NULL DEFAULT false;
