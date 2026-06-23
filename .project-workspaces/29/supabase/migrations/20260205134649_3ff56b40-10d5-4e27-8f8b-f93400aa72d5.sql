-- Add new columns to user_quinn_context for enhanced Quinn profile
ALTER TABLE public.user_quinn_context
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS primary_goal TEXT,
  ADD COLUMN IF NOT EXISTS emergency_fund_status TEXT,
  ADD COLUMN IF NOT EXISTS debt_situation TEXT,
  ADD COLUMN IF NOT EXISTS income_type TEXT,
  ADD COLUMN IF NOT EXISTS brokerages TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS account_types TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS risk_profile JSONB DEFAULT '{"stable": 0, "growth": 0, "active": 0}',
  ADD COLUMN IF NOT EXISTS interested_assets TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS specific_holdings JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS communication_style TEXT DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS learning_topics TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS topics_mastered TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

-- Add comments for clarity
COMMENT ON COLUMN public.user_quinn_context.preferred_name IS 'What the user wants to be called';
COMMENT ON COLUMN public.user_quinn_context.primary_goal IS 'Main financial goal right now';
COMMENT ON COLUMN public.user_quinn_context.emergency_fund_status IS 'none, building, partial, complete';
COMMENT ON COLUMN public.user_quinn_context.debt_situation IS 'none, low_interest, high_interest, mixed';
COMMENT ON COLUMN public.user_quinn_context.income_type IS 'stable, variable, mixed';
COMMENT ON COLUMN public.user_quinn_context.risk_profile IS 'JSON with stable/growth/active percentages';
COMMENT ON COLUMN public.user_quinn_context.communication_style IS 'detailed, concise, balanced';
COMMENT ON COLUMN public.user_quinn_context.last_reviewed_at IS 'When Quinn last reviewed this profile with user';