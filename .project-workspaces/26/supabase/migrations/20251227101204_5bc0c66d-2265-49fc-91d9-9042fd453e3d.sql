-- ============================================
-- 1. Create rate limiting table for persistent rate limits
-- ============================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  count integer NOT NULL DEFAULT 1,
  window_start timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create unique index on key for efficient lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);

-- Create index for cleanup of old records
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON public.rate_limits(window_start);

-- Enable RLS but allow service role to bypass
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limits (used by edge functions)
CREATE POLICY "Service role can manage rate limits" ON public.rate_limits
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. Replace vault functions with authorization checks
-- ============================================

-- Drop and recreate store_plaid_token with user_id validation
DROP FUNCTION IF EXISTS public.store_plaid_token(uuid, text);

CREATE OR REPLACE FUNCTION public.store_plaid_token(p_plaid_item_id uuid, p_access_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'vault'
AS $$
DECLARE
  v_secret_id uuid;
  v_item_user_id uuid;
BEGIN
  -- SECURITY: Verify the plaid item belongs to the calling user or service role
  SELECT user_id INTO v_item_user_id
  FROM public.plaid_items
  WHERE id = p_plaid_item_id;
  
  IF v_item_user_id IS NULL THEN
    RAISE EXCEPTION 'Plaid item not found';
  END IF;
  
  -- Check ownership: only the item owner or service_role can store tokens
  IF v_item_user_id != auth.uid() AND current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this Plaid item';
  END IF;
  
  -- Insert the secret into vault
  INSERT INTO vault.secrets (name, secret, description)
  VALUES (
    'plaid_access_token_' || p_plaid_item_id::text,
    p_access_token,
    'Plaid access token for item ' || p_plaid_item_id::text
  )
  RETURNING id INTO v_secret_id;
  
  -- Update the plaid_items table with the vault reference
  UPDATE public.plaid_items 
  SET vault_secret_id = v_secret_id,
      plaid_access_token = 'ENCRYPTED_IN_VAULT'
  WHERE id = p_plaid_item_id;
  
  RETURN v_secret_id;
END;
$$;

-- Drop and recreate get_plaid_token with enhanced authorization
DROP FUNCTION IF EXISTS public.get_plaid_token(uuid);

CREATE OR REPLACE FUNCTION public.get_plaid_token(p_plaid_item_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'vault'
AS $$
DECLARE
  v_token text;
  v_secret_id uuid;
  v_item_user_id uuid;
BEGIN
  -- Get the vault secret ID and user_id from plaid_items
  SELECT vault_secret_id, user_id INTO v_secret_id, v_item_user_id
  FROM public.plaid_items
  WHERE id = p_plaid_item_id;
  
  IF v_item_user_id IS NULL THEN
    RAISE EXCEPTION 'Plaid item not found';
  END IF;
  
  -- SECURITY: Verify ownership - only the item owner or service_role can retrieve tokens
  IF v_item_user_id != auth.uid() AND current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: You do not own this Plaid item';
  END IF;
  
  IF v_secret_id IS NULL THEN
    -- Fallback to legacy plaintext token (for migration period)
    SELECT plaid_access_token INTO v_token
    FROM public.plaid_items
    WHERE id = p_plaid_item_id;
    
    RETURN v_token;
  END IF;
  
  -- Get decrypted secret from vault
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE id = v_secret_id;
  
  RETURN v_token;
END;
$$;

-- Drop and recreate migrate function with admin-only restriction  
DROP FUNCTION IF EXISTS public.migrate_plaid_tokens_to_vault();

CREATE OR REPLACE FUNCTION public.migrate_plaid_tokens_to_vault()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  item_record RECORD;
  new_secret_id uuid;
BEGIN
  -- SECURITY: This function should ONLY be callable by service_role (cron jobs, admin)
  IF current_setting('role', true) != 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: This function requires service_role privileges';
  END IF;

  -- Loop through all plaid items that have a raw token but no vault secret
  FOR item_record IN 
    SELECT id, plaid_access_token 
    FROM public.plaid_items 
    WHERE plaid_access_token IS NOT NULL 
      AND plaid_access_token != 'ENCRYPTED_IN_VAULT'
      AND vault_secret_id IS NULL
  LOOP
    -- Insert the token into vault
    INSERT INTO vault.secrets (secret, name, description)
    VALUES (
      item_record.plaid_access_token,
      'plaid_access_token_' || item_record.id::text,
      'Plaid access token for item ' || item_record.id::text
    )
    RETURNING id INTO new_secret_id;
    
    -- Update the plaid_items record to reference the vault secret
    -- and clear the raw token
    UPDATE public.plaid_items
    SET 
      vault_secret_id = new_secret_id,
      plaid_access_token = 'ENCRYPTED_IN_VAULT'
    WHERE id = item_record.id;
  END LOOP;
END;
$$;

-- ============================================
-- 3. Create helper functions for rate limiting
-- ============================================

-- Function to check and increment rate limit (used by edge functions)
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_record record;
  v_is_limited boolean := false;
  v_count integer := 0;
  v_window_start timestamp with time zone;
BEGIN
  -- Calculate window start time
  v_window_start := now() - (p_window_minutes || ' minutes')::interval;
  
  -- Try to get existing record
  SELECT * INTO v_record
  FROM public.rate_limits
  WHERE key = p_key;
  
  IF v_record IS NULL THEN
    -- First attempt, create new record
    INSERT INTO public.rate_limits (key, count, window_start)
    VALUES (p_key, 1, now())
    ON CONFLICT (key) DO UPDATE
    SET count = 1, window_start = now();
    v_count := 1;
  ELSIF v_record.window_start < v_window_start THEN
    -- Window expired, reset counter
    UPDATE public.rate_limits
    SET count = 1, window_start = now()
    WHERE key = p_key;
    v_count := 1;
  ELSE
    -- Within window, increment counter
    UPDATE public.rate_limits
    SET count = count + 1
    WHERE key = p_key
    RETURNING count INTO v_count;
    
    v_is_limited := v_count > p_max_attempts;
  END IF;
  
  RETURN jsonb_build_object(
    'is_limited', v_is_limited,
    'count', v_count,
    'max_attempts', p_max_attempts,
    'remaining', GREATEST(0, p_max_attempts - v_count)
  );
END;
$$;

-- Function to reset rate limit (on successful auth)
CREATE OR REPLACE FUNCTION public.reset_rate_limit(p_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE key = p_key;
END;
$$;

-- Function to clean up old rate limit records (call periodically)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits(p_older_than_minutes integer DEFAULT 60)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - (p_older_than_minutes || ' minutes')::interval;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;