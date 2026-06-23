
-- Create user_posts table for user-generated community posts
CREATE TABLE public.user_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  username text,
  avatar_url text,
  content text NOT NULL,
  circle text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_posts ENABLE ROW LEVEL SECURITY;

-- Everyone can view all user posts (community feed)
CREATE POLICY "Anyone can view user posts"
  ON public.user_posts FOR SELECT
  USING (true);

-- Users can insert their own posts
CREATE POLICY "Users can insert their own posts"
  ON public.user_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete their own posts"
  ON public.user_posts FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_posts;
