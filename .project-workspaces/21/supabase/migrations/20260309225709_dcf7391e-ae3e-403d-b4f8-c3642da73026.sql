CREATE POLICY "Users can delete own presence moments"
ON public.presence_moments FOR DELETE
USING (auth.uid() = user_id);