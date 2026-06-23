-- Table for feed posts generated for created (AI-generated) companions
CREATE TABLE public.companion_feed_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  member_id TEXT NOT NULL,
  content TEXT NOT NULL,
  circle TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companion_feed_posts ENABLE ROW LEVEL SECURITY;

-- Users can view their own companion's posts
CREATE POLICY "Users can view their companion posts"
ON public.companion_feed_posts
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own companion's posts
CREATE POLICY "Users can insert companion posts"
ON public.companion_feed_posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own companion's posts
CREATE POLICY "Users can delete companion posts"
ON public.companion_feed_posts
FOR DELETE
USING (auth.uid() = user_id);

-- Add metadata columns to connections for created companions
ALTER TABLE public.connections
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS personality TEXT,
ADD COLUMN IF NOT EXISTS age TEXT,
ADD COLUMN IF NOT EXISTS handle TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT,
ADD COLUMN IF NOT EXISTS circles JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_created BOOLEAN NOT NULL DEFAULT false;

-- Index for efficient feed loading
CREATE INDEX idx_companion_feed_posts_user ON public.companion_feed_posts(user_id, created_at DESC);