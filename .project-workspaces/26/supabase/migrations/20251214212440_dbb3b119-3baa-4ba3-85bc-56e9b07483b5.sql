-- SECURITY FIX: Remove dangerous permissive policies and ensure proper access control

-- 1. Fix kids_profiles - Remove the USING (true) UPDATE policy that allows anyone to update any kid's profile
DROP POLICY IF EXISTS "Allow direct kid profile updates" ON public.kids_profiles;

-- Create proper UPDATE policies for kids_profiles
-- Kids can update their own profile
DROP POLICY IF EXISTS "Kids can update their own profile" ON public.kids_profiles;
CREATE POLICY "Kids can update their own profile"
ON public.kids_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Parents can update their linked kids' profiles
DROP POLICY IF EXISTS "Parents can update linked kids profiles" ON public.kids_profiles;
CREATE POLICY "Parents can update linked kids profiles"
ON public.kids_profiles
FOR UPDATE
USING (public.is_parent_of_kid(id, auth.uid()))
WITH CHECK (public.is_parent_of_kid(id, auth.uid()));

-- 2. Ensure profiles table has proper policies (verify no public read access)
-- Drop any potentially dangerous public policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Ensure users can only view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- 3. Fix family_links INSERT policy to prevent unauthorized link creation
-- The current policy allows any parent to create a link to ANY kid profile
-- We need to ensure the parent can only create links to kids they legitimately own
DROP POLICY IF EXISTS "Parents can create family links" ON public.family_links;

-- Parents can only create family links to kids profiles they own (created)
CREATE POLICY "Parents can create family links to own kids"
ON public.family_links
FOR INSERT
WITH CHECK (
  parent_user_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.kids_profiles
    WHERE kids_profiles.id = kid_profile_id
    AND kids_profiles.user_id = auth.uid()
  )
);