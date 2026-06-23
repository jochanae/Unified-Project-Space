-- Create beta test submissions table
CREATE TABLE public.beta_test_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tester_name TEXT NOT NULL,
  device TEXT,
  browser TEXT,
  checklist_data JSONB NOT NULL,
  bugs_reported TEXT,
  suggestions TEXT,
  general_feedback TEXT,
  progress_percent INTEGER DEFAULT 0,
  items_completed INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beta_test_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (testers don't need to be logged in)
CREATE POLICY "Anyone can submit beta test feedback"
ON public.beta_test_submissions
FOR INSERT
WITH CHECK (true);

-- Only admins can view submissions
CREATE POLICY "Admins can view beta test submissions"
ON public.beta_test_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'admin'
  )
);

-- Create index for faster queries
CREATE INDEX idx_beta_test_submissions_created_at ON public.beta_test_submissions(created_at DESC);