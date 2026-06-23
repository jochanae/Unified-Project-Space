-- Allow parents to view profiles of kids they are linked to
CREATE POLICY "Parents can view linked kids profiles" 
ON public.kids_profiles 
FOR SELECT 
USING (
  id IN (
    SELECT kid_profile_id 
    FROM public.family_links 
    WHERE parent_user_id = auth.uid() 
    AND status = 'active'
  )
);