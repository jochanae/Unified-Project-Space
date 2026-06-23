-- Drop the unique constraint on user_id to allow multiple kid profiles per user
ALTER TABLE public.kid_profiles DROP CONSTRAINT kid_profiles_user_id_key;