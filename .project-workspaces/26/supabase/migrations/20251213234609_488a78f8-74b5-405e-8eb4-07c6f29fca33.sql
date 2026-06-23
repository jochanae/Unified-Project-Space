-- Add calendar_url column to professionals table
ALTER TABLE public.professionals 
ADD COLUMN calendar_url text;

-- Add calendar_url column to professional_applications table
ALTER TABLE public.professional_applications 
ADD COLUMN calendar_url text;