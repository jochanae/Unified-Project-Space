-- Add recovery email to kids_profiles for standalone PIN reset
ALTER TABLE public.kids_profiles 
ADD COLUMN recovery_email text;

-- Add index for faster lookups by display_name (used for login)
CREATE INDEX idx_kids_profiles_display_name ON public.kids_profiles(display_name);