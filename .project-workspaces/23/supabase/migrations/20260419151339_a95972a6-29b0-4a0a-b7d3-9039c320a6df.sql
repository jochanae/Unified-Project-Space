-- Add webhook secret to payment accounts
ALTER TABLE public.payment_accounts
  ADD COLUMN IF NOT EXISTS webhook_secret_encrypted TEXT;

-- Coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','amount')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  currency TEXT DEFAULT 'usd',
  max_redemptions INTEGER,
  redeemed_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, code)
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage their coupons"
ON public.coupons FOR ALL TO authenticated
USING (org_id = get_user_org_id())
WITH CHECK (org_id = get_user_org_id());

CREATE POLICY "Anon can read active coupons for checkout"
ON public.coupons FOR SELECT TO anon
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Service role manages coupons"
ON public.coupons FOR ALL TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link coupon to checkout session
ALTER TABLE public.checkout_sessions
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS discount_amount_cents INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_coupons_org_code ON public.coupons(org_id, code);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_org ON public.checkout_sessions(org_id, created_at DESC);