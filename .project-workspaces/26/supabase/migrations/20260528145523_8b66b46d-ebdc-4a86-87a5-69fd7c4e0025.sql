
CREATE TABLE public.bloom_price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  target_price NUMERIC NOT NULL CHECK (target_price > 0),
  direction TEXT NOT NULL CHECK (direction IN ('above','below')),
  is_triggered BOOLEAN NOT NULL DEFAULT false,
  triggered_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bloom_price_alerts_user_idx ON public.bloom_price_alerts(user_id, is_triggered);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bloom_price_alerts TO authenticated;
GRANT ALL ON public.bloom_price_alerts TO service_role;

ALTER TABLE public.bloom_price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own price alerts"
  ON public.bloom_price_alerts FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own price alerts"
  ON public.bloom_price_alerts FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own price alerts"
  ON public.bloom_price_alerts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own price alerts"
  ON public.bloom_price_alerts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER bloom_price_alerts_set_updated_at
  BEFORE UPDATE ON public.bloom_price_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
