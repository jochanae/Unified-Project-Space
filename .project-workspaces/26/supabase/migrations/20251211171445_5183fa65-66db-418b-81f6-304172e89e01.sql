-- Add content field to learning_content for full lesson text (324+ words)
ALTER TABLE public.learning_content 
ADD COLUMN IF NOT EXISTS content TEXT;

-- Add content field to newsletter_items if not exists
ALTER TABLE public.newsletter_items 
ADD COLUMN IF NOT EXISTS content TEXT;