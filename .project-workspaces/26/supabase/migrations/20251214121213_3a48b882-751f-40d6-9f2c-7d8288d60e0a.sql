-- The previous migrations already removed pin_hash and email columns
-- This migration just adds security comments for documentation

-- Add security comment for plaid access tokens
COMMENT ON COLUMN public.plaid_items.plaid_access_token IS 
  'SECURITY: In production, encrypt using Supabase Vault or external secrets management';

-- Add security comment for card_interest rate limiting
COMMENT ON TABLE public.card_interest IS 
  'SECURITY: Implement rate limiting at application level to prevent spam submissions';