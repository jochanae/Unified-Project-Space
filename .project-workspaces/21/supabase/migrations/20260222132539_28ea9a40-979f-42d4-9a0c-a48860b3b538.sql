
-- Add connection_mode to profiles
ALTER TABLE public.profiles 
ADD COLUMN connection_mode text NOT NULL DEFAULT 'unsure' 
CHECK (connection_mode IN ('abstract', 'personal', 'unsure'));

-- Add companion_reference_image_url for uploaded reference photos
ALTER TABLE public.profiles
ADD COLUMN companion_reference_image_url text;
