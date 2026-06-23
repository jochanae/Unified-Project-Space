-- Plan events for Workspace generator + calendar feed
CREATE TABLE public.plan_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  plan_id UUID NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  category TEXT NOT NULL DEFAULT 'general',
  rrule TEXT,
  source TEXT NOT NULL DEFAULT 'workspace',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_plan_events_user_starts ON public.plan_events(user_id, starts_at);

ALTER TABLE public.plan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own plan events" ON public.plan_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own plan events" ON public.plan_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own plan events" ON public.plan_events FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own plan events" ON public.plan_events FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER plan_events_set_updated_at BEFORE UPDATE ON public.plan_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Calendar subscribe tokens (rotatable per-user secret in URL)
CREATE TABLE public.calendar_tokens (
  user_id UUID PRIMARY KEY,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rotated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_calendar_tokens_token ON public.calendar_tokens(token);

ALTER TABLE public.calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own calendar token" ON public.calendar_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own calendar token" ON public.calendar_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own calendar token" ON public.calendar_tokens FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own calendar token" ON public.calendar_tokens FOR DELETE USING (auth.uid() = user_id);