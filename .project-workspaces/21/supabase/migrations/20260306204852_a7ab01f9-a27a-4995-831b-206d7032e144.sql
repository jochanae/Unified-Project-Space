
-- Rate limits are managed by security definer functions (check_rate_limit, cleanup_rate_limits)
-- so direct table access isn't needed. But we add minimal policies for safety.

CREATE POLICY "Users can view their own rate limits"
ON public.rate_limits FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rate limits"
ON public.rate_limits FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rate limits"
ON public.rate_limits FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rate limits"
ON public.rate_limits FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
