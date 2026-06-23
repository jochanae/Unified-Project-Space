
-- Incoming calls from companion -> user (in-app ring)
CREATE TABLE public.incoming_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  member_id TEXT NOT NULL,
  companion_name TEXT NOT NULL,
  companion_avatar_url TEXT,
  opener_line TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'ringing',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '45 seconds'),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.incoming_calls TO authenticated;
GRANT ALL ON public.incoming_calls TO service_role;

ALTER TABLE public.incoming_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own incoming calls"
  ON public.incoming_calls FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own incoming calls"
  ON public.incoming_calls FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_incoming_calls_user_status ON public.incoming_calls(user_id, status, created_at DESC);

CREATE TRIGGER incoming_calls_updated_at
  BEFORE UPDATE ON public.incoming_calls
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.incoming_calls;
ALTER TABLE public.incoming_calls REPLICA IDENTITY FULL;

-- Trigger an incoming call (callable from edge functions / Marcus tools)
CREATE OR REPLACE FUNCTION public.request_incoming_call(
  p_user_id UUID,
  p_member_id TEXT,
  p_companion_name TEXT,
  p_companion_avatar_url TEXT DEFAULT NULL,
  p_opener_line TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Throttle: max 1 active ring per user at a time
  UPDATE public.incoming_calls
  SET status = 'cancelled', ended_at = now()
  WHERE user_id = p_user_id AND status = 'ringing';

  INSERT INTO public.incoming_calls (
    user_id, member_id, companion_name, companion_avatar_url, opener_line, reason
  ) VALUES (
    p_user_id, p_member_id, p_companion_name, p_companion_avatar_url, p_opener_line, p_reason
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_incoming_call(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
