-- Remove recursive policy that caused infinite recursion between kids_profiles and family_links
DROP POLICY IF EXISTS "Parents can view linked kids profiles" ON public.kids_profiles;