
-- =============================================
-- 1. detected_patterns table
-- =============================================
CREATE TABLE public.detected_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  pattern_type TEXT NOT NULL,
  pattern_category TEXT NOT NULL DEFAULT 'engagement',
  pattern_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC(3,2) DEFAULT 0.00,
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  surfaced_count INT DEFAULT 0,
  last_surfaced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_detected_patterns_user_active ON public.detected_patterns(user_id, is_active);
CREATE INDEX idx_detected_patterns_user_type ON public.detected_patterns(user_id, pattern_type);
CREATE UNIQUE INDEX idx_detected_patterns_user_type_unique ON public.detected_patterns(user_id, pattern_type);

ALTER TABLE public.detected_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own patterns"
  ON public.detected_patterns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all patterns"
  ON public.detected_patterns FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 2. notification_responses table
-- =============================================
CREATE TABLE public.notification_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  response_delay_seconds INT,
  engaged BOOLEAN DEFAULT false,
  response_action TEXT,
  day_of_week TEXT NOT NULL,
  time_of_day TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notification_responses_user ON public.notification_responses(user_id, sent_at DESC);
CREATE INDEX idx_notification_responses_type ON public.notification_responses(user_id, notification_type);

ALTER TABLE public.notification_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification responses"
  ON public.notification_responses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification responses"
  ON public.notification_responses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all notification responses"
  ON public.notification_responses FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================
-- 3. Extend usage_tracking with activity timestamps
-- =============================================
ALTER TABLE public.usage_tracking
  ADD COLUMN IF NOT EXISTS first_activity_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
