-- Add INSERT policy for kids to add their own chores
CREATE POLICY "Kids can insert their own chores"
ON public.kid_chores
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM kids_profiles
  WHERE kids_profiles.id = kid_chores.kid_id
  AND kids_profiles.user_id = auth.uid()
));

-- Add DELETE policy for kids to delete their own chores
CREATE POLICY "Kids can delete their own chores"
ON public.kid_chores
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM kids_profiles
  WHERE kids_profiles.id = kid_chores.kid_id
  AND kids_profiles.user_id = auth.uid()
));