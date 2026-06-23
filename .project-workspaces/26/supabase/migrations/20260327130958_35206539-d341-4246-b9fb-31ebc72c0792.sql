
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  granted_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can read all subscriptions
CREATE POLICY "Admins can read all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admins can insert subscriptions
CREATE POLICY "Admins can insert subscriptions"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

-- Admins can update subscriptions
CREATE POLICY "Admins can update subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- Admins can delete subscriptions
CREATE POLICY "Admins can delete subscriptions"
  ON public.subscriptions FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));
