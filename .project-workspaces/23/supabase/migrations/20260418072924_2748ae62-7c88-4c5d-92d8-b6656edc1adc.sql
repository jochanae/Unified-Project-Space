-- IP-based rate limit tracking for landing audit
CREATE TABLE public.landing_audit_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_landing_audit_rate_limits_ip_hash_created
  ON public.landing_audit_rate_limits (ip_hash, created_at DESC);

ALTER TABLE public.landing_audit_rate_limits ENABLE ROW LEVEL SECURITY;

-- Anon can insert (recording an attempt) but cannot read others' attempts.
CREATE POLICY "Anyone can record audit attempts"
ON public.landing_audit_rate_limits
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Service role can read rate limits"
ON public.landing_audit_rate_limits
FOR SELECT
TO public
USING (auth.role() = 'service_role');

CREATE POLICY "Admins can read rate limits"
ON public.landing_audit_rate_limits
FOR SELECT
TO authenticated
USING (is_admin());

-- Landing page leads (separate from authenticated subscribers)
CREATE TABLE public.landing_signal_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  snippet TEXT NOT NULL DEFAULT '',
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash TEXT,
  user_agent TEXT,
  referrer TEXT,
  loops_synced BOOLEAN NOT NULL DEFAULT false,
  loops_synced_at TIMESTAMPTZ,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_landing_signal_leads_created_at
  ON public.landing_signal_leads (created_at DESC);

CREATE INDEX idx_landing_signal_leads_email
  ON public.landing_signal_leads (email);

ALTER TABLE public.landing_signal_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit landing leads"
ON public.landing_signal_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can view all landing leads"
ON public.landing_signal_leads
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update landing leads"
ON public.landing_signal_leads
FOR UPDATE
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Admins can delete landing leads"
ON public.landing_signal_leads
FOR DELETE
TO authenticated
USING (is_admin());

CREATE POLICY "Service role full access landing leads"
ON public.landing_signal_leads
FOR ALL
TO public
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');