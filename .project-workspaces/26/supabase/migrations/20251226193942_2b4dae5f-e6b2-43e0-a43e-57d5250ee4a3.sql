
-- Drop the old policy that targets wrong role
DROP POLICY IF EXISTS "Parents can view linked kids profiles" ON public.kids_profiles;

-- Create correctly targeting authenticated users
CREATE POLICY "Parents can view linked kids profiles" 
ON public.kids_profiles 
FOR SELECT 
TO authenticated
USING (
  id IN (
    SELECT kid_profile_id 
    FROM public.family_links 
    WHERE parent_user_id = auth.uid() 
    AND status = 'active'
  )
);
