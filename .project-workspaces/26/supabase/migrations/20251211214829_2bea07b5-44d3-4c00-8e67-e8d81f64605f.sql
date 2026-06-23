-- Add sound effects toggle to kids_profiles
ALTER TABLE public.kids_profiles 
ADD COLUMN sound_effects_enabled boolean NOT NULL DEFAULT true;