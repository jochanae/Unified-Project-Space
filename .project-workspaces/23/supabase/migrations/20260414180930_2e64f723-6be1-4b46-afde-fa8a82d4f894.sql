
-- Create subscribers table for email marketing engine
CREATE TABLE public.subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  tags TEXT[] DEFAULT '{}'::TEXT[],
  source TEXT NOT NULL DEFAULT 'manual',
  engagement_score INTEGER NOT NULL DEFAULT 50,
  last_engaged_at TIMESTAMP WITH TIME ZONE,
  subscribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  unsubscribed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(org_id, email)
);

-- Enable RLS
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can manage their org subscribers"
  ON public.subscribers FOR ALL
  TO authenticated
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

-- Index for performance
CREATE INDEX idx_subscribers_org_status ON public.subscribers(org_id, status);
CREATE INDEX idx_subscribers_org_email ON public.subscribers(org_id, email);
CREATE INDEX idx_subscribers_project ON public.subscribers(project_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscribers;
