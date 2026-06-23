-- Add mature_mode flag to profiles (requires premium + age verification)
ALTER TABLE public.profiles ADD COLUMN mature_mode boolean NOT NULL DEFAULT false;