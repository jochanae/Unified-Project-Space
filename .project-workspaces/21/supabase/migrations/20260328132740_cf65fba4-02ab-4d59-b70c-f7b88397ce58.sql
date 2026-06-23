
CREATE TABLE public.beta_serial_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  serial_number integer NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(serial_number)
);

ALTER TABLE public.beta_serial_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own serial" ON public.beta_serial_numbers
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_beta_serial(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_serial integer;
BEGIN
  -- Check if already claimed
  SELECT serial_number INTO v_serial FROM beta_serial_numbers WHERE user_id = p_user_id;
  IF v_serial IS NOT NULL THEN
    RETURN v_serial;
  END IF;
  
  -- Get next serial (max 100)
  SELECT COALESCE(MAX(serial_number), 0) + 1 INTO v_serial FROM beta_serial_numbers;
  IF v_serial > 100 THEN
    RETURN -1; -- sold out
  END IF;
  
  INSERT INTO beta_serial_numbers (user_id, serial_number)
  VALUES (p_user_id, v_serial);
  
  RETURN v_serial;
END;
$$;
