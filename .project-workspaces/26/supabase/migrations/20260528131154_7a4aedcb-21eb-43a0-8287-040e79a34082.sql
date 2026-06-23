
CREATE TABLE public.bloom_watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bloom_watchlist TO authenticated;
GRANT ALL ON public.bloom_watchlist TO service_role;

ALTER TABLE public.bloom_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watchlist_owner_select" ON public.bloom_watchlist
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "watchlist_owner_insert" ON public.bloom_watchlist
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlist_owner_update" ON public.bloom_watchlist
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "watchlist_owner_delete" ON public.bloom_watchlist
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_bloom_watchlist_user ON public.bloom_watchlist(user_id);
