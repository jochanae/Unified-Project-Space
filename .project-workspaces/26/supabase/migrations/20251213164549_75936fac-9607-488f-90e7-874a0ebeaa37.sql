-- Add specialties array and states_licensed to professional_applications
ALTER TABLE public.professional_applications 
ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS states_licensed text[] DEFAULT '{}';

-- Add specialties array and states_licensed to professionals table
ALTER TABLE public.professionals 
ADD COLUMN IF NOT EXISTS specialties text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS states_licensed text[] DEFAULT '{}';