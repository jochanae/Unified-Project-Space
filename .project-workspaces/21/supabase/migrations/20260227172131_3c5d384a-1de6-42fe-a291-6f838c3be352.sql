CREATE POLICY "Owners can delete any circle message"
  ON public.circle_messages FOR DELETE
  USING (
    is_circle_owner(circle_id, auth.uid())
  );