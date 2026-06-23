-- Create project_context table for persistent Quinn memory
CREATE TABLE public.project_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  org_id UUID NOT NULL,
  context_type TEXT NOT NULL DEFAULT 'correction',
  directive TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_context ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can manage their org project context"
  ON public.project_context
  FOR ALL
  TO authenticated
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());