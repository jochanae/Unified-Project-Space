-- Stewardship Directory: user-managed payment destinations
CREATE TABLE public.user_payment_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'custom',
  label TEXT NOT NULL,
  handle TEXT,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_payment_links_kind_check CHECK (kind IN ('cashapp','venmo','paypal','zelle','custom')),
  CONSTRAINT user_payment_links_label_len CHECK (char_length(label) BETWEEN 1 AND 60),
  CONSTRAINT user_payment_links_url_len CHECK (char_length(url) BETWEEN 1 AND 500),
  CONSTRAINT user_payment_links_url_scheme CHECK (url ~* '^(https?://|mailto:|venmo://|cashapp://)')
);

CREATE INDEX idx_user_payment_links_user ON public.user_payment_links(user_id, position);

ALTER TABLE public.user_payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment links"
  ON public.user_payment_links FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own payment links"
  ON public.user_payment_links FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own payment links"
  ON public.user_payment_links FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own payment links"
  ON public.user_payment_links FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enforce max 5 destinations per user
CREATE OR REPLACE FUNCTION public.enforce_payment_links_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.user_payment_links WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum of 5 stewardship destinations allowed';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_payment_links_limit
  BEFORE INSERT ON public.user_payment_links
  FOR EACH ROW EXECUTE FUNCTION public.enforce_payment_links_limit();

CREATE TRIGGER user_payment_links_updated_at
  BEFORE UPDATE ON public.user_payment_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();