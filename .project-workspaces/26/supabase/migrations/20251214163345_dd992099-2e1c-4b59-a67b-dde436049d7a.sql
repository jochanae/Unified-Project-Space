-- Add preference columns to existing user_settings table
ALTER TABLE public.user_settings 
  ADD COLUMN IF NOT EXISTS navigation_preferences jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS privacy_preferences jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS appearance_preferences jsonb DEFAULT '{}'::jsonb;

-- Create kid_notes table
CREATE TABLE public.kid_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kid_id uuid NOT NULL REFERENCES public.kids_profiles(id) ON DELETE CASCADE,
  parent_user_id uuid NOT NULL,
  title text,
  content text NOT NULL,
  note_type text DEFAULT 'general',
  is_pinned boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create admin_emails table for database-driven admin access
CREATE TABLE public.admin_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  added_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert initial admin emails
INSERT INTO public.admin_emails (email) VALUES 
  ('admin@coinsbloom.com'),
  ('jochanae@gmail.com');

-- Enable RLS
ALTER TABLE public.kid_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY;

-- Kid notes policies
CREATE POLICY "Parents can view notes for their kids" ON public.kid_notes
  FOR SELECT USING (auth.uid() = parent_user_id);

CREATE POLICY "Parents can create notes for their kids" ON public.kid_notes
  FOR INSERT WITH CHECK (auth.uid() = parent_user_id);

CREATE POLICY "Parents can update their notes" ON public.kid_notes
  FOR UPDATE USING (auth.uid() = parent_user_id);

CREATE POLICY "Parents can delete their notes" ON public.kid_notes
  FOR DELETE USING (auth.uid() = parent_user_id);

-- Admin emails policies - admins can view and manage
CREATE POLICY "Admins can view admin emails" ON public.admin_emails
  FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert admin emails" ON public.admin_emails
  FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete admin emails" ON public.admin_emails
  FOR DELETE USING (is_admin(auth.uid()));

-- Create function to check admin by email from table
CREATE OR REPLACE FUNCTION public.is_admin_by_email(check_email text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_emails WHERE LOWER(email) = LOWER(check_email)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for updated_at on kid_notes
CREATE TRIGGER update_kid_notes_updated_at
  BEFORE UPDATE ON public.kid_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();