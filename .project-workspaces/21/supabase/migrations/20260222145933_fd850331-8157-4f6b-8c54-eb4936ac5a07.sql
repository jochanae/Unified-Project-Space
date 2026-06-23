-- Add user appearance description for shared scenes (Step 14)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_appearance_desc text;