-- Relax family_links INSERT policy so parents can link to any valid kid profile
-- while still ensuring they can only create links for themselves.

-- Drop the overly restrictive policy that requires the parent to "own" the kid profile
DROP POLICY IF EXISTS "Parents can create family links to own kids" ON public.family_links;

-- New policy: any authenticated user can create a family_link record
-- as long as parent_user_id matches their own user id.
CREATE POLICY "Parents can create family links"
ON public.family_links
FOR INSERT
WITH CHECK (
  parent_user_id = auth.uid()
);
