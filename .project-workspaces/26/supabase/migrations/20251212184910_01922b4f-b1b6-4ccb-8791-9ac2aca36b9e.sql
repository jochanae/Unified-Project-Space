-- Add video-specific columns to learning_content table
ALTER TABLE public.learning_content 
  ADD COLUMN IF NOT EXISTS video_id TEXT,
  ADD COLUMN IF NOT EXISTS subcategory TEXT,
  ADD COLUMN IF NOT EXISTS video_type TEXT DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS tags TEXT[],
  ADD COLUMN IF NOT EXISTS chapters JSONB,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_learning_content_category ON public.learning_content(category);
CREATE INDEX IF NOT EXISTS idx_learning_content_type ON public.learning_content(type);
CREATE INDEX IF NOT EXISTS idx_learning_content_age_group ON public.learning_content(age_group);