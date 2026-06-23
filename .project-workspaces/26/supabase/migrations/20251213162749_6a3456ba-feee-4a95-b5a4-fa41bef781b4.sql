-- Create professional applications table
CREATE TABLE public.professional_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  title TEXT NOT NULL,
  specialty TEXT NOT NULL,
  bio TEXT NOT NULL,
  avatar_url TEXT,
  website_url TEXT,
  years_experience INTEGER,
  certifications TEXT,
  linkedin_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  admin_notes TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professional_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application (public form)
CREATE POLICY "Anyone can submit professional applications"
ON public.professional_applications
FOR INSERT
WITH CHECK (true);

-- Users can view their own applications by email
CREATE POLICY "Users can view their own applications"
ON public.professional_applications
FOR SELECT
USING (email = (current_setting('request.jwt.claims', true)::json->>'email'));

-- Admins can view all applications
CREATE POLICY "Admins can view all applications"
ON public.professional_applications
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update applications (approve/deny)
CREATE POLICY "Admins can update applications"
ON public.professional_applications
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete applications
CREATE POLICY "Admins can delete applications"
ON public.professional_applications
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_professional_applications_updated_at
BEFORE UPDATE ON public.professional_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();