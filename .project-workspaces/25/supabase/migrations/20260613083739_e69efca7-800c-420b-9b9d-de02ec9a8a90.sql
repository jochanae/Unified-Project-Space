
-- Banned users registry
CREATE TABLE public.banned_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_at timestamptz NOT NULL DEFAULT now(),
  banned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text
);

GRANT ALL ON public.banned_users TO service_role;
ALTER TABLE public.banned_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view bans"
  ON public.banned_users FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- AI call log (for sliding-window rate limiting)
CREATE TABLE public.ai_call_log (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  function_name text NOT NULL,
  called_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ai_call_log_user_time_idx
  ON public.ai_call_log (user_id, called_at DESC);

GRANT ALL ON public.ai_call_log TO service_role;
ALTER TABLE public.ai_call_log ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated/anon: only service_role (edge functions) touch this table.

-- Helper to check ban + rate limit and log the call atomically
CREATE OR REPLACE FUNCTION public.check_ai_access(_user_id uuid, _function text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _banned boolean;
  _is_premium boolean;
  _limit int;
  _count int;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'unauthenticated');
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.banned_users WHERE user_id = _user_id)
    INTO _banned;
  IF _banned THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'banned');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('minister', 'church_partner', 'admin')
  ) INTO _is_premium;

  _limit := CASE WHEN _is_premium THEN 300 ELSE 60 END;

  SELECT count(*) INTO _count
  FROM public.ai_call_log
  WHERE user_id = _user_id
    AND called_at > now() - interval '1 hour';

  IF _count >= _limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'rate_limit',
      'limit', _limit,
      'count', _count
    );
  END IF;

  INSERT INTO public.ai_call_log(user_id, function_name)
  VALUES (_user_id, _function);

  -- Opportunistic cleanup of rows older than 2 hours.
  IF random() < 0.02 THEN
    DELETE FROM public.ai_call_log
    WHERE called_at < now() - interval '2 hours';
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'limit', _limit,
    'count', _count + 1
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_ai_access(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_ai_access(uuid, text) TO service_role;
