-- Create feature_usage table to track daily/monthly usage of limited features
CREATE TABLE public.feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_name text NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  usage_count integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, feature_name, usage_date)
);

-- Enable RLS
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY "Users can view their own usage"
ON public.feature_usage
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own usage (upsert handled in edge function)
CREATE POLICY "Users can insert their own usage"
ON public.feature_usage
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage
CREATE POLICY "Users can update their own usage"
ON public.feature_usage
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for fast lookups
CREATE INDEX idx_feature_usage_user_date ON public.feature_usage(user_id, feature_name, usage_date);

-- Create function to check and increment usage
CREATE OR REPLACE FUNCTION public.check_and_increment_usage(
  p_user_id uuid,
  p_feature_name text,
  p_daily_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count integer;
  v_can_use boolean;
BEGIN
  -- Get current usage for today
  SELECT usage_count INTO v_current_count
  FROM public.feature_usage
  WHERE user_id = p_user_id
    AND feature_name = p_feature_name
    AND usage_date = CURRENT_DATE;
  
  -- If no record, count is 0
  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;
  
  -- Check if under limit
  v_can_use := v_current_count < p_daily_limit;
  
  -- If can use, increment the counter
  IF v_can_use THEN
    INSERT INTO public.feature_usage (user_id, feature_name, usage_date, usage_count)
    VALUES (p_user_id, p_feature_name, CURRENT_DATE, 1)
    ON CONFLICT (user_id, feature_name, usage_date)
    DO UPDATE SET 
      usage_count = public.feature_usage.usage_count + 1,
      updated_at = now();
    
    v_current_count := v_current_count + 1;
  END IF;
  
  RETURN jsonb_build_object(
    'can_use', v_can_use,
    'current_count', v_current_count,
    'daily_limit', p_daily_limit,
    'remaining', GREATEST(0, p_daily_limit - v_current_count)
  );
END;
$$;

-- Create function to get current usage without incrementing
CREATE OR REPLACE FUNCTION public.get_feature_usage(
  p_user_id uuid,
  p_feature_name text,
  p_daily_limit integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_count integer;
BEGIN
  SELECT usage_count INTO v_current_count
  FROM public.feature_usage
  WHERE user_id = p_user_id
    AND feature_name = p_feature_name
    AND usage_date = CURRENT_DATE;
  
  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;
  
  RETURN jsonb_build_object(
    'current_count', v_current_count,
    'daily_limit', p_daily_limit,
    'remaining', GREATEST(0, p_daily_limit - v_current_count),
    'can_use', v_current_count < p_daily_limit
  );
END;
$$;