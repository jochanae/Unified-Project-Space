
-- Create companion_plans table for structured plans/recommendations from companions
CREATE TABLE public.companion_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  member_id TEXT NOT NULL,
  companion_name TEXT NOT NULL DEFAULT 'Your companion',
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  emoji TEXT NOT NULL DEFAULT '📋',
  schedule JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  source TEXT NOT NULL DEFAULT 'chat',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS
ALTER TABLE public.companion_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plans"
  ON public.companion_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own plans"
  ON public.companion_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own plans"
  ON public.companion_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own plans"
  ON public.companion_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_companion_plans_user_active ON public.companion_plans (user_id, status) WHERE status = 'active';

-- Unique index to prevent duplicate plans
CREATE UNIQUE INDEX idx_companion_plans_unique ON public.companion_plans (user_id, title) WHERE status = 'active';

-- Trigger for updated_at
CREATE TRIGGER update_companion_plans_updated_at
  BEFORE UPDATE ON public.companion_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
