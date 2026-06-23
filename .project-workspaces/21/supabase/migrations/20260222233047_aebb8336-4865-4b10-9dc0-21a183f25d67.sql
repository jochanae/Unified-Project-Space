
-- Virtual gifts catalog (admin-managed, public read)
CREATE TABLE public.virtual_gifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'clothing',
  image_url TEXT,
  stripe_price_id TEXT NOT NULL,
  stripe_product_id TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 299,
  prompt_modifier TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.virtual_gifts ENABLE ROW LEVEL SECURITY;

-- Anyone can browse the gift catalog
CREATE POLICY "Anyone can view active gifts"
  ON public.virtual_gifts FOR SELECT
  USING (is_active = true);

-- User gift purchases
CREATE TABLE public.user_gift_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gift_id UUID NOT NULL REFERENCES public.virtual_gifts(id),
  member_id TEXT NOT NULL,
  stripe_session_id TEXT,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_gift_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
  ON public.user_gift_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own purchases"
  ON public.user_gift_purchases FOR INSERT
  WITH CHECK (auth.uid() = user_id);
