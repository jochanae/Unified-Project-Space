
CREATE TABLE public.bug_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_stack TEXT,
  page_url TEXT,
  user_agent TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;

-- Anyone can insert bug reports (even unauthenticated crash reports)
CREATE POLICY "Anyone can insert bug reports"
  ON public.bug_reports FOR INSERT
  WITH CHECK (true);

-- Admins can view all bug reports
CREATE POLICY "Admins can view bug reports"
  ON public.bug_reports FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update bug reports
CREATE POLICY "Admins can update bug reports"
  ON public.bug_reports FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete bug reports
CREATE POLICY "Admins can delete bug reports"
  ON public.bug_reports FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
