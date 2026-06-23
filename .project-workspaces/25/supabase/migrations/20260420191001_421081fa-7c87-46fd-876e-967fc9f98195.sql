
CREATE TYPE public.contribution_category AS ENUM ('tithe','offering','dues','other');

CREATE TABLE public.finance_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category public.contribution_category NOT NULL DEFAULT 'tithe',
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  recipient TEXT,
  memo TEXT,
  entry_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own entries"
  ON public.finance_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users add their own entries"
  ON public.finance_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update their own entries"
  ON public.finance_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete their own entries"
  ON public.finance_entries FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_finance_user_date ON public.finance_entries(user_id, entry_date DESC);

CREATE TRIGGER finance_entries_set_updated_at
  BEFORE UPDATE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
