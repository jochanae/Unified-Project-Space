
ALTER TABLE public.users
  ADD COLUMN blocked_at timestamptz,
  ADD COLUMN blocked_reason text;
