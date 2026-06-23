-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Parents can view linked kids profiles" ON public.kids_profiles;

-- Create a SECURITY DEFINER function to check parent access without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_parent_of_kid(kid_id uuid, parent_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM family_links
    WHERE family_links.kid_profile_id = kid_id
      AND family_links.parent_user_id = parent_id
      AND family_links.status = 'active'
  );
$$;

-- Recreate the policy using the SECURITY DEFINER function
CREATE POLICY "Parents can view linked kids profiles"
ON public.kids_profiles
FOR SELECT
USING (
  is_parent_of_kid(id, auth.uid())
);