-- Create lesson_sections table for storing lesson content sections
CREATE TABLE public.lesson_sections (
  id text PRIMARY KEY,
  lesson_id text NOT NULL,
  section_number integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  content text,
  section_type text NOT NULL DEFAULT 'text',
  estimated_minutes integer DEFAULT 5,
  key_points text[] DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster lookups by lesson_id
CREATE INDEX idx_lesson_sections_lesson_id ON public.lesson_sections(lesson_id);

-- Enable RLS
ALTER TABLE public.lesson_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can view lesson sections (public content)
CREATE POLICY "Anyone can view lesson sections" 
ON public.lesson_sections 
FOR SELECT 
USING (true);

-- Admins can manage lesson sections
CREATE POLICY "Admins can manage lesson sections" 
ON public.lesson_sections 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));