CREATE OR REPLACE FUNCTION public.mark_founding_reveal_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.beta_serial_numbers
  SET notified_at = COALESCE(notified_at, now())
  WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.mark_founding_snapshot_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.beta_serial_numbers
  SET snapshot_saved_at = COALESCE(snapshot_saved_at, now())
  WHERE user_id = auth.uid();
$$;