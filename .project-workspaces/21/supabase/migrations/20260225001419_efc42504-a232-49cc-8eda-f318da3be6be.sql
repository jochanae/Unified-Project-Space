
-- Create learn_content table for Live & Learn carousel
CREATE TABLE public.learn_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  video_url TEXT,
  thumbnail_url TEXT,
  emoji TEXT NOT NULL DEFAULT '📚',
  age_tag TEXT NOT NULL DEFAULT 'all',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  author_id UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.learn_content ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view published content
CREATE POLICY "Authenticated users can view published content"
ON public.learn_content
FOR SELECT
TO authenticated
USING (published = true);

-- Admins can manage all content
CREATE POLICY "Admins can manage learn content"
ON public.learn_content
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
