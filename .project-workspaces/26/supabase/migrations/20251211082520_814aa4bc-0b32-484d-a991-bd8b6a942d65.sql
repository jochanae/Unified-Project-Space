-- Add first_name, last_name, and unique username to kids_profiles
ALTER TABLE public.kids_profiles 
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text,
ADD COLUMN IF NOT EXISTS username text;

-- Create unique index on username (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS kids_profiles_username_unique 
ON public.kids_profiles (lower(username));

-- Update display_name to be nullable since we'll use first_name + last_name
ALTER TABLE public.kids_profiles 
ALTER COLUMN display_name DROP NOT NULL;