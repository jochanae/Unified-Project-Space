-- Create lesson_favorites table for Money Academy
CREATE TABLE public.lesson_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Enable Row Level Security
ALTER TABLE public.lesson_favorites ENABLE ROW LEVEL SECURITY;

-- Users can view their own favorites
CREATE POLICY "Users can view their own lesson favorites" 
ON public.lesson_favorites 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can add their own favorites
CREATE POLICY "Users can add their own lesson favorites" 
ON public.lesson_favorites 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can remove their own favorites
CREATE POLICY "Users can delete their own lesson favorites" 
ON public.lesson_favorites 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX idx_lesson_favorites_user_id ON public.lesson_favorites(user_id);
CREATE INDEX idx_lesson_favorites_lesson_id ON public.lesson_favorites(lesson_id);