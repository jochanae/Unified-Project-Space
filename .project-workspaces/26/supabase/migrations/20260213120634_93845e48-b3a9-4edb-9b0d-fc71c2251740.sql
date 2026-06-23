
-- Fix infinite recursion: family_links kid policies reference kids_profiles,
-- and kids_profiles parent policy references family_links, causing a loop.

-- Step 1: Drop the problematic kid-side policies on family_links that subquery kids_profiles
DROP POLICY IF EXISTS "Kids can view their own family links" ON public.family_links;
DROP POLICY IF EXISTS "Kids can update their family link status" ON public.family_links;

-- Step 2: Drop duplicate/redundant SELECT policies on kids_profiles
DROP POLICY IF EXISTS "Kids can view their own full profile" ON public.kids_profiles;
DROP POLICY IF EXISTS "Kids can view their own profile" ON public.kids_profiles;
DROP POLICY IF EXISTS "Direct SELECT only for own profile" ON public.kids_profiles;
DROP POLICY IF EXISTS "Deny anonymous access to kids profiles" ON public.kids_profiles;

-- Step 3: Recreate clean kids_profiles SELECT policies (no subquery to family_links for own profile)
CREATE POLICY "Kids can view own profile"
  ON public.kids_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Parents can view linked kids - use a security definer function to avoid recursion
CREATE OR REPLACE FUNCTION public.get_linked_kid_ids(parent_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT kid_profile_id FROM family_links
  WHERE parent_user_id = parent_id AND status = 'active';
$$;

DROP POLICY IF EXISTS "Parents can view linked kids profiles" ON public.kids_profiles;
CREATE POLICY "Parents can view linked kids profiles"
  ON public.kids_profiles FOR SELECT
  USING (id IN (SELECT public.get_linked_kid_ids(auth.uid())));

-- Step 4: Recreate family_links kid policies without subquerying kids_profiles
-- Kids need to see their family links - use a security definer function
CREATE OR REPLACE FUNCTION public.get_kid_profile_ids_for_user(user_uuid uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM kids_profiles WHERE user_id = user_uuid;
$$;

CREATE POLICY "Kids can view their own family links"
  ON public.family_links FOR SELECT
  USING (kid_profile_id IN (SELECT public.get_kid_profile_ids_for_user(auth.uid())));

CREATE POLICY "Kids can update their family link status"
  ON public.family_links FOR UPDATE
  USING (kid_profile_id IN (SELECT public.get_kid_profile_ids_for_user(auth.uid())));
