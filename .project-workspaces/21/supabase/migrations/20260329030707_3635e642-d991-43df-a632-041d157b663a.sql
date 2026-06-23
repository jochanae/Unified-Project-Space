
-- 1. founding_notifications table
CREATE TABLE public.founding_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'anniversary',
  serial_number integer NOT NULL,
  message text NOT NULL,
  seen_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founding_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own founding notifications"
  ON public.founding_notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own founding notifications"
  ON public.founding_notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role inserts via edge function, no INSERT policy needed for users

-- 2. snapshot_saved_at column on beta_serial_numbers
ALTER TABLE public.beta_serial_numbers
  ADD COLUMN IF NOT EXISTS snapshot_saved_at timestamptz NULL;

-- 3. get_founding_percentile function
CREATE OR REPLACE FUNCTION public.get_founding_percentile(p_serial integer)
  RETURNS integer
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
DECLARE
  v_total integer;
BEGIN
  SELECT count(*) INTO v_total FROM beta_serial_numbers;
  IF v_total < 20 THEN
    RETURN NULL;
  END IF;
  RETURN ROUND((p_serial::numeric / v_total) * 100);
END;
$$;

-- 4. is_genesis_member function
CREATE OR REPLACE FUNCTION public.is_genesis_member(p_user_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM beta_serial_numbers
    WHERE user_id = p_user_id AND serial_number <= 100
  )
$$;

-- 5. get_joined_after_count function
CREATE OR REPLACE FUNCTION public.get_joined_after_count(p_serial integer)
  RETURNS integer
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
  SELECT count(*)::integer FROM beta_serial_numbers WHERE serial_number > p_serial
$$;
