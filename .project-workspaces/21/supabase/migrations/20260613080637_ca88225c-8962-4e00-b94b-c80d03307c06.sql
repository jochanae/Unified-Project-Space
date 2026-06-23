
-- 1. blocked_emails table
CREATE TABLE public.blocked_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern text NOT NULL UNIQUE,
  reason text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_emails TO authenticated;
GRANT ALL ON public.blocked_emails TO service_role;

ALTER TABLE public.blocked_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage blocked emails"
  ON public.blocked_emails
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. login_events table
CREATE TABLE public.login_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  ip_address text,
  user_agent text,
  country text,
  event_type text NOT NULL DEFAULT 'signin',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX login_events_user_id_idx ON public.login_events(user_id, created_at DESC);
CREATE INDEX login_events_ip_idx ON public.login_events(ip_address, created_at DESC);

GRANT SELECT ON public.login_events TO authenticated;
GRANT ALL ON public.login_events TO service_role;

ALTER TABLE public.login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see their own login events"
  ON public.login_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. Helper: check if an email matches the blocklist (exact or @domain pattern)
CREATE OR REPLACE FUNCTION public.is_email_blocked(p_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_emails
    WHERE lower(pattern) = lower(p_email)
       OR (pattern LIKE '@%' AND lower(p_email) LIKE '%' || lower(pattern))
  );
$$;

-- 4. Update handle_new_user to enforce the blocklist
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_username text;
BEGIN
  -- Silent-fail block: reject signup if email is on the blocklist
  IF NEW.email IS NOT NULL AND public.is_email_blocked(NEW.email) THEN
    RAISE EXCEPTION 'Signup unavailable' USING ERRCODE = 'P0001';
  END IF;

  v_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1),
    'New User'
  );
  v_username := public.generate_username(v_name, NEW.id);
  INSERT INTO public.profiles (user_id, user_name, username)
  VALUES (NEW.id, v_name, v_username)
  ON CONFLICT (user_id) DO UPDATE SET
    username = COALESCE(profiles.username, EXCLUDED.username);
  RETURN NEW;
END;
$$;

-- 5. RPC for admin to add a blocklist entry (centralized & audited)
CREATE OR REPLACE FUNCTION public.admin_block_email(p_pattern text, p_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_clean text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  v_clean := lower(trim(p_pattern));
  IF v_clean = '' OR v_clean IS NULL THEN
    RAISE EXCEPTION 'Pattern required';
  END IF;

  INSERT INTO public.blocked_emails (pattern, reason, created_by)
  VALUES (v_clean, p_reason, auth.uid())
  ON CONFLICT (pattern) DO UPDATE SET reason = EXCLUDED.reason
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
