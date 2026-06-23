CREATE POLICY "Inviters can delete their own pending invites"
ON public.thread_connections
FOR DELETE
TO public
USING (auth.uid() = inviter_id AND status = 'pending');