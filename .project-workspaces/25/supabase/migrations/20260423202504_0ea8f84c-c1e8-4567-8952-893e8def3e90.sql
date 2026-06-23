-- 1. Tag finance entries with the payment link they were sent through
ALTER TABLE public.finance_entries
  ADD COLUMN IF NOT EXISTS payment_link_id UUID REFERENCES public.user_payment_links(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS finance_entries_payment_link_idx
  ON public.finance_entries(payment_link_id) WHERE payment_link_id IS NOT NULL;

-- 2. Faith goals table (one active goal per year per user)
CREATE TABLE IF NOT EXISTS public.faith_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year INTEGER NOT NULL,
  target_cents BIGINT NOT NULL CHECK (target_cents >= 0),
  percent_of_income NUMERIC(5,2) NULL CHECK (percent_of_income IS NULL OR (percent_of_income > 0 AND percent_of_income <= 100)),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, year)
);

ALTER TABLE public.faith_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own faith goals" ON public.faith_goals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own faith goals" ON public.faith_goals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own faith goals" ON public.faith_goals
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own faith goals" ON public.faith_goals
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER faith_goals_set_updated_at
  BEFORE UPDATE ON public.faith_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();