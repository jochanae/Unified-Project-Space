
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  checkout_session_id UUID,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  customer_email TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  refunded_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'paid',
  product_name TEXT,
  page_id UUID,
  page_product_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_org_created ON public.orders(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_session ON public.orders(stripe_session_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view their orders" ON public.orders
  FOR SELECT TO authenticated USING (org_id = get_user_org_id());

CREATE POLICY "Service role manages orders" ON public.orders
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.order_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  reason TEXT,
  stripe_refund_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  requested_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_refunds_order ON public.order_refunds(order_id);

ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members view their refunds" ON public.order_refunds
  FOR SELECT TO authenticated USING (org_id = get_user_org_id());

CREATE POLICY "Org members request refunds" ON public.order_refunds
  FOR INSERT TO authenticated WITH CHECK (org_id = get_user_org_id() AND requested_by = auth.uid());

CREATE POLICY "Service role manages refunds" ON public.order_refunds
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER order_refunds_updated_at BEFORE UPDATE ON public.order_refunds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger: when a checkout_session is marked completed, insert/update order row
CREATE OR REPLACE FUNCTION public.upsert_order_from_checkout()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _name TEXT;
BEGIN
  IF NEW.status <> 'completed' THEN RETURN NEW; END IF;
  IF OLD.status = 'completed' THEN RETURN NEW; END IF;

  SELECT name INTO _name FROM public.page_products WHERE id = NEW.page_product_id;

  INSERT INTO public.orders (
    org_id, checkout_session_id, stripe_session_id, customer_email,
    amount_cents, currency, status, product_name, page_id, page_product_id
  ) VALUES (
    NEW.org_id, NEW.id, NEW.stripe_session_id, NEW.customer_email,
    COALESCE(NEW.amount_cents, 0), COALESCE(NEW.currency, 'usd'),
    'paid', _name, NEW.page_id, NEW.page_product_id
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_upsert_order_from_checkout ON public.checkout_sessions;
CREATE TRIGGER trg_upsert_order_from_checkout
  AFTER UPDATE ON public.checkout_sessions
  FOR EACH ROW EXECUTE FUNCTION public.upsert_order_from_checkout();
