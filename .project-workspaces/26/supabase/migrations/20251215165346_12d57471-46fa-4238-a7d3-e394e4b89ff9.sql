-- Add UPDATE policy for family_chat_messages so kids can mark messages as read
CREATE POLICY "Family members can update chat messages"
ON public.family_chat_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.id = family_chat_messages.family_link_id
    AND (
      family_links.parent_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.kids_profiles
        WHERE kids_profiles.id = family_links.kid_profile_id
        AND kids_profiles.user_id = auth.uid()
      )
    )
    AND family_links.status = 'active'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.family_links
    WHERE family_links.id = family_chat_messages.family_link_id
    AND (
      family_links.parent_user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.kids_profiles
        WHERE kids_profiles.id = family_links.kid_profile_id
        AND kids_profiles.user_id = auth.uid()
      )
    )
    AND family_links.status = 'active'
  )
);