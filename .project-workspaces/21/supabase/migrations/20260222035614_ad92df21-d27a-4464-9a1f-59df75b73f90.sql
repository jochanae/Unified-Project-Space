-- Fix sms_profiles RLS: tighten INSERT and UPDATE to use auth.uid()
DROP POLICY IF EXISTS "Anyone can insert sms profiles" ON public.sms_profiles;
DROP POLICY IF EXISTS "Anyone can update their sms profile" ON public.sms_profiles;

CREATE POLICY "Users can insert their own sms profile"
ON public.sms_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sms profile"
ON public.sms_profiles FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to read their own sms profile (replace overly broad SELECT)
DROP POLICY IF EXISTS "Service role can read sms profiles" ON public.sms_profiles;
CREATE POLICY "Users can view their own sms profile"
ON public.sms_profiles FOR SELECT
USING (auth.uid() = user_id);

-- Add delete policy for profiles table (was missing)
CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
USING (auth.uid() = user_id);

-- Create favorites table
CREATE TABLE public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id text NOT NULL,
  member_id text NOT NULL,
  post_content text NOT NULL,
  post_image_key text,
  post_time_ago text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
ON public.favorites FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorites"
ON public.favorites FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorites"
ON public.favorites FOR DELETE
USING (auth.uid() = user_id);