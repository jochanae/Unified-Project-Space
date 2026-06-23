-- Add image style preference to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS image_style text NOT NULL DEFAULT 'photorealistic';
-- Valid values: 'photorealistic', 'anime', 'illustrated', 'abstract'