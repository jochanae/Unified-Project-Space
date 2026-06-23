
-- Beta test submissions table (one per tester)
CREATE TABLE public.beta_test_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tester_name TEXT NOT NULL,
  tester_email TEXT NOT NULL,
  device_info TEXT,
  browser_info TEXT,
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  general_feedback TEXT,
  suggestions TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Beta test step results table (one per step per submission)
CREATE TABLE public.beta_test_step_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.beta_test_submissions(id) ON DELETE CASCADE,
  step_category TEXT NOT NULL,
  step_name TEXT NOT NULL,
  step_description TEXT,
  passed BOOLEAN NOT NULL DEFAULT true,
  comment TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beta_test_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beta_test_step_results ENABLE ROW LEVEL SECURITY;

-- Public insert policy (testers don't need to be logged in)
CREATE POLICY "Anyone can submit beta tests"
ON public.beta_test_submissions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can insert step results"
ON public.beta_test_step_results
FOR INSERT
WITH CHECK (true);

-- Only admins can read/update/delete submissions
CREATE POLICY "Admins can manage beta test submissions"
ON public.beta_test_submissions
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage beta test step results"
ON public.beta_test_step_results
FOR ALL
USING (public.is_admin(auth.uid()));

-- Indexes
CREATE INDEX idx_beta_submissions_email ON public.beta_test_submissions(tester_email);
CREATE INDEX idx_beta_submissions_status ON public.beta_test_submissions(status);
CREATE INDEX idx_beta_step_results_submission ON public.beta_test_step_results(submission_id);

-- Updated at trigger
CREATE TRIGGER update_beta_test_submissions_updated_at
BEFORE UPDATE ON public.beta_test_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
