-- These indexes prevent full table scans as data grows

-- chat_messages: the most queried table at scale
-- Covers the primary fetch pattern: user + member + time
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_member_time
  ON public.chat_messages (user_id, member_id, created_at DESC);

-- chat_messages: covers the archive job query
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at
  ON public.chat_messages (created_at);

-- memories: covers the proactive recall fetch
CREATE INDEX IF NOT EXISTS idx_memories_user_member_category
  ON public.memories (user_id, member_id, category);

-- companion_feed_posts: covers dashboard feed query  
CREATE INDEX IF NOT EXISTS idx_feed_posts_user_created
  ON public.companion_feed_posts (user_id, created_at DESC);

-- connections: covers the active connections fetch
CREATE INDEX IF NOT EXISTS idx_connections_user_archived
  ON public.connections (user_id, is_archived);
