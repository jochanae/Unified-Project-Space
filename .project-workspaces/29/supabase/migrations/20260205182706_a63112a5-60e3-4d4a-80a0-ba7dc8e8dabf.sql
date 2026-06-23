-- Fix profiles table RLS: Remove overly permissive policy and restrict to own profile only

-- Drop the overly permissive policy that allows anyone to view profiles
DROP POLICY IF EXISTS "Anyone can view public profile fields" ON public.profiles;

-- The existing policies are sufficient:
-- "Users can view their own profile" - auth.uid() = user_id
-- "Admins can view all profiles" - is_admin(auth.uid())
-- "Users can insert their own profile" - auth.uid() = user_id
-- "Users can update their own profile" - auth.uid() = user_id

-- Update the community components to use profiles_public view instead of profiles table
-- The profiles_public view already exists and excludes sensitive fields (email, stripe_customer_id)