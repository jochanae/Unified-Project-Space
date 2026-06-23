
-- Fix search_path for auto_encrypt_gmail_tokens
ALTER FUNCTION public.auto_encrypt_gmail_tokens() SET search_path = public;

-- Fix search_path for auto_encrypt_plaid_token
ALTER FUNCTION public.auto_encrypt_plaid_token() SET search_path = public;

-- Fix search_path for get_plaid_token (takes uuid)
ALTER FUNCTION public.get_plaid_token(uuid) SET search_path = public;

-- Fix search_path for map_transaction_to_budget_category (takes text, text)
ALTER FUNCTION public.map_transaction_to_budget_category(text, text) SET search_path = public;

-- Fix search_path for store_plaid_token (takes uuid, text)
ALTER FUNCTION public.store_plaid_token(uuid, text) SET search_path = public;
