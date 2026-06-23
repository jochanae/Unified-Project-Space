-- Add narrative arc grouping to social_campaigns for Deep Dive missions
ALTER TABLE public.social_campaigns
  ADD COLUMN IF NOT EXISTS campaign_id uuid,
  ADD COLUMN IF NOT EXISTS narrative_day integer,
  ADD COLUMN IF NOT EXISTS narrative_role text,
  ADD COLUMN IF NOT EXISTS campaign_theme text,
  ADD COLUMN IF NOT EXISTS generation_mode text NOT NULL DEFAULT 'deep_dive';

CREATE INDEX IF NOT EXISTS idx_social_campaigns_campaign_id
  ON public.social_campaigns(campaign_id);

CREATE INDEX IF NOT EXISTS idx_social_campaigns_project_created
  ON public.social_campaigns(project_id, created_at DESC);