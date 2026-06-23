-- Create post_comments table
CREATE TABLE public.post_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id text NOT NULL,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  username text,
  avatar_url text,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view comments" ON public.post_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own comments" ON public.post_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.post_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Add UPDATE policy for user_posts so editing works
CREATE POLICY "Users can update their own posts" ON public.user_posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Add bio column to profiles
ALTER TABLE public.profiles ADD COLUMN bio text;

-- Enable realtime for post_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;
