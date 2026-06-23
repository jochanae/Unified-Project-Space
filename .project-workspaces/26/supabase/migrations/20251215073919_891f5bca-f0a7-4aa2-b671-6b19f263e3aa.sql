-- Add RLS policy for parents to update linked kids profiles
-- Uses the existing is_parent_of_kid security definer function

CREATE POLICY "Parents can update linked kids profiles"
ON public.kids_profiles
FOR UPDATE
USING (public.is_parent_of_kid(id, auth.uid()))
WITH CHECK (public.is_parent_of_kid(id, auth.uid()));