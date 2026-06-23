-- Create bug_reports table for storing user-reported issues
CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_stack TEXT,
  page_url TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  resolved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can submit bug reports (even if not logged in)
CREATE POLICY "Anyone can submit bug reports"
ON public.bug_reports
FOR INSERT
WITH CHECK (true);

-- Admins can view all bug reports
CREATE POLICY "Admins can view bug reports"
ON public.bug_reports
FOR SELECT
USING (is_admin(auth.uid()));

-- Admins can update bug reports (to mark resolved, add notes)
CREATE POLICY "Admins can update bug reports"
ON public.bug_reports
FOR UPDATE
USING (is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_bug_reports_status ON public.bug_reports(status);
CREATE INDEX idx_bug_reports_created_at ON public.bug_reports(created_at DESC);