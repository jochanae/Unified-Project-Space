-- Remove the direct parent UPDATE policy that could expose sensitive fields
DROP POLICY IF EXISTS "Parents can update linked kids profiles" ON public.kids_profiles;

-- Parents must use parent_update_kid_profile() function instead
-- This function already exists and explicitly excludes pin_hash, security_answer, security_question

-- Also ensure parents cannot directly SELECT sensitive fields by removing any overly broad SELECT policies
-- The existing "Direct SELECT only for own profile" is correct (user_id = auth.uid())
-- Parents should use get_kid_profile_for_parent() or get_linked_kids_profiles() which exclude sensitive fields