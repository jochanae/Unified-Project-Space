
-- Restrict INSERT to own user_id only (server-side functions use SECURITY DEFINER so bypass RLS)
CREATE POLICY "Users can only insert own usage tracking"
ON public.usage_tracking
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Restrict UPDATE to own rows
CREATE POLICY "Users can only update own usage tracking"
ON public.usage_tracking
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Restrict DELETE to own rows
CREATE POLICY "Users can only delete own usage tracking"
ON public.usage_tracking
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
