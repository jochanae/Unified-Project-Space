
-- Vibe Points table — persistent across devices/sessions
CREATE TABLE public.vibe_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 100,
  last_login_date date,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.vibe_points ENABLE ROW LEVEL SECURITY;

-- Users can read their own points
CREATE POLICY "Users can view their own vibe points"
  ON public.vibe_points FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own row
CREATE POLICY "Users can insert their own vibe points"
  ON public.vibe_points FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own points
CREATE POLICY "Users can update their own vibe points"
  ON public.vibe_points FOR UPDATE
  USING (auth.uid() = user_id);

-- Security definer function for atomic point operations (avoids race conditions)
CREATE OR REPLACE FUNCTION public.add_vibe_points(
  p_user_id uuid,
  p_amount integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  INSERT INTO public.vibe_points (user_id, balance)
  VALUES (p_user_id, 100 + p_amount)
  ON CONFLICT (user_id)
  DO UPDATE SET balance = vibe_points.balance + p_amount, updated_at = now()
  RETURNING balance INTO v_new_balance;
  
  RETURN v_new_balance;
END;
$$;

-- Security definer function for spending points (prevents going below 0)
CREATE OR REPLACE FUNCTION public.spend_vibe_points(
  p_user_id uuid,
  p_amount integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  UPDATE public.vibe_points
  SET balance = GREATEST(balance - p_amount, 0), updated_at = now()
  WHERE user_id = p_user_id AND balance >= p_amount
  RETURNING balance INTO v_new_balance;
  
  IF v_new_balance IS NULL THEN
    RETURN -1; -- indicates insufficient funds
  END IF;
  
  RETURN v_new_balance;
END;
$$;

-- Daily login bonus function
CREATE OR REPLACE FUNCTION public.claim_daily_login_bonus(
  p_user_id uuid,
  p_bonus integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_login date;
  v_new_balance integer;
  v_today date := CURRENT_DATE;
BEGIN
  -- Upsert the row first
  INSERT INTO public.vibe_points (user_id, balance, last_login_date)
  VALUES (p_user_id, 100, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT last_login_date INTO v_last_login
  FROM public.vibe_points WHERE user_id = p_user_id;
  
  IF v_last_login IS NOT NULL AND v_last_login = v_today THEN
    SELECT balance INTO v_new_balance FROM public.vibe_points WHERE user_id = p_user_id;
    RETURN jsonb_build_object('awarded', false, 'balance', v_new_balance);
  END IF;
  
  UPDATE public.vibe_points
  SET balance = balance + p_bonus, last_login_date = v_today, updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;
  
  RETURN jsonb_build_object('awarded', true, 'balance', v_new_balance);
END;
$$;
