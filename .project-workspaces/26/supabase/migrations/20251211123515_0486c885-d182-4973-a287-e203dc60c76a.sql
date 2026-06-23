-- Create newsletter items table for admin-managed financial news/updates
CREATE TABLE public.newsletter_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT,
  category TEXT NOT NULL DEFAULT 'news',
  source TEXT,
  image_url TEXT,
  video_url TEXT,
  external_link TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  priority INTEGER NOT NULL DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.newsletter_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view published items
CREATE POLICY "Anyone can view published newsletter items"
ON public.newsletter_items
FOR SELECT
USING (is_published = true);

-- Admins can manage all items
CREATE POLICY "Admins can manage newsletter items"
ON public.newsletter_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create updated_at trigger
CREATE TRIGGER update_newsletter_items_updated_at
BEFORE UPDATE ON public.newsletter_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for efficient queries
CREATE INDEX idx_newsletter_items_published ON public.newsletter_items(is_published, published_at DESC);
CREATE INDEX idx_newsletter_items_category ON public.newsletter_items(category);