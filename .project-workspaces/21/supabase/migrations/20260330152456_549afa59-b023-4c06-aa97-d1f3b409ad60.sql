
DROP POLICY "Users can insert guestbook entries" ON public.circle_guestbook;

CREATE POLICY "Users can insert guestbook entries"
ON public.circle_guestbook
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND is_circle_member(circle_id, auth.uid())
);
