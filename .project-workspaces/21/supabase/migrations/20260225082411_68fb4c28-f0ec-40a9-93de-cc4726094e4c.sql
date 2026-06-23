
-- ============================================
-- Production Scalability: Missing Indexes
-- ============================================

-- chat_messages: queried on every chat open (user_id + member_id)
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_member 
  ON public.chat_messages (user_id, member_id);

-- companion_feed_posts: queried on every feed load
CREATE INDEX IF NOT EXISTS idx_companion_feed_posts_user 
  ON public.companion_feed_posts (user_id);

-- post_comments: queried per-post
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id 
  ON public.post_comments (post_id);

-- post_reactions: queried per-post
CREATE INDEX IF NOT EXISTS idx_post_reactions_post_id 
  ON public.post_reactions (post_id);

-- notifications: queried every 60s (user_id + read status)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
  ON public.notifications (user_id, read);

-- connections: queried on login and throughout session
CREATE INDEX IF NOT EXISTS idx_connections_user_member 
  ON public.connections (user_id, member_id);

-- blog_posts: slug lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug 
  ON public.blog_posts (slug);

-- user_posts: queried for notifications + feed
CREATE INDEX IF NOT EXISTS idx_user_posts_user_id 
  ON public.user_posts (user_id);

-- favorites: queried on favorites page
CREATE INDEX IF NOT EXISTS idx_favorites_user_id 
  ON public.favorites (user_id);

-- usage_tracking: queried for limit checks (unique constraint already acts as index for user_id+usage_date)
-- No additional index needed

-- profiles.username: add unique constraint to prevent duplicate usernames
-- Allow NULLs (not everyone has set a username yet) but enforce uniqueness on non-null values
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique 
  ON public.profiles (username) WHERE username IS NOT NULL;

-- Add CHECK constraint on user_posts.content length (server-side validation)
ALTER TABLE public.user_posts ADD CONSTRAINT chk_user_posts_content_length 
  CHECK (length(content) <= 2000);

-- Add CHECK constraint on post_comments.content length
ALTER TABLE public.post_comments ADD CONSTRAINT chk_post_comments_content_length 
  CHECK (length(content) <= 1000);
