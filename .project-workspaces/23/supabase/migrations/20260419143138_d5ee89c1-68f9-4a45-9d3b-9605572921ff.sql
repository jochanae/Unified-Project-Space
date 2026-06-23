-- Payment Accounts: per-org encrypted Stripe (or future provider) credentials
CREATE EXTENSION IF NOT EXISTS pgsodium;

CREATE TABLE public.payment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'stripe',
  encrypted_secret_key TEXT NOT NULL,
  publishable_key TEXT,
  account_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_verified_at TIMESTAMPTZ,
  verification_status TEXT NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE (org_id, provider)
);

CREATE INDEX idx_payment_accounts_org ON public.payment_accounts(org_id);

ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

-- Org members can see metadata (NOT the encrypted key — edge functions use service role)
CREATE POLICY "Org members view their payment accounts metadata"
  ON public.payment_accounts FOR SELECT
  TO authenticated
  USING (org_id = get_user_org_id());

-- Only service role can insert/update/delete (forces edge function path so we control encryption)
CREATE POLICY "Service role manages payment accounts"
  ON public.payment_accounts FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_payment_accounts_updated_at
  BEFORE UPDATE ON public.payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Page Products: cached Stripe price_ids per page checkout block
-- Block stores a stable client-generated block_id; we cache the resulting Stripe IDs here
CREATE TABLE public.page_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  block_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'stripe',
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  mode TEXT NOT NULL DEFAULT 'payment', -- 'payment' or 'subscription'
  recurring_interval TEXT, -- 'month' | 'year' when mode='subscription'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_id, block_id)
);

CREATE INDEX idx_page_products_org ON public.page_products(org_id);
CREATE INDEX idx_page_products_page ON public.page_products(page_id);

ALTER TABLE public.page_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage their page products"
  ON public.page_products FOR ALL
  TO authenticated
  USING (org_id = get_user_org_id())
  WITH CHECK (org_id = get_user_org_id());

-- Public read for the checkout edge function (anon needs to look up product details)
CREATE POLICY "Anon can read page products for checkout"
  ON public.page_products FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Service role manages page products"
  ON public.page_products FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_page_products_updated_at
  BEFORE UPDATE ON public.page_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Checkout Sessions log (for analytics + revenue attribution back to page/funnel)
CREATE TABLE public.checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  page_id UUID REFERENCES public.pages(id) ON DELETE SET NULL,
  page_product_id UUID REFERENCES public.page_products(id) ON DELETE SET NULL,
  stripe_session_id TEXT NOT NULL,
  amount_cents INTEGER,
  currency TEXT,
  customer_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stripe_session_id)
);

CREATE INDEX idx_checkout_sessions_org ON public.checkout_sessions(org_id);
CREATE INDEX idx_checkout_sessions_page ON public.checkout_sessions(page_id);

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view their checkout sessions"
  ON public.checkout_sessions FOR SELECT
  TO authenticated
  USING (org_id = get_user_org_id());

CREATE POLICY "Service role manages checkout sessions"
  ON public.checkout_sessions FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');