
-- 1. Restrict companion_feed_posts to owner-only visibility (was: all authenticated)
DROP POLICY IF EXISTS "All authenticated users can view companion posts" ON public.companion_feed_posts;
CREATE POLICY "Users can view their own companion posts"
  ON public.companion_feed_posts
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2. Require authentication for viewing comments (was: true = anyone including anon)
DROP POLICY IF EXISTS "Anyone can view comments" ON public.post_comments;
CREATE POLICY "Authenticated users can view comments"
  ON public.post_comments
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 3. Require authentication for viewing reactions (was: true = anyone including anon)
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.post_reactions;
CREATE POLICY "Authenticated users can view reactions"
  ON public.post_reactions
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Require authentication for viewing user posts (was: true = anyone including anon)
DROP POLICY IF EXISTS "Anyone can view user posts" ON public.user_posts;
CREATE POLICY "Authenticated users can view user posts"
  ON public.user_posts
  FOR SELECT
  USING (auth.role() = 'authenticated');
