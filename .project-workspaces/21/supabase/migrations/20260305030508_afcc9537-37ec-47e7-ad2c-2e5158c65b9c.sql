-- Allow users to update their own memories (for editing)
CREATE POLICY "Users can update their own memories"
ON public.memories
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);