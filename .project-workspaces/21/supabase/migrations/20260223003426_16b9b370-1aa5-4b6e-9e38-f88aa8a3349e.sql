
-- Make companion_feed_posts visible to all authenticated users
DROP POLICY IF EXISTS "Users can view their companion posts" ON public.companion_feed_posts;

CREATE POLICY "All authenticated users can view companion posts"
  ON public.companion_feed_posts
  FOR SELECT
  USING (auth.role() = 'authenticated');
