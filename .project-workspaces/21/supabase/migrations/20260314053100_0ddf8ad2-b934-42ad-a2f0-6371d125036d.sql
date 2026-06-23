
-- Add thread columns to user_posts
ALTER TABLE public.user_posts
  ADD COLUMN IF NOT EXISTS thread_friend_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

-- Update RLS: allow users to see thread posts sent TO them
DROP POLICY IF EXISTS "Authenticated users can view user posts" ON public.user_posts;

CREATE POLICY "Users can view relevant posts"
  ON public.user_posts
  FOR SELECT
  TO public
  USING (
    auth.role() = 'authenticated' AND (
      user_id = auth.uid()
      OR (thread_friend_id = auth.uid() AND visibility = 'thread')
    )
  );
