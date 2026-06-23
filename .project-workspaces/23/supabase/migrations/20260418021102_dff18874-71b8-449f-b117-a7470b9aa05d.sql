-- Social Labs: campaign distribution table
CREATE TABLE public.social_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL,
  project_id UUID,
  created_by UUID,
  platform TEXT NOT NULL DEFAULT 'instagram', -- instagram, linkedin, tiktok, twitter, facebook
  content_type TEXT NOT NULL DEFAULT 'post',  -- post, reel, story, article, short
  hook TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  hashtags TEXT[] NOT NULL DEFAULT '{}',
  cta TEXT,
  media_suggestion TEXT,
  audio_suggestion TEXT,
  signal_source_id UUID,         -- references project_context blueprint
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, posted, archived
  refinement_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage their social campaigns"
ON public.social_campaigns
FOR ALL
TO authenticated
USING (org_id = get_user_org_id())
WITH CHECK (org_id = get_user_org_id());

CREATE TRIGGER update_social_campaigns_updated_at
BEFORE UPDATE ON public.social_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_social_campaigns_org ON public.social_campaigns(org_id, created_at DESC);
CREATE INDEX idx_social_campaigns_project ON public.social_campaigns(project_id, scheduled_at);