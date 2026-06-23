-- Quinn Cards: structured visual cards Quinn emits during chat or users pin manually
CREATE TABLE public.quinn_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_type TEXT NOT NULL CHECK (card_type IN ('strategy_comparison', 'tax_alert', 'blueprint_proposal', 'risk_assessment', 'insight', 'manual_pin')),
  title TEXT NOT NULL,
  callout TEXT,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'quinn' CHECK (source IN ('quinn', 'user')),
  source_message_excerpt TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quinn_cards_user_pinned ON public.quinn_cards(user_id, pinned, created_at DESC);
CREATE INDEX idx_quinn_cards_user_type ON public.quinn_cards(user_id, card_type, created_at DESC);

ALTER TABLE public.quinn_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own cards"
  ON public.quinn_cards FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users create their own cards"
  ON public.quinn_cards FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own cards"
  ON public.quinn_cards FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete their own cards"
  ON public.quinn_cards FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_quinn_cards_updated_at
  BEFORE UPDATE ON public.quinn_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Quinn Private Usage: zero-trace mode daily counter (no content stored, just counts)
CREATE TABLE public.quinn_private_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, usage_date)
);

CREATE INDEX idx_quinn_private_usage_user_date ON public.quinn_private_usage(user_id, usage_date);

ALTER TABLE public.quinn_private_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own private usage"
  ON public.quinn_private_usage FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages private usage"
  ON public.quinn_private_usage FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_quinn_private_usage_updated_at
  BEFORE UPDATE ON public.quinn_private_usage
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to safely increment private usage (avoids race conditions)
CREATE OR REPLACE FUNCTION public.increment_quinn_private_usage(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO public.quinn_private_usage (user_id, usage_date, message_count)
  VALUES (p_user_id, CURRENT_DATE, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET message_count = quinn_private_usage.message_count + 1, updated_at = now()
  RETURNING message_count INTO v_count;
  RETURN v_count;
END;
$$;