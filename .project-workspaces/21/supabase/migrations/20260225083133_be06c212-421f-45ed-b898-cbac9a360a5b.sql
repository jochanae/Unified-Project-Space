
-- Rate limiting table: tracks per-user, per-endpoint request counts in sliding windows
CREATE TABLE public.rate_limits (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  endpoint text NOT NULL,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 1
);

-- Index for fast lookups
CREATE INDEX idx_rate_limits_user_endpoint ON public.rate_limits (user_id, endpoint, window_start);

-- Auto-cleanup old entries (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 hour';
END;
$$;

-- Rate check function: returns true if under limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_endpoint text,
  p_max_requests integer DEFAULT 60,
  p_window_minutes integer DEFAULT 1
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_window_start timestamp with time zone;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Count recent requests
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM public.rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  IF v_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO public.rate_limits (user_id, endpoint, window_start, request_count)
  VALUES (p_user_id, p_endpoint, date_trunc('minute', now()), 1)
  ON CONFLICT DO NOTHING;
  
  -- Try to increment if row exists for this minute
  UPDATE public.rate_limits
  SET request_count = request_count + 1
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start = date_trunc('minute', now());
  
  IF NOT FOUND THEN
    INSERT INTO public.rate_limits (user_id, endpoint, window_start, request_count)
    VALUES (p_user_id, p_endpoint, date_trunc('minute', now()), 1);
  END IF;
  
  RETURN true;
END;
$$;

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only the system (via security definer functions) touches this table
-- No direct user access needed

-- Client error logging table for admin dashboard
CREATE TABLE public.client_errors (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  error_message text NOT NULL,
  error_stack text,
  component_name text,
  url text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_errors_created ON public.client_errors (created_at DESC);
CREATE INDEX idx_client_errors_user ON public.client_errors (user_id);

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

-- Users can insert their own errors
CREATE POLICY "Users can log their own errors"
ON public.client_errors
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Admins can view all errors
CREATE POLICY "Admins can view all errors"
ON public.client_errors
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete errors
CREATE POLICY "Admins can delete errors"
ON public.client_errors
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add unique constraint for rate limit upserts
CREATE UNIQUE INDEX idx_rate_limits_unique ON public.rate_limits (user_id, endpoint, window_start);
