-- Add proper policy for kids to view their own family chat messages
CREATE POLICY "Kids can view their family chat messages"
ON public.family_chat_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM family_links
    JOIN kids_profiles ON kids_profiles.id = family_links.kid_profile_id
    WHERE family_links.id = family_chat_messages.family_link_id
    AND kids_profiles.user_id = auth.uid()
    AND family_links.status = 'active'
  )
);