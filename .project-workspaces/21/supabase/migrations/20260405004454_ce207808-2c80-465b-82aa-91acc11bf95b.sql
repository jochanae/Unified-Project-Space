CREATE TABLE public.pattern_surfacing_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pattern_type TEXT NOT NULL,
  surface_channel TEXT NOT NULL DEFAULT 'chat',
  surfaced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  engaged BOOLEAN DEFAULT NULL,
  engaged_at TIMESTAMPTZ DEFAULT NULL,
  response_sentiment TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_pattern_surfacing_user ON public.pattern_surfacing_log(user_id, pattern_type);
CREATE INDEX idx_pattern_surfacing_recent ON public.pattern_surfacing_log(user_id, surfaced_at DESC);

ALTER TABLE public.pattern_surfacing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own surfacing logs"
  ON public.pattern_surfacing_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all surfacing logs"
  ON public.pattern_surfacing_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);