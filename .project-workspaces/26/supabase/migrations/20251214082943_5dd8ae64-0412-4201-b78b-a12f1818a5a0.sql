-- SECURITY FIX: Remove dangerous public RLS policies that expose all kids' data
-- These policies allowed ANYONE to read or update ANY kid's profile

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Allow public username lookup for login" ON public.kids_profiles;

-- Drop the dangerous UPDATE policies that allow anyone to update any profile
DROP POLICY IF EXISTS "Allow direct kid profile update" ON public.kids_profiles;
DROP POLICY IF EXISTS "Allow direct kid profile updates" ON public.kids_profiles;

-- Add admin-only SELECT policy for card_interest table (lead generation data)
CREATE POLICY "Admins can view all card interest submissions"
ON public.card_interest
FOR SELECT
USING (public.is_admin(auth.uid()));