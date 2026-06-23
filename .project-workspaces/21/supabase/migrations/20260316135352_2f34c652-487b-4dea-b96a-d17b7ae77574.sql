
-- Security definer function: can the caller see this post?
CREATE OR REPLACE FUNCTION public.can_view_post(_post_id text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    -- User's own post (user_posts)
    SELECT 1 FROM public.user_posts
    WHERE id::text = _post_id
      AND (user_id = _user_id OR (thread_friend_id = _user_id AND visibility = 'thread'))
  )
  OR EXISTS (
    -- Companion feed post (owned by user)
    SELECT 1 FROM public.companion_feed_posts
    WHERE id::text = _post_id
      AND user_id = _user_id
  )
$$;

-- Drop old permissive SELECT policies
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.post_comments;
DROP POLICY IF EXISTS "Authenticated users can view reactions" ON public.post_reactions;

-- New SELECT policy: comments visible only if caller can see the parent post
CREATE POLICY "Users can view comments on visible posts"
  ON public.post_comments
  FOR SELECT
  TO authenticated
  USING (public.can_view_post(post_id, auth.uid()));

-- New SELECT policy: reactions visible only if caller can see the parent post
CREATE POLICY "Users can view reactions on visible posts"
  ON public.post_reactions
  FOR SELECT
  TO authenticated
  USING (public.can_view_post(post_id, auth.uid()));
